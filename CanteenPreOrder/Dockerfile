FROM gcc:latest

# Install git and tools
RUN apt-get update && apt-get install -y make

WORKDIR /app
COPY . .

# Compile C++ backend
WORKDIR /app/CanteenPreOrder/backend
RUN g++ -std=c++17 main.cpp -lpthread -o server

EXPOSE 8080

CMD ["./server"]
