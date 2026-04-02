const cloudinary = require('cloudinary').v2;

// Cấu hình Cloudinary từ environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload ảnh lên Cloudinary từ buffer
 * @param {Buffer} buffer - File buffer từ multer
 * @param {string} folder - Tên folder lưu trữ (default: 'products')
 * @returns {Promise<string>} - URL ảnh trên Cloudinary
 */
const uploadToCloudinary = (buffer, folder = 'products') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    stream.end(buffer);
  });
};

/**
 * Upload nhiều ảnh lên Cloudinary
 * @param {Array<Buffer>} buffers - Mảng file buffer từ multer
 * @param {string} folder - Tên folder lưu trữ
 * @returns {Promise<Array<string>>} - Mảng URL ảnh
 */
const uploadMultipleToCloudinary = async (buffers, folder = 'products') => {
  try {
    const uploadPromises = buffers.map((buffer) =>
      uploadToCloudinary(buffer, folder)
    );
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  cloudinary,
};
