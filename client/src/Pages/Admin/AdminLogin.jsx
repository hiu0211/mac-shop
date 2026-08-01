import classNames from 'classnames/bind';
import { Button, Form, Input, Typography, message } from 'antd';
import { useEffect, useState, useContext } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

import { requestAdmin, requestAdminLogin, requestLoginGoogle } from '../../Config/request';
import Context from '../../store/Context';
import styles from './AdminLogin.module.scss';

const cx = classNames.bind(styles);
const { Title, Paragraph } = Typography;

function AdminLogin() {
    const navigate = useNavigate();
    const location = useLocation();
    const { fetchAuth } = useContext(Context);
    const [submitting, setSubmitting] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthed, setIsAuthed] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const checkSession = async () => {
            try {
                await requestAdmin();
                if (isMounted) setIsAuthed(true);
            } catch {
                if (isMounted) setIsAuthed(false);
            } finally {
                if (isMounted) setIsChecking(false);
            }
        };

        checkSession();

        return () => { isMounted = false; };
    }, []);

    const handleSubmit = async (values) => {
        setSubmitting(true);
        try {
            const res = await requestAdminLogin(values);
            message.success(res?.message || 'Đăng nhập thành công');

            const redirectTo = location.state?.from?.pathname || '/admin';
            navigate(redirectTo, { replace: true });
        } catch (error) {
            const errorMessage = error?.response?.data?.message || 'Đăng nhập thất bại';
            message.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogleSuccess = async (response) => {
        const { credential } = response;
        setSubmitting(true);
        try {
            const res = await requestLoginGoogle(credential);
            // Kiểm tra quyền Admin
            await requestAdmin();
            message.success(res?.message || 'Đăng nhập trang quản trị thành công');
            await fetchAuth();
            const redirectTo = location.state?.from?.pathname || '/admin';
            navigate(redirectTo, { replace: true });
        } catch (error) {
            const errorMessage = error?.response?.data?.message || 'Bạn không có quyền truy cập';
            message.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (isChecking) return null;
    if (isAuthed) return <Navigate to="/admin" replace />;

    return (
        <div className={cx('wrapper')}>
            <div className={cx('container')}>
                <div className={cx('header')}>
                    <Title level={1} className={cx('title')}>
                        Chào mừng đến với trang quản trị
                    </Title>
                    <Paragraph className={cx('subtitle')}>
                        Vui lòng nhập email và mật khẩu để đăng nhập vào trang quản trị.
                    </Paragraph>
                </div>

                <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
                    <Form layout="vertical" onFinish={handleSubmit} autoComplete="off" className={cx('form')}>
                        <Form.Item
                            name="email"
                            className={cx('formItem')}
                            rules={[
                                { required: true, message: 'Vui lòng nhập email' },
                            ]}
                        >
                            <Input
                                size="large"
                                placeholder="Email"
                                className={cx('input')}
                                disabled={submitting}
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            className={cx('formItem', 'passwordItem')}
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                        >
                            <Input.Password
                                size="large"
                                placeholder="Password"
                                className={cx('input')}
                                disabled={submitting}
                                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                            />
                        </Form.Item>

                        <Form.Item className={cx('buttonWrap')}>
                            <Button type="primary" htmlType="submit" loading={submitting} className={cx('submitBtn')} disabled={submitting}>
                                Đăng nhập
                            </Button>
                        </Form.Item>

                        <div className={cx('googleLoginWrap')}>
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => message.error('Đăng nhập Google thất bại')}
                                disabled={submitting}
                            />
                        </div>
                    </Form>
                </GoogleOAuthProvider>
            </div>
        </div>
    );
}

export default AdminLogin;