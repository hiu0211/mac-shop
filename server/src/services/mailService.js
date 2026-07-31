const nodemailer = require('nodemailer');
const { google } = require('googleapis');

/**
 * Khởi tạo Mail Transporter hỗ trợ cả OAuth2 và SMTP thường
 */
const getMailTransport = async () => {
    // Nếu có cấu hình OAuth2 trong .env, ưu tiên dùng OAuth2 cho độ tin cậy cao nhất trên Gmail
    if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.REFRESH_TOKEN && process.env.USER_EMAIL) {
        try {
            const oAuth2Client = new google.auth.OAuth2(
                process.env.CLIENT_ID,
                process.env.CLIENT_SECRET,
                process.env.REDIRECT_URI
            );
            oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
            const accessToken = await oAuth2Client.getAccessToken();

            return nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: process.env.USER_EMAIL,
                    clientId: process.env.CLIENT_ID,
                    clientSecret: process.env.CLIENT_SECRET,
                    refreshToken: process.env.REFRESH_TOKEN,
                    accessToken: accessToken.token || accessToken,
                },
            });
        } catch (err) {
            console.warn('Không thể khởi tạo Gmail OAuth2, chuyển sang cấu hình SMTP:', err?.message || err);
        }
    }

    const host = process.env.MAIL_HOST || 'smtp.gmail.com';
    const isGmail = host.includes('gmail.com');

    if (isGmail) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });
    }

    const port = Number(process.env.MAIL_PORT || 587);
    return nodemailer.createTransport({
        host,
        port,
        secure: String(process.env.MAIL_SECURE || '').toLowerCase() === 'true' || port === 465,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
    });
};

/**
 * Gửi email thông báo khởi tạo tài khoản mới
 */
const sendNewAccountEmail = async ({ to, fullName, email, password }) => {
    const fromAddress = process.env.MAIL_FROM || process.env.MAIL_USER;
    const userEmail = process.env.MAIL_USER || process.env.USER_EMAIL;
    const baseUrl = process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    const loginUrl = `${baseUrl.replace(/\/$/, '')}/login`;

    if (!userEmail || (!process.env.MAIL_PASS && !process.env.REFRESH_TOKEN)) {
        throw new Error('Thiếu cấu hình SMTP/OAuth2 mail');
    }

    const transport = await getMailTransport();

    const info = await transport.sendMail({
        from: fromAddress,
        to,
        replyTo: userEmail,
        subject: '[Mac Shop] Thông tin tài khoản mới của bạn',
        headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'High',
            'X-Mailer': 'MacShop Mailer 2.0',
        },
        text: `Xin chào ${fullName || email},\n\nTài khoản của bạn đã được quản trị viên tạo mới thành công trên hệ thống Mac Shop.\n\nThông tin đăng nhập:\n- Email đăng nhập: ${email}\n- Mật khẩu tạm thời: ${password}\n\nĐăng nhập tại: ${loginUrl}\n\n* Vì lý do bảo mật, vui lòng đăng nhập và đổi mật khẩu ngay trong lần đầu tiên sử dụng.`,
        html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1d1d1f; background-color: #f5f5f7; padding: 40px 15px; -webkit-font-smoothing: antialiased;">
                <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid rgba(0, 0, 0, 0.05);">
                    
                    <!-- Branding Header -->
                    <div style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #f0f0f2;">
                        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.5px;">Mac Shop</h1>
                        <p style="margin: 6px 0 0 0; font-size: 13px; color: #86868b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Thông báo tài khoản mới</p>
                    </div>

                    <!-- Main Content -->
                    <div style="padding: 32px;">
                        <p style="font-size: 16px; margin: 0 0 16px 0; color: #1d1d1f;">Xin chào <strong>${fullName || email}</strong>,</p>
                        <p style="font-size: 15px; margin: 0 0 24px 0; color: #515154; line-height: 1.5;">Tài khoản của bạn đã được quản trị viên khởi tạo thành công trên hệ thống <strong>Mac Shop</strong>.</p>

                        <!-- Information Card -->
                        <div style="background: #fbfbfd; border: 1px solid #e5e5e7; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                            <div style="margin-bottom: 14px;">
                                <div style="font-size: 12px; color: #86868b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Email đăng nhập</div>
                                <div style="font-size: 15px; font-weight: 600; color: #1d1d1f; word-break: break-all;">${email}</div>
                            </div>
                            <div style="border-top: 1px solid #f0f0f2; padding-top: 14px;">
                                <div style="font-size: 12px; color: #86868b; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Mật khẩu tạm thời</div>
                                <div style="display: inline-block; background: #ffffff; border: 1px solid #d2d2d7; padding: 6px 14px; border-radius: 6px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 16px; font-weight: 700; color: #e03e2d; letter-spacing: 1px;">
                                    ${password}
                                </div>
                            </div>
                        </div>

                        <!-- Security Notice -->
                        <div style="margin-bottom: 28px;">
                            <p style="font-size: 13px; color: #6e6e73; margin: 0; line-height: 1.5;">
                                🔒 <strong>Lưu ý bảo mật:</strong> Vì lý do an toàn, vui lòng tiến hành <strong>đổi mật khẩu ngay lập tức</strong> sau khi đăng nhập thành công.
                            </p>
                        </div>

                        <!-- Call To Action Button -->
                        <div style="text-align: center; margin-bottom: 8px;">
                            <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #0066cc; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 102, 204, 0.2);">
                                Đăng nhập ngay
                            </a>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #fbfbfd; padding: 20px 32px; text-align: center; border-top: 1px solid #f0f0f2;">
                        <p style="margin: 0; font-size: 12px; color: #86868b; line-height: 1.5;">
                            Nếu bạn không yêu cầu tạo tài khoản này, vui lòng bỏ qua email hoặc liên hệ với bộ phận hỗ trợ của Mac Shop.
                        </p>
                    </div>
                </div>
            </div>
        `,
    });

    console.log('Đã gửi email tạo tài khoản tới:', to, '| MessageID:', info?.messageId);
    return info;
};

module.exports = {
    sendNewAccountEmail,
};