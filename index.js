import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import route from "./src/routes/index.js";

const PORT = 8080;
dotenv.config();

mongoose
  .connect(process.env.MONGODB_CONNECTION_STRING)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Tạo HTTP server từ Express
const server = createServer(app);

// Tạo WebSocket server từ HTTP server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Thay bằng URL frontend của bạn
    methods: ["GET", "POST"],
  },
});

// Khi client kết nối
io.on("connection", (socket) => {
  console.log("Admin connected:", socket.id);

  // Gửi thông báo khi có đơn hàng mới
  socket.on("newOrder", (order) => {
    console.log("New order");
    io.emit("orderNotification", order);
  });

  socket.on("disconnect", () => {
    console.log("Admin disconnected:", socket.id);
  });
});

// Chạy server trên cổng 8080
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

route(app);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return res.status(statusCode).json({
    statusCode,
    success: false,
    message,
  });
});

export { io };
export default app;
