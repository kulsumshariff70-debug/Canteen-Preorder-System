#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <mutex>
#include <ctime>
#include "httplib.h"
#include "models.h"

// In-Memory Data Storage (STL Vectors)
std::vector<FoodItem> g_menu;
std::vector<Order> g_orders;
std::mutex g_dataMutex;
int g_tokenCounter = 100;

// Helper: Get current system timestamp string
std::string getCurrentTimestamp() {
    std::time_t now = std::time(nullptr);
    char buf[64];
    std::strftime(buf, sizeof(buf), "%I:%M %p", std::localtime(&now));
    return std::string(buf);
}

// 1. File Handling: Load menu from menu.txt using fstream
void loadMenuFromFile(const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        std::cerr << "Warning: Could not open " << filename << ". Starting with empty menu.\n";
        return;
    }

    g_menu.clear();
    std::string line;
    while (std::getline(file, line)) {
        if (line.empty() || line[0] == '#') continue;

        std::stringstream ss(line);
        std::string idStr, name, priceStr, category, availStr;

        if (std::getline(ss, idStr, ',') &&
            std::getline(ss, name, ',') &&
            std::getline(ss, priceStr, ',') &&
            std::getline(ss, category, ',') &&
            std::getline(ss, availStr, ',')) {

            int id = std::stoi(idStr);
            double price = std::stod(priceStr);
            bool avail = (availStr == "1");

            g_menu.emplace_back(id, name, price, category, avail);
        }
    }
    file.close();
    std::cout << "[System]: Successfully loaded " << g_menu.size() << " menu items.\n";
}

// 2. File Handling: Append completed/placed orders to orders.txt
void persistOrderToFile(const Order& order) {
    std::ofstream file("orders.txt", std::ios::app);
    if (file.is_open()) {
        file << "TOKEN:" << order.getToken()
             << "|ID:" << order.getOrderId()
             << "|STUDENT:" << order.getStudentName()
             << "|TOTAL:" << order.getTotal()
             << "|STATUS:" << order.getStatus()
             << "|TIME:" << order.getOrderTime() << "\n";
        file.close();
    }
}

// Helper: Very simple JSON string value extractor
std::string extractJsonString(const std::string& body, const std::string& key) {
    std::string searchKey = "\"" + key + "\":\"";
    size_t start = body.find(searchKey);
    if (start == std::string::npos) return "";
    start += searchKey.length();
    size_t end = body.find("\"", start);
    if (end == std::string::npos) return "";
    return body.substr(start, end - start);
}

int main() {
    // 1. Load initial dataset
    loadMenuFromFile("menu.txt");

    // 2. Setup HTTP Server
    httplib::Server svr;

    // CORS headers for seamless frontend connection
    auto setCors = [](httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
    };

    // Route: OPTIONS pre-flight
    svr.Options(".*", [setCors](const httplib::Request&, httplib::Response& res) {
        setCors(res);
        res.status = 200;
    });

    // Route 1: GET /api/menu -> Returns all items in JSON
    svr.Get("/api/menu", [setCors](const httplib::Request&, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(g_dataMutex);
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < g_menu.size(); ++i) {
            ss << g_menu[i].toJson();
            if (i + 1 < g_menu.size()) ss << ",";
        }
        ss << "]";

        setCors(res);
        res.set_content(ss.str(), "application/json");
    });

    // Route 2: GET /api/orders -> Returns active queue for Staff Console
    svr.Get("/api/orders", [setCors](const httplib::Request&, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(g_dataMutex);
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < g_orders.size(); ++i) {
            ss << g_orders[i].toJson();
            if (i + 1 < g_orders.size()) ss << ",";
        }
        ss << "]";

        setCors(res);
        res.set_content(ss.str(), "application/json");
    });

    // Route 3: POST /api/order -> Place a new order and generate token
    svr.Post("/api/order", [setCors](const httplib::Request& req, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(g_dataMutex);

        std::string name = extractJsonString(req.body, "studentName");
        std::string phone = extractJsonString(req.body, "studentPhone");
        if (name.empty()) name = "Student Guest";
        if (phone.empty()) phone = "9876543210";

        g_tokenCounter++;
        std::string tokenStr = "#C-" + std::to_string(g_tokenCounter);
        std::string orderIdStr = "ORD-" + std::to_string(1000 + g_orders.size() + 1);

        Order newOrder(orderIdStr, tokenStr, name, phone, getCurrentTimestamp());

        // Parse items from payload: looks for "id":X and "qty":Y
        size_t pos = 0;
        while ((pos = req.body.find("\"id\":", pos)) != std::string::npos) {
            pos += 5;
            int itemId = std::stoi(req.body.substr(pos));

            size_t qtyPos = req.body.find("\"qty\":", pos);
            int qty = 1;
            if (qtyPos != std::string::npos && qtyPos < req.body.find("}", pos)) {
                qty = std::stoi(req.body.substr(qtyPos + 6));
            }

            // Find matching item in menu
            for (const auto& item : g_menu) {
                if (item.getId() == itemId) {
                    newOrder.addItem(item, qty);
                    break;
                }
            }
        }

        g_orders.push_back(newOrder);
        persistOrderToFile(newOrder);

        setCors(res);
        res.set_content(newOrder.toJson(), "application/json");
        std::cout << "[Order Placed]: Token " << tokenStr << " for " << name
                  << " | Total: Rs." << newOrder.getTotal() << "\n";
    });

    // Route 4: POST /api/update-status -> Canteen Staff advances order status
    svr.Post("/api/update-status", [setCors](const httplib::Request& req, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(g_dataMutex);

        std::string token = extractJsonString(req.body, "token");
        std::string newStatus = extractJsonString(req.body, "status");

        bool found = false;
        for (auto& ord : g_orders) {
            if (ord.getToken() == token) {
                ord.updateStatus(newStatus);
                found = true;
                std::cout << "[Status Update]: " << token << " -> " << newStatus << "\n";
                break;
            }
        }

        setCors(res);
        if (found) {
            res.set_content("{\"success\":true}", "application/json");
        } else {
            res.status = 404;
            res.set_content("{\"success\":false,\"message\":\"Token not found\"}", "application/json");
        }
    });

    std::cout << "====================================================\n";
    std::cout << "  RV UNIVERSITY - CANTEEN PRE-ORDER SYSTEM BACKEND   \n";
    std::cout << "  Server running at: http://localhost:8080           \n";
    std::cout << "====================================================\n";

    svr.listen("0.0.0.0", 8080);
    return 0;
}