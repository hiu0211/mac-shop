import classNames from 'classnames/bind';
import styles from './InfoUser.module.scss';
import Header from '../../Components/Header/Header';

import InfoUser from './Components/InfoUser/InfoUser';
import { useStore } from '../../hooks/useStore';
import { useEffect, useState, useContext } from 'react';
import { requestLogout } from '../../Config/request';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import userAvatar from '../../assets/images/User.png';
import Context from '../../store/Context';

const cx = classNames.bind(styles);

function Index() {
    const { dataUser } = useStore();
    const { clearAuth } = useContext(Context);

    const [isOpen, setIsOpen] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(userAvatar);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogOut = async () => {
        setLoading(true);
        try {
            await requestLogout();
            message.success('Đăng xuất thành công');
            clearAuth();
            navigate('/login');
        } catch (error) {
            message.error(error.response?.data?.message || 'Đăng xuất thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setAvatarPreview(objectUrl);
    };

    useEffect(() => {
        return () => {
            if (avatarPreview && avatarPreview.startsWith('blob:')) {
                URL.revokeObjectURL(avatarPreview);
            }
        };
    }, [avatarPreview]);

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <main className={cx('main')}>
                <div className={cx('container')}>
                    <div className={cx('info')}>
                        <div className={cx('avatar')}>
                            <label className={cx('avatarLabel')} htmlFor="avatarUpload">
                                <img src={avatarPreview} alt="User avatar" />
                            </label>
                            <input
                                id="avatarUpload"
                                className={cx('avatarInput')}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />
                        </div>
                        <h4>{dataUser.fullName}</h4>
                        <ul>
                            {/* <li id={cx('active')}>Trang cá nhân</li> */}
                            <li onClick={() => setIsOpen(true)} style={{ pointerEvents: loading ? 'none' : 'auto', opacity: loading ? 0.6 : 1 }}>Đổi mật khẩu</li>
                            <li onClick={handleLogOut} style={{ pointerEvents: loading ? 'none' : 'auto', opacity: loading ? 0.6 : 1 }}>{loading ? 'Đang đăng xuất...' : 'Đăng xuất'}</li>
                        </ul>
                    </div>
                    <div className={cx('form')}>
                        <InfoUser isOpen={isOpen} setIsOpen={setIsOpen} />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Index;
