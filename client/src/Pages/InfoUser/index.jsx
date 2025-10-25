import classNames from 'classnames/bind';
import styles from './InfoUser.module.scss';
import Header from '../../Components/Header/Header';

import InfoUser from './Components/InfoUser/InfoUser';
import { useStore } from '../../hooks/useStore';
import { useState } from 'react';
import { requestLogout } from '../../Config/request';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';

const cx = classNames.bind(styles);

function Index() {
    const { dataUser } = useStore();

    const [isOpen, setIsOpen] = useState(false);

    const navigate = useNavigate();

    const handleLogOut = async () => {
        try {
            await requestLogout();
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

            <main className={cx('main')}>
                <div className={cx('container')}>
                    <div className={cx('info')}>
                        <img src="https://doanwebsite.com/assets/userNotFound-DUSu2NMF.png" alt="" />
                        <h4>{dataUser.fullName}</h4>
                        <ul>
                            <li id={cx('active')}>Trang cá nhân</li>
                            <li onClick={() => setIsOpen(true)}>Đổi mật khẩu</li>
                            <li onClick={handleLogOut}>Đăng xuất</li>
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
