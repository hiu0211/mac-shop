const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY_GEMINI);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const modelProduct = require("../models/products.model");

async function askQuestion(question) {
  try {
    const products = await modelProduct.find({});
    
    // Format gọn nhưng vẫn đầy đủ thông tin
    const productData = products
      .map((p) => {
        const price = p.priceDiscount 
          ? `${p.priceDiscount.toLocaleString("vi-VN")}đ (giảm từ ${p.price.toLocaleString("vi-VN")}đ)`
          : `${p.price.toLocaleString("vi-VN")}đ`;
        
        const status = p.stock > 0 ? `Còn ${p.stock} máy` : "HẾT HÀNG";
        
        return `- ${p.name}: ${price} | ${p.cpu} | ${p.screen} (${p.screenHz}) | ${p.gpu} | ${p.ram} | ${p.storage} | Pin ${p.battery} | Camera ${p.camera} | ${p.weight} | ${status}`;
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