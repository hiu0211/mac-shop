const express = require("express");
const app = express();
const port = 3000;

require("dotenv").config();

const bodyParser = require("body-parser");
const cookiesParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

const connectDB = require("./config/ConnectDB");
const routes = require("./routes/index");
const { askQuestion } = require("./utils/Chatbot");
const { compareProducts } = require("./utils/AICompareProduct");

app.use(express.static(path.join(__dirname, "../src")));
app.use(cookiesParser());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

routes(app);

connectDB();

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Lỗi server",
  });
});

app.post("/chat", async (req, res) => {
  const { question } = req.body;
  const data = await askQuestion(question);
  return res.status(200).json(data);
});

app.post("/compare-product", async (req, res) => {
  const { productId1, productId2 } = req.body;
  const data = await compareProducts(productId1, productId2);
  return res.status(200).json(data);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
