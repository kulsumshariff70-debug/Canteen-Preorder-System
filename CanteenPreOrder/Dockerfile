FROM gcc:latest

WORKDIR /app
COPY . .

# Compile C++ backend directly from the local backend folder
WORKDIR /app/backend
RUN g++ -std=c++17 main.cpp -lpthread -o server

EXPOSE 8080

CMD ["./server"]
