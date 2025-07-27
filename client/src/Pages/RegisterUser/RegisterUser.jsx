import classNames from 'classnames/bind';
import styles from './RegisterUser.module.scss';

import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

import { Button, Input, Space } from 'antd';

import { Link } from 'react-router-dom';
import { useState } from 'react';

import { message } from 'antd';
import { requestRegister } from '../../Config/request';

const cx = classNames.bind(styles);

function RegisterUser() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');

    const handleSuccess = async (response) => {
        const { credential } = response; // Nhận ID Token từ Google
        try {
            const res = await requestLoginGoogle(credential);
            toast.success(res.message);
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            navigate('/');
        } catch (error) {
            console.error('Login failed', error);
        }
    };

    const handleRegister = async () => {
        try {
            const data = {
                fullName,
                email,
                phone,
                password,
            };
            const res = await requestRegister(data);
            message.success(res.metadata.message);
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
                    <h1>Đăng ký</h1>
                    <div className={cx('form')}>
                        <Input placeholder="Họ và tên" onChange={(e) => setFullName(e.target.value)} />
                        <Input placeholder="Số điện thoại" onChange={(e) => setPhone(e.target.value)} />
                        <Input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
                        <Space direction="vertical">
                            <Input.Password placeholder="Mật khẩu" onChange={(e) => setPassword(e.target.value)} />
                        </Space>
                        <Button onClick={handleRegister}>Đăng ký</Button>

                        <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
                            <GoogleLogin onSuccess={handleSuccess} onError={() => console.log('Login Failed')} />
                        </GoogleOAuthProvider>
                    </div>
                    <div className={cx('link')}>
                        <Link to="/login">Đăng nhập</Link>
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

export default RegisterUser;
