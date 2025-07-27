const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY_GEMINI);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const modelProduct = require("../models/products.model");

async function askQuestion(question) {
  try {
    const products = await modelProduct.find({});
    const productData = products
      .map(
        (product) => `
        Tên: ${product.name}
        Giá: ${product.price.toLocaleString("vi-VN")}đ ${
          product.priceDiscount
            ? `(Giảm giá: ${product.priceDiscount.toLocaleString("vi-VN")}đ)`
            : ""
        }
        Thông số kỹ thuật:
        - CPU: ${product.cpu}
        - Màn hình: ${product.screen} (${product.screenHz})
        - GPU: ${product.gpu}
        - RAM: ${product.ram}
        - Dung lượng: ${product.storage}
        - Pin: ${product.battery}
        - Camera: ${product.camera}
        - Trọng lượng: ${product.weight}
        - Số lượng còn lại: ${product.stock}
      `
      )
      .join("\n----------------------------------------\n");

    const prompt = `
        Bạn là một chuyên viên tư vấn điện thoại chuyên nghiệp. 
        Đây là danh sách điện thoại hiện có trong cửa hàng:
        ${productData}

        Câu hỏi của khách hàng: "${question}"
        
        Hãy tư vấn một cách chuyên nghiệp, thân thiện và chi tiết:
        1. Phân tích nhu cầu của khách hàng
        2. Đề xuất các điện thoại phù hợp từ danh sách trên
        3. Giải thích lý do đề xuất và so sánh ưu/nhược điểm
        4. Đưa ra lời khuyên cuối cùng
        
        Trả lời bằng tiếng Việt, sử dụng từ ngữ dễ hiểu.
        `;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();
    return answer;
  } catch (error) {
    console.log(error);
    return "Xin lỗi, đã có lỗi xảy ra trong quá trình xử lý câu hỏi của bạn.";
  }
}

module.exports = { askQuestion };
