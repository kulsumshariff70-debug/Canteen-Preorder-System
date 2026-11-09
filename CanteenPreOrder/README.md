# Campus Canteen Hub — RV University

A full-stack canteen pre-order management engine integrating a high-performance C++ backend with a real-time web portal for students, faculty, and kitchen operators.

---

## 📌 Project Overview

This project streamlines campus dining operations by eliminating counter congestion through automated pre-ordering and real-time order queue management.

### Key Features
- **Student Portal**: Self-service menu exploration, cart calculations, client-side input validation, and live token status tracking.
- **Faculty Express Portal 🎖️**: Streamlined priority workflow requiring faculty name and department, generating high-priority tokens for rapid counter pickup.
- **Staff Queue Console (KOD)**: Kitchen Order Display enabling kitchen operators to transition orders through execution states: `Pending` ➔ `Preparing` ➔ `Ready` ➔ `Completed`.
- **Real-Time Synchronization**: 1.5-second polling interval ensures immediate order state updates across portals with automated session reset upon fulfillment.

---

## 🛠️ Architecture & Tech Stack

- **Backend**: C++17 REST API built using `httplib.h`
- **Networking**: Winsock2 library (`-lws2_32`)
- **Persistence**: Flat-file transaction logging (`menu.txt` and `orders.txt`) via `<fstream>`
- **Frontend**: Responsive HTML5, CSS3, and JavaScript (ES6+) with `localStorage` state persistence

---

## 💻 Object-Oriented Programming (OOP) Implementation

- **Encapsulation**: Domain models (`FoodItem`, `Order`) maintain private data members with public accessor and mutator methods.
- **Inheritance & Abstraction**: An abstract base class `User` is extended by concrete derived classes (`Student` and `CanteenStaff`).
- **Polymorphism**: Dynamic dispatch implemented through pure virtual functions (`getRoleDescription()`).
- **Aggregation**: The `Order` entity aggregates multiple `OrderItem` structures dynamically.

---

## 🚀 How to Run Locally

### Prerequisites
- GCC / MinGW C++ Compiler (supporting C++17)
- Modern Web Browser (Edge / Chrome)
- Live Server extension in VS Code (recommended)

### 1. Start the C++ Backend Server
Navigate to the `backend` folder in your terminal:
```powershell
cd backend
g++ -std=c++17 main.cpp -o server.exe -lws2_32
.\server.exe
