import classNames from 'classnames/bind';
import styles from './LoginUser.module.scss';

import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

import { Input, Button, Space, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';

import { requestLogin, requestLoginGoogle } from '../../Config/request';
import { useState } from 'react';

const cx = classNames.bind(styles);

function LoginUser() {
    const handleSuccess = async (response) => {
        const { credential } = response; // Nhận ID Token từ Google
        try {
            const res = await requestLoginGoogle(credential);
            message.success(res.message);
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            navigate('/');
        } catch (error) {
            message.error(error.response.data.message);
        }
    };

    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        const data = {
            email,
            password,
        };
        try {
            const res = await requestLogin(data);
            message.success(res.metadata.message);
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            navigate('/');
        } catch (error) {
            message.error(error.response.data.message);
        }
    };

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <main>
                <div className={cx('container')}>
                    <h1>Đăng nhập</h1>
                    <div className={cx('form')}>
                        <Input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
                        <Space direction="vertical">
                            <Input.Password placeholder="Mật khẩu" onChange={(e) => setPassword(e.target.value)} />
                        </Space>
                        <Button fullWidth onClick={handleLogin}>
                            Đăng nhập
                        </Button>

                        <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
                            <GoogleLogin onSuccess={handleSuccess} onError={() => console.log('Login Failed')} />
                        </GoogleOAuthProvider>
                    </div>
                    <div className={cx('link')}>
                        <Link to="/register">Đăng ký</Link>
                        <Link to="/forgot-password">Quên mật khẩu</Link>
                    </div>
                </div>
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default LoginUser;
