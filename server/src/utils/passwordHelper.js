const crypto = require("crypto");

/**
 * Sinh mật khẩu ngẫu nhiên với độ dài chỉ định (mặc định 12 ký tự)
 * Đảm bảo chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số.
 */
const generateRandomPassword = (length = 12) => {
  const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
  const numberChars = "0123456789";
  const allChars = `${uppercaseChars}${lowercaseChars}${numberChars}`;

  const passwordChars = [
    uppercaseChars[crypto.randomInt(uppercaseChars.length)],
    lowercaseChars[crypto.randomInt(lowercaseChars.length)],
    numberChars[crypto.randomInt(numberChars.length)],
  ];

  while (passwordChars.length < length) {
    passwordChars.push(allChars[crypto.randomInt(allChars.length)]);
  }

  for (let index = passwordChars.length - 1; index > 0; index -= 1) {
    const randomIndex = crypto.randomInt(index + 1);
    [passwordChars[index], passwordChars[randomIndex]] = [
      passwordChars[randomIndex],
      passwordChars[index],
    ];
  }

  return passwordChars.join("");
};

module.exports = {
  generateRandomPassword,
};
