const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY_GEMINI);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const modelProduct = require("../models/products.model");

const formatSpecLabel = (key = "") =>
  String(key || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toDisplayValue = (value) => {
  if (value == null) return "";
  if (Array.isArray(value))
    return value.map((item) => String(item ?? "").trim()).filter(Boolean).join(", ");
  if (typeof value === "object") {
    try { return JSON.stringify(value); } catch { return ""; }
  }
  return String(value).trim();
};

// ✅ Build specComparison trực tiếp từ DB, so khớp key giữa 2 sản phẩm
const buildSpecComparison = (product1, product2) => {
  const specs1 = Array.isArray(product1?.specifications) ? product1.specifications : [];
  const specs2 = Array.isArray(product2?.specifications) ? product2.specifications : [];

  // Tạo map key → {label, value} cho từng sản phẩm
  const map1 = new Map(
    specs1.map((s) => [
      String(s.key || "").trim().toLowerCase(),
      { label: s.label || formatSpecLabel(s.key), value: toDisplayValue(s.value) },
    ])
  );
  const map2 = new Map(
    specs2.map((s) => [
      String(s.key || "").trim().toLowerCase(),
      { label: s.label || formatSpecLabel(s.key), value: toDisplayValue(s.value) },
    ])
  );

  // Lấy tất cả keys xuất hiện ở ít nhất 1 sản phẩm
  const allKeys = new Set([...map1.keys(), ...map2.keys()]);

  const specComparison = [];
  for (const key of allKeys) {
    const entry1 = map1.get(key);
    const entry2 = map2.get(key);

    // Bỏ qua brand/manufacturer vì đã hiển thị riêng
    if (["brand", "manufacturer"].includes(key)) continue;

    const label = entry1?.label || entry2?.label || formatSpecLabel(key);
    const value1 = entry1?.value || "—";
    const value2 = entry2?.value || "—";

    specComparison.push({ key, label, value1, value2, winner: 0 }); // winner=0 tạm thời, AI sẽ điền
  }

  return specComparison;
};

// Build text specs để gửi AI (chỉ cần AI đọc để chấm điểm)
const buildSpecsForPrompt = (product) => {
  const specifications = Array.isArray(product?.specifications) ? product.specifications : [];
  const brand = String(product?.brand || product?.manufacturer || "").trim();
  const brandLine = brand ? [`- Hãng: ${brand}`] : [];
  const entries = specifications
    .filter((s) => !["brand", "manufacturer"].includes(String(s.key || "").trim().toLowerCase()))
    .map((s) => [s.label || formatSpecLabel(s.key), toDisplayValue(s.value)])
    .filter(([label, value]) => label && value)
    .map(([label, value]) => `- ${label}: ${value}`);
  return [...brandLine, ...entries].join("\n      ") || "- Thông số kỹ thuật: Đang cập nhật";
};

async function compareProducts(productId1, productId2) {
  try {
    const [product1, product2] = await Promise.all([
      modelProduct.findById(productId1),
      modelProduct.findById(productId2),
    ]);

    if (!product1 || !product2) throw new Error("Không tìm thấy một hoặc cả hai sản phẩm");

    // ✅ Build specComparison từ DB
    const specComparison = buildSpecComparison(product1, product2);

    // Chỉ gửi AI list các key + value để chấm winner
    const specListForAI = specComparison
      .map((s) => `- ${s.key}: SP1="${s.value1}" | SP2="${s.value2}"`)
      .join("\n");

    const prompt = `
Bạn là chuyên gia smartphone. Hãy phân tích 2 sản phẩm sau và trả về JSON.
Yêu cầu BẮT BUỘC: Chỉ trả về JSON thuần, không markdown, không text thừa.

Sản phẩm 1: ${product1.name} — Giá: ${product1.price.toLocaleString("vi-VN")} VND
${buildSpecsForPrompt(product1)}

Sản phẩm 2: ${product2.name} — Giá: ${product2.price.toLocaleString("vi-VN")} VND
${buildSpecsForPrompt(product2)}

Cấu trúc JSON bắt buộc:
{
  "quickSummary": {
    "product1": { "name": "${product1.name}", "pros": ["3 ưu điểm"], "cons": ["2 nhược điểm"] },
    "product2": { "name": "${product2.name}", "pros": ["3 ưu điểm"], "cons": ["2 nhược điểm"] }
  },
  "scores": {
    "categories": ["Hiệu năng", "Camera", "Pin", "Màn hình", "Giá trị"],
    "product1Scores": [số 1-10, x5],
    "product2Scores": [số 1-10, x5]
  },
  "winners": {
    ${specComparison.map((s) => `"${s.key}": 0`).join(",\n    ")}
  },
  "verdict": {
    "buyProduct1If": "1 câu ngắn",
    "buyProduct2If": "1 câu ngắn"
  }
}

Trong "winners", điền giá trị cho từng key dựa trên thông số sau:
${specListForAI}
Giá trị winner: 1 (SP1 tốt hơn), 2 (SP2 tốt hơn), 0 (tương đương/không so được).
    `;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    try {
      const jsonStr = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      const aiData = JSON.parse(jsonStr);

      // ✅ Merge winner từ AI vào specComparison từ DB
      const winners = aiData.winners || {};
      const mergedSpecs = specComparison.map((s) => ({
        ...s,
        winner: winners[s.key] ?? 0,
      }));

      return {
        quickSummary: aiData.quickSummary,
        scores: aiData.scores,
        specComparison: mergedSpecs, // ← data từ DB, winner từ AI
        verdict: aiData.verdict,
      };
    } catch (e) {
      console.error("Lỗi parse JSON, fallback về text:", e);
      return rawText;
    }
  } catch (error) {
    console.error("Lỗi khi so sánh sản phẩm:", error);
    throw error;
  }
}

module.exports = { compareProducts };