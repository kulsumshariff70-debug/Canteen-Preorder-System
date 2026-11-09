#ifndef MODELS_H
#define MODELS_H

#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <iomanip>

// 1. FoodItem Class (Encapsulation)
class FoodItem {
private:
    int itemId;
    std::string name;
    double price;
    std::string category;
    bool isAvailable;

public:
    FoodItem() : itemId(0), name(""), price(0.0), category(""), isAvailable(true) {}

    FoodItem(int id, std::string n, double p, std::string cat, bool avail = true)
        : itemId(id), name(n), price(p), category(cat), isAvailable(avail) {}

    // Getters (Encapsulation accessors)
    int getId() const { return itemId; }
    std::string getName() const { return name; }
    double getPrice() const { return price; }
    std::string getCategory() const { return category; }
    bool checkStock() const { return isAvailable; }

    // Setters
    void setPrice(double p) { price = p; }
    void setAvailability(bool avail) { isAvailable = avail; }

    // Convert to JSON string for API responses
    std::string toJson() const {
        std::ostringstream ss;
        ss << "{"
           << "\"id\":" << itemId << ","
           << "\"name\":\"" << name << "\","
           << "\"price\":" << std::fixed << std::setprecision(2) << price << ","
           << "\"category\":\"" << category << "\","
           << "\"available\":" << (isAvailable ? "true" : "false")
           << "}";
        return ss.str();
    }
};

// 2. User Base Class (Abstraction & Base for Inheritance)
class User {
protected:
    int userId;
    std::string name;
    std::string phone;
    std::string role;

public:
    User(int id, std::string n, std::string p, std::string r)
        : userId(id), name(n), phone(p), role(r) {}

    virtual ~User() {}

    // Pure virtual function demonstrating Polymorphism & Abstraction
    virtual void displayMenu() = 0;

    std::string getDetails() const {
        return "User ID: " + std::to_string(userId) + " | Name: " + name + " | Role: " + role;
    }

    std::string getRole() const { return role; }
    std::string getName() const { return name; }
};

// 3. Student Derived Class (Inheritance & Polymorphic Override)
class Student : public User {
private:
    std::string studentId;

public:
    Student(int uId, std::string n, std::string p, std::string sId)
        : User(uId, n, p, "Student"), studentId(sId) {}

    void displayMenu() override {
        std::cout << "[Student View]: Showing active menu items with student pricing.\n";
    }

    std::string getStudentId() const { return studentId; }
};

// 4. CanteenStaff Derived Class (Inheritance & Polymorphic Override)
class CanteenStaff : public User {
private:
    std::string staffId;
    std::string shiftTiming;

public:
    CanteenStaff(int uId, std::string n, std::string p, std::string sId, std::string shift)
        : User(uId, n, p, "Staff"), staffId(sId), shiftTiming(shift) {}

    void displayMenu() override {
        std::cout << "[Staff View]: Showing complete inventory, price overrides, and stock controls.\n";
    }

    std::string getStaffId() const { return staffId; }
    std::string getShift() const { return shiftTiming; }
};

// Cart Item helper (Item + Quantity)
struct CartEntry {
    FoodItem item;
    int quantity;
};

// 5. Order Transaction Class (Encapsulation, Aggregation & Abstraction)
class Order {
private:
    std::string orderId;
    std::string tokenNumber;
    std::string studentName;
    std::string studentPhone;
    std::vector<CartEntry> items; // Aggregation using STL vector
    double totalAmount;
    std::string status;          // "Pending", "Preparing", "Ready", "Completed"
    std::string orderTime;

public:
    Order() : totalAmount(0.0), status("Pending") {}

    Order(std::string ordId, std::string token, std::string sName, std::string sPhone, std::string timeStr)
        : orderId(ordId), tokenNumber(token), studentName(sName), studentPhone(sPhone),
          totalAmount(0.0), status("Pending"), orderTime(timeStr) {}

    void addItem(const FoodItem& item, int qty) {
        items.push_back({item, qty});
        calculateTotal();
    }

    // Abstraction: hides arithmetic logic
    double calculateTotal() {
        totalAmount = 0.0;
        for (const auto& entry : items) {
            totalAmount += (entry.item.getPrice() * entry.quantity);
        }
        return totalAmount;
    }

    // Status management
    void updateStatus(const std::string& newStatus) {
        status = newStatus;
    }

    // Getters
    std::string getOrderId() const { return orderId; }
    std::string getToken() const { return tokenNumber; }
    std::string getStatus() const { return status; }
    double getTotal() const { return totalAmount; }
    std::string getStudentName() const { return studentName; }
    std::string getOrderTime() const { return orderTime; }
    const std::vector<CartEntry>& getItems() const { return items; }

    // Convert Order to JSON representation for the web frontend
    std::string toJson() const {
        std::ostringstream ss;
        ss << "{"
           << "\"orderId\":\"" << orderId << "\","
           << "\"token\":\"" << tokenNumber << "\","
           << "\"studentName\":\"" << studentName << "\","
           << "\"studentPhone\":\"" << studentPhone << "\","
           << "\"total\":" << std::fixed << std::setprecision(2) << totalAmount << ","
           << "\"status\":\"" << status << "\","
           << "\"time\":\"" << orderTime << "\","
           << "\"items\":[";

        for (size_t i = 0; i < items.size(); ++i) {
            ss << "{"
               << "\"name\":\"" << items[i].item.getName() << "\","
               << "\"price\":" << std::fixed << std::setprecision(2) << items[i].item.getPrice() << ","
               << "\"qty\":" << items[i].quantity << ","
               << "\"subtotal\":" << (items[i].item.getPrice() * items[i].quantity)
               << "}";
            if (i + 1 < items.size()) ss << ",";
        }
        ss << "]}";
        return ss.str();
    }
};

#endif