import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import { Input, Button, Alert, message } from 'antd';
import { MailOutlined, ArrowLeftOutlined, KeyOutlined } from '@ant-design/icons';

import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';
import { requestForgotPassword } from '../../Config/request';
import styles from './ForgotPassword.module.scss';

const cx = classNames.bind(styles);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            message.warning('Vui lòng nhập email đăng ký tài khoản');
            return;
        }

        if (!emailPattern.test(trimmedEmail)) {
            message.error('Định dạng email không hợp lệ. Vui lòng kiểm tra lại');
            return;
        }

        setLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            const res = await requestForgotPassword({ email: trimmedEmail });
            const msg =
                res?.message ||
                'Mật khẩu mới đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư (kể cả thư mục Spam) để đăng nhập.';
            setSuccessMessage(msg);
            message.success('Gửi yêu cầu thành công!');
        } catch (error) {
            const errorMsg =
                error.response?.data?.message ||
                'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại sau.';
            setErrorMessage(errorMsg);
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <main className={cx('main')}>
                <div className={cx('container')}>
                    <div className={cx('headerSection')}>
                        <div className={cx('iconBadge')}>
                            <KeyOutlined />
                        </div>
                        <h1>Thiết lập lại mật khẩu</h1>
                        <p>Nhập email đã đăng ký để nhận mật khẩu mới qua email</p>
                    </div>

                    {successMessage && (
                        <Alert
                            className={cx('successAlert')}
                            message="Thành công"
                            description={successMessage}
                            type="success"
                            showIcon
                        />
                    )}

                    {errorMessage && (
                        <Alert
                            className={cx('successAlert')}
                            message="Yêu cầu không hợp lệ"
                            description={errorMessage}
                            type="error"
                            showIcon
                        />
                    )}

                    <form className={cx('form')} onSubmit={handleSubmit}>
                        <div className={cx('fieldGroup')}>
                            <label htmlFor="forgot-email">
                                <span className={cx('required')}>*</span>
                                Email đăng ký tài khoản
                            </label>
                            <Input
                                id="forgot-email"
                                size="large"
                                className={cx('emailInput')}
                                prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                                placeholder="NguyenVanA@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <Button
                            type="primary"
                            block
                            size="large"
                            className={cx('submitBtn')}
                            onClick={handleSubmit}
                            loading={loading}
                            disabled={loading}
                        >
                            {loading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đặt lại mật khẩu'}
                        </Button>
                    </form>

                    <div className={cx('footerLinks')}>
                        <Link to="/login" className={cx('backLink')}>
                            <ArrowLeftOutlined /> Quay lại đăng nhập
                        </Link>

                        <p className={cx('helpNote')}>
                            Không nhận được email? Kiểm tra thư mục spam hoặc thử lại sau 1 phút.
                        </p>
                    </div>
                </div>
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default ForgotPassword;
