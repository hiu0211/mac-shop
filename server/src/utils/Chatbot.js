const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY_GEMINI);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const modelProduct = require("../models/products.model");

const normalizeAttributes = (attributes) => {
  if (!attributes) {
    return {};
  }

  if (typeof attributes === "string") {
    try {
      const parsed = JSON.parse(attributes);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  if (typeof attributes === "object" && !Array.isArray(attributes)) {
    return { ...attributes };
  }

  return {};
};

const getDisplayPrice = (product) => {
  const price = Number(product?.price || 0);
  const discount = Number(product?.discount || 0);
  const legacyPriceDiscount = Number(product?.priceDiscount || 0);

  if (discount > 0) {
    return {
      hasDiscount: true,
      finalPrice: Math.round((price * (100 - discount)) / 100),
    };
  }

  if (legacyPriceDiscount > 0 && legacyPriceDiscount < price) {
    return {
      hasDiscount: true,
      finalPrice: legacyPriceDiscount,
    };
  }

  return {
    hasDiscount: false,
    finalPrice: price,
  };
};

const formatSpecLabel = (key = "") =>
  String(key || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toDisplayValue = (value) => {
  if (value == null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return String(value).trim();
};

const getSpecsText = (product) => {
  const dynamicAttributes = normalizeAttributes(product?.attributes);
  const brandFromProduct = String(product?.brand || product?.manufacturer || "").trim();
  const brandFromAttributes = toDisplayValue(dynamicAttributes?.brand || dynamicAttributes?.manufacturer);
  const brand = brandFromProduct || brandFromAttributes;

  const entries = Object.entries(dynamicAttributes)
    .filter(([key]) => !["brand", "manufacturer"].includes(String(key || "").trim().toLowerCase()))
    .map(([key, value]) => [formatSpecLabel(key), toDisplayValue(value)])
    .filter(([key, value]) => key && value);

  const specs = [
    ...(brand ? [`Hãng: ${brand}`] : []),
    ...entries.map(([key, value]) => `${key}: ${value}`),
  ];

  return specs.join(" | ");
};

async function askQuestion(question) {
  try {
    const products = await modelProduct.find({});
    
    // Format gọn nhưng vẫn đầy đủ thông tin
    const productData = products
      .map((p) => {
        const pricing = getDisplayPrice(p);
        const price = pricing.hasDiscount
          ? `${pricing.finalPrice.toLocaleString("vi-VN")}đ (giảm từ ${Number(p.price || 0).toLocaleString("vi-VN")}đ)`
          : `${Number(p.price || 0).toLocaleString("vi-VN")}đ`;
        const specsText = getSpecsText(p);
        
        const status = p.stock > 0 ? `Còn ${p.stock} máy` : "HẾT HÀNG";
        
        return `- ${p.name}: ${price}${specsText ? ` | ${specsText}` : " | Chưa có thông số attributes"} | ${status}`;
      })
      .join("\n");

    const prompt = `Bạn là nhân viên tư vấn điện thoại chuyên nghiệp.

Sản phẩm trong kho:
${productData}

Khách hỏi: "${question}"

QUY TẮC TƯ VẤN:
1. Nếu khách hỏi về SẢN PHẨM CỤ THỂ:
   - Kiểm tra tồn kho trước
   - Nếu còn hàng: Tư vấn chi tiết sản phẩm đó (cấu hình, ưu/nhược điểm, phù hợp với ai)
   - Nếu HẾT HÀNG: Thông báo hết hàng, sau đó gợi ý 2-3 sản phẩm TƯƠNG TỰ còn hàng
   - Nếu sản phẩm không có trong kho hàng: Thông báo sản phẩm không có trong kho hàng

2. Nếu khách hỏi CHUNG CHUNG (không nêu tên cụ thể):
   - Phân tích nhu cầu
   - Đề xuất 2-3 sản phẩm PHÙ HỢP NHẤT còn hàng
   - So sánh ngắn gọn

Trả lời ngắn gọn, súc tích, dễ hiểu.`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();
    return answer;
  } catch (error) {
    console.log(error);
    return "Xin lỗi, đã có lỗi xảy ra trong quá trình xử lý câu hỏi của bạn.";
  }
}

module.exports = { askQuestion };