const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Global Middleware (MUST come before routes)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Static Frontend & Uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Use __dirname if index.html, app.js, and styles.css are in the same folder as server.js
// (or change to path.join(__dirname, "public") if you moved them into a public/ folder)
app.use(express.static(path.join(__dirname, "../frontend")));

// 3. Health Check & API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running", business: "Anna Johnson Flooring Sales & Installation" });
});

const productRoutes = require("./productRoutes");
const clientRoutes = require("./clientRoutes");
const requestRoutes = require("./requestRoutes");
const quoteRoutes = require("./quotes");
const billingRoutes = require("./billing");

app.use("/api", productRoutes);
app.use("/api", clientRoutes);
app.use("/api", requestRoutes);
app.use("/api", quoteRoutes);
app.use("/api", billingRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
