const express = require('express');
import authRoutes from "./routes/auth.route.js";
import dotenv from "dotenv";
import { connectdb } from "./lib/db.js";
import cookieParser from "cookie-parser";
import messageRoutes from "./routes/message.route.js";
import cors from "cors";
import productRoute from "./routes/product.route.js";
import userRoute from "./routes/users.route.js";
import orderRoute from "./routes/order.route.js";
import whatsappRoutes from "./routes/whatsapp.route.js";

const app = express();
dotenv.config();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    exposedHeaders: ["set-cookie"],
    origin: [
      "http://localhost:5173",
      "http://localhost",
      "http://tauri.localhost",
      "http://127.0.0.1:1430",
    ],
  })
);
app.get("/", (req, res) => res.send("Hello World!"));
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/user", userRoute);
app.use("/api/products", productRoute);
app.use("/api/orders", orderRoute);
app.use("/api/whatsapp", whatsappRoutes);
connectdb();

app.listen(5001, () => {
  console.log("Prot connected at", process.env.PORT);
});
