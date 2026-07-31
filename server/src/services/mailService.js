const nodemailer = require('nodemailer');

const getMailTransport = () => {
    const port = Number(process.env.MAIL_PORT || 587);

    return nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port,
        secure: String(process.env.MAIL_SECURE || '').toLowerCase() === 'true' || port === 465,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });
};

const sendNewAccountEmail = async ({ to, fullName, email, password }) => {
    const fromAddress = process.env.MAIL_FROM || process.env.MAIL_USER;

    if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
        throw new Error('Thiếu cấu hình SMTP mail');
    }

    const transport = getMailTransport();

    await transport.sendMail({
        from: fromAddress,
        to,
        subject: 'Tài khoản của bạn đã được tạo',
        text: `Xin chào ${fullName || email}, tài khoản của bạn đã được quản trị viên tạo mới. Email đăng nhập: ${email}. Mật khẩu tạm thời: ${password}. Bạn nên đổi mật khẩu sau khi đăng nhập lần đầu.`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222; background: #f7f7f7; padding: 24px;">
                <div style="max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #e5e5e5;">
                    <h2 style="margin-top: 0; color: #111;">Xin chào ${fullName || email},</h2>
                    <p>Tài khoản của bạn đã được quản trị viên tạo mới trên hệ thống Mac Shop.</p>
                    <p><strong>Email đăng nhập:</strong> ${email}</p>
                    <p><strong>Mật khẩu tạm thời:</strong> ${password}</p>
                    <p>Vui lòng đăng nhập và đổi mật khẩu sau lần đăng nhập đầu tiên để bảo mật tài khoản tốt hơn.</p>
                    <p style="margin-bottom: 0;">Nếu bạn không mong đợi email này, vui lòng bỏ qua.</p>
                </div>
            </div>
        `,
    });
};

module.exports = {
    sendNewAccountEmail,
};