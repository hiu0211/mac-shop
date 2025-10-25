import classNames from 'classnames/bind';
import styles from './RegisterUser.module.scss';

import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

import { Button, Input, Space } from 'antd';

import { Link } from 'react-router-dom';
import { useState } from 'react';

import { message } from 'antd';
import { requestRegister, requestLoginGoogle } from '../../Config/request';
import { useNavigate } from 'react-router-dom';

const cx = classNames.bind(styles);

function RegisterUser() {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSuccess = async (response) => {
        const { credential } = response; // Nhận ID Token từ Google
        try {
            setLoading(true);
            const res = await requestLoginGoogle(credential);
            message.success(res.message);

            // Chuyển hướng sau khi đăng nhập Google thành công
            setTimeout(() => {
                navigate('/'); // Hoặc trang chủ sau khi đăng nhập
            }, 1500);
        } catch (error) {
            console.error('Login failed', error);
            message.error('Đăng nhập Google thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => {
        console.log('Google Login Failed');
        message.error('Đăng nhập Google thất bại');
    };

    const handleRegister = async () => {
        // Validation cơ bản
        if (!fullName.trim()) {
            message.error('Vui lòng nhập họ và tên');
            return;
        }
        if (!email.trim()) {
            message.error('Vui lòng nhập email');
            return;
        }
        if (!phone.trim()) {
            message.error('Vui lòng nhập số điện thoại');
            return;
        }
        if (!password.trim()) {
            message.error('Vui lòng nhập mật khẩu');
            return;
        }
        if (password.length < 6) {
            message.error('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        try {
            setLoading(true);
            const data = {
                fullName: fullName.trim(),
                email: email.trim(),
                phone: phone.trim(),
                password,
            };

            const res = await requestRegister(data);
            message.success(res.metadata.message || 'Đăng ký thành công!');

            // Chuyển hướng tới trang đăng nhập sau 1.5 giây
            setTimeout(() => {
                navigate('/login');
            }, 1500);
        } catch (error) {
            console.error('Registration failed:', error);
            const errorMessage = error?.response?.data?.message || 'Đăng ký thất bại';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Hàm xử lý Enter key
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleRegister();
        }
    };

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <main>
                <div className={cx('container')}>
                    <h1>Đăng ký</h1>
                    <div className={cx('form')}>
                        <Input
                            placeholder="Họ và tên"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            onPressEnter={handleKeyPress}
                            disabled={loading}
                        />
                        <Input
                            placeholder="Số điện thoại"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            onPressEnter={handleKeyPress}
                            disabled={loading}
                        />
                        <Input
                            placeholder="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onPressEnter={handleKeyPress}
                            disabled={loading}
                        />
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Input.Password
                                placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onPressEnter={handleKeyPress}
                                disabled={loading}
                            />
                        </Space>

                        <Button
                            type="primary"
                            size="large"
                            loading={loading}
                            onClick={handleRegister}
                            style={{ width: '100%' }}
                        >
                            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
                        </Button>

                        <div style={{ margin: '20px 0', textAlign: 'center' }}>
                            <span style={{ color: '#666' }}>Hoặc</span>
                        </div>

                        <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
                            <GoogleLogin
                                onSuccess={handleSuccess}
                                onError={handleGoogleError}
                                disabled={loading}
                                size="large"
                                width="100%"
                            />
                        </GoogleOAuthProvider>
                    </div>
                    <div className={cx('link')}>
                        <Link to="/login">Đã có tài khoản? Đăng nhập</Link>
                        <Link to="/forgot-password">Quên mật khẩu?</Link>
                    </div>
                </div>
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default RegisterUser;
