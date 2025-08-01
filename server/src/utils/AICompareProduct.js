const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY_GEMINI);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const modelProduct = require("../models/products.model");

async function compareProducts(productId1, productId2) {
  try {
    const product1 = await modelProduct.findById(productId1);
    const product2 = await modelProduct.findById(productId2);

    if (!product1 || !product2) {
      throw new Error("Không tìm thấy một hoặc cả hai sản phẩm");
    }

    const prompt = `
      Bạn là một chuyên gia về smartphone, đặc biệt là iPhone. Hãy so sánh chi tiết hai iPhone sau và trả về kết quả dưới dạng HTML với các thẻ định dạng phù hợp. Không cần thêm CSS vào HTML.

      iPhone 1: ${product1.name}
      - Màn hình: ${product1.screen}
      - Bộ nhớ: ${product1.storage}
      - RAM: ${product1.ram}
      - Camera: ${product1.camera}
      - Pin: ${product1.battery}
      - Giá: ${product1.price.toLocaleString("vi-VN")} VND

      iPhone 2: ${product2.name}
      - Màn hình: ${product2.screen}
      - Bộ nhớ: ${product2.storage}
      - RAM: ${product2.ram}
      - Camera: ${product2.camera}
      - Pin: ${product2.battery}
      - Giá: ${product2.price.toLocaleString("vi-VN")} VND

      Hãy phân tích và so sánh các khía cạnh sau:
      1. Thiết kế và màn hình
      2. Hiệu năng và RAM
      3. Camera và khả năng chụp ảnh/quay video
      4. Thời lượng pin
      5. Giá trị đồng tiền
      6. Đối tượng người dùng phù hợp với từng sản phẩm
      7. Các tính năng đặc biệt của mỗi model (nếu có)
      
      Hãy trả lời một cách chuyên nghiệp, dễ hiểu và đưa ra lời khuyên cụ thể cho người dùng dựa trên nhu cầu sử dụng khác nhau.
      Nếu có thông tin về các tính năng độc quyền của iPhone hoặc những điểm nổi bật của từng model, hãy bổ sung vào phần so sánh.`;

    const result = await model.generateContent(prompt);
    const comparison = result.response.text();

    // Wrap the comparison in a styled container
    const styledComparison = `
      <style>
        .comparison-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        
        .product-card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .comparison-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        h2 {
          color: #2c3e50;
          border-bottom: 2px solid #eee;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        
        h3 {
          color: #3498db;
          margin-top: 20px;
        }
        
        .highlight {
          background-color: #fff3cd;
          padding: 2px 5px;
          border-radius: 3px;
        }
        
        ul {
          list-style-type: none;
          padding-left: 0;
        }
        
        li {
          margin-bottom: 10px;
          padding-left: 20px;
          position: relative;
        }
        
        li:before {
          content: "•";
          color: #3498db;
          position: absolute;
          left: 0;
        }
        
        .conclusion {
          background: #e8f4f8;
          border-radius: 8px;
          padding: 15px;
          margin-top: 20px;
        }
      </style>
      <div class="comparison-container">
        ${comparison}
      </div>`;

    return styledComparison;
  } catch (error) {
    console.error("Lỗi khi so sánh sản phẩm:", error);
    throw error;
  }
}

module.exports = { compareProducts };
