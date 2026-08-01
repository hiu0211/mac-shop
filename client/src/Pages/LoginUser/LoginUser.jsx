import classNames from 'classnames/bind';
import styles from './LoginUser.module.scss';

import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

import { Input, Button, Space, message } from 'antd';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import { requestLogin, requestLoginGoogle } from '../../Config/request';
import { useState, useContext } from 'react';
import Context from '../../store/Context';

const cx = classNames.bind(styles);

function LoginUser() {
    const navigate = useNavigate();
    const location = useLocation();
    const { fetchAuth } = useContext(Context);
    const from = location.state?.from || '/';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSuccess = async (response) => {
        const { credential } = response; // Nhận ID Token từ Google
        setLoading(true);
        try {
            const res = await requestLoginGoogle(credential);
            message.success(res.message);
            // Đợi fetchAuth hoàn thành rồi mới navigate
            await fetchAuth();
            navigate(from, { replace: true });
        } catch (error) {
            message.error(error.response?.data?.message || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            message.warning('Vui lòng nhập email và mật khẩu');
            return;
        }

        const data = {
            email,
            password,
        };
        setLoading(true);
        try {
            const res = await requestLogin(data);
            message.success(res?.message || 'Đăng nhập thành công');
            // Đợi fetchAuth hoàn thành rồi mới navigate
            await fetchAuth();
            navigate(from, { replace: true });
        } catch (error) {
            message.error(error.response?.data?.message || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
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
                        <Input
                            placeholder="Email"
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
                        <Space direction="vertical">
                            <Input.Password
                                placeholder="Mật khẩu"
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                        </Space>
                        <Button
                            fullWidth
                            onClick={handleLogin}
                            loading={loading}
                            disabled={loading}
                        >
                            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </Button>

                        <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
                            <GoogleLogin
                                onSuccess={handleSuccess}
                                onError={() => message.error('Đăng nhập Google thất bại')}
                                disabled={loading}
                            />
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
