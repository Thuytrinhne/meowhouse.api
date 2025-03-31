import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import cors from "cors";
import route from "./src/routes/index.js";
import pusher from "./src/utils/pusher.js";

const PORT = 8080;

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_CONNECTION_STRING)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });

// Initialize Express app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

// API để trigger sự kiện với Pusher (nếu cần)
app.post("/api/trigger-event", async (req, res) => {
  const { channel, event, data } = req.body;
  await pusher.trigger(channel, event, data);
  res.json({ success: true });
});

// Routes
route(app);

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return res.status(statusCode).json({
    statusCode,
    success: false,
    message,
  });
});

export default app;
