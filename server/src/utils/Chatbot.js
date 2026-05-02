const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY_GEMINI);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const modelProduct = require("../models/products.model");

const normalizeAttributes = (attributes) => {
  if (!attributes) return {};
  if (typeof attributes === "string") {
    try {
      const parsed = JSON.parse(attributes);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof attributes === "object" && !Array.isArray(attributes)) return { ...attributes };
  return {};
};

const getDisplayPrice = (product) => {
  const price = Number(product?.price || 0);
  const discount = Number(product?.discount || 0);
  const legacyPriceDiscount = Number(product?.priceDiscount || 0);

  if (discount > 0) {
    return { hasDiscount: true, finalPrice: Math.round((price * (100 - discount)) / 100) };
  }

  if (legacyPriceDiscount > 0 && legacyPriceDiscount < price) {
    return { hasDiscount: true, finalPrice: legacyPriceDiscount };
  }

  return { hasDiscount: false, finalPrice: price };
};

const formatSpecLabel = (key = "") =>
  String(key || "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const toDisplayValue = (value) => {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map((i) => String(i ?? "").trim()).filter(Boolean).join(", ");
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

  const specs = [...(brand ? [`Hãng: ${brand}`] : []), ...entries.map(([key, value]) => `${key}: ${value}`)];
  return specs.join(" | ");
};

async function askQuestion(question) {
  try {
    const products = await modelProduct.find({});

    const productData = products
      .map((p) => {
        const pricing = getDisplayPrice(p);
        const price = pricing.hasDiscount
          ? `${pricing.finalPrice.toLocaleString("vi-VN")}đ (giảm từ ${Number(p.price || 0).toLocaleString("vi-VN")}đ)`
          : `${Number(p.price || 0).toLocaleString("vi-VN")}đ`;
        const specsText = getSpecsText(p);
        const status = p.stock > 0 ? `Còn ${p.stock} máy` : "HẾT HÀNG";
        return `- **${p.name}**: **${price}**${specsText ? ` | ${specsText}` : " | Chưa có thông số attributes"} | ${status}`;
      })
      .join("\n");

    const prompt = `Bạn là nhân viên tư vấn điện thoại chuyên nghiệp.

Sản phẩm trong kho:
${productData}

Khách hỏi: "${question}"

QUY TẮC TƯ VẤN (BẮT BUỘC):
1. Trả lời ngắn gọn, súc tích, chuyên nghiệp.
2. CHỈ TƯ VẤN các sản phẩm có trong danh sách trên. KHÔNG bịa sản phẩm hay giá.
3. Khi gợi ý sản phẩm, hãy dùng định dạng chính xác sau (một sản phẩm trên một dòng):
   - **Tên sản phẩm**: **<giá>** (ví dụ: - **iPhone 14 128GB**: **15.000.000đ**)
4. Nếu sản phẩm khách hỏi HẾT HÀNG hoặc KHÔNG CÓ TRONG DANH SÁCH, thông báo rõ và gợi ý 1-2 sản phẩm tương tự còn hàng (theo định dạng trên).
5. Nếu liệt kê nhiều sản phẩm, dùng gạch đầu dòng (-) cho mỗi dòng.

Hãy trả lời theo định dạng trên.`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    // Extract mentioned product names using the exact pattern we asked the model to use
    const mentionRegex = /-\s*\*\*(.+?)\*\*\s*[:\-–]\s*\*\*([\d.,]+\s*(?:VNĐ|vnđ|Đ|đ))\*\*/gi;
    const mentioned = [];
    let m;
    while ((m = mentionRegex.exec(answer)) !== null) {
      if (m[1]) mentioned.push(m[1].trim());
    }

    // Fallback: try to match bold names alone and check against product list
    if (mentioned.length === 0) {
      const boldRegex = /\*\*(.+?)\*\*/g;
      while ((m = boldRegex.exec(answer)) !== null) {
        const name = m[1].trim();
        if (products.find((p) => p.name === name)) mentioned.push(name);
      }
    }

    if (mentioned.length === 0) {
      return { text: answer, productImages: {} };
    }

    const matchedProducts = await modelProduct.find({ name: { $in: mentioned } }, "name images");

    const productImages = {};
    matchedProducts.forEach((p) => {
      let imgs = [];
      try {
        if (!p.images) imgs = [];
        else if (typeof p.images === "string") {
          try {
            const parsed = JSON.parse(p.images);
            imgs = Array.isArray(parsed) ? parsed : [String(parsed)];
          } catch {
            imgs = [p.images];
          }
        } else if (Array.isArray(p.images)) imgs = p.images;
        else imgs = [String(p.images)];
      } catch (e) {
        imgs = [];
      }

      const first = Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null;
      if (first) productImages[p.name] = first;
    });

    return { text: answer, productImages };
  } catch (error) {
    console.error("Lỗi khi gọi Gemini AI:", error);
    return { text: "Xin lỗi, hệ thống tư vấn đang gặp lỗi. Vui lòng thử lại sau.", productImages: {} };
  }
}

module.exports = { askQuestion };