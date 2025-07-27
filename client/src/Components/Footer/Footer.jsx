import classNames from 'classnames/bind';
import styles from './Footer.module.scss';

import logo from '../../assets/images/logo.png';

const cx = classNames.bind(styles);

function Footer() {
    return (
        <div className={cx('wrapper')}>
            <div className={cx('inner')}>
                <div className={cx('info')}>
                    {/* <img src={logo} alt="" /> */}
                    <ul>
                        <li>MACONE là đại lý uỷ quyền chính thức của Apple tại Việt Nam (AAR)</li>
                        <li>Công ty cổ phần MACONE</li>
                        <li>Giấy phép ĐKKD số: 0108037559</li>
                        <li>Hotline tư vấn: 0899804328</li>
                        <li>Email: macone@gmail.com</li>
                        <li>Thời gian làm việc: 8h30 – 21h30</li>
                    </ul>
                </div>
                <div className={cx('support')}>
                    <h4>HỖ TRỢ KHÁCH HÀNG</h4>
                    <ul>
                        <li>Giới thiệu</li>
                        <li>Hướng dẫn mua hàng</li>
                        <li>Bán hàng Doanh Nghiệp</li>
                        <li>Mua trả góp</li>
                        <li>Tin công nghệ</li>
                        <li>MFix – Trung tâm dịch vụ sửa chữa</li>
                        <li>Liên hệ</li>
                    </ul>
                </div>
                <div className={cx('policy')}>
                    <h4>CHÍNH SÁCH</h4>
                    <ul>
                        <li>Chính sách Bảo Hành & Đổi Trả</li>
                        <li>Chính sách đặt hàng</li>
                        <li>Chính sách vận chuyển</li>
                        <li>Chính sách bảo mật thông tin</li>
                        <li>Chính sách thanh toán</li>
                        <li>Gói bảo hành vàng MACONE Care</li>
                        <li>Các gói bảo hành hỗ trợ doanh nghiệp</li>
                    </ul>
                </div>
                <div className={cx('address')}>
                    <h4>Hà Nội:</h4>
                    <ul>
                        <li>Cơ sở 1: 113 Hoàng Cầu, Q. Đống Đa, Hà Nội. SĐT: 0342 99 55 66</li>
                        <li>Cơ sở 2: 99 Nguyễn Văn Huyên, Q. Cầu Giấy, Hà Nội. SĐT: 0773 220 666</li>
                        <li>Cơ sở 3: 186 Võ Văn Tần, Q. 3, TP Hồ Chí Minh. SĐT: 0386 370 444</li>
                        <li>SĐT: 0386 370 444</li>
                        <li>(Các cơ sở đều có chỗ để xe ô tô)</li>
                    </ul>
                </div>
            </div>

            <p className={cx('copyright')}>Copyright © 2025 - H I U</p>
        </div>
    );
}

export default Footer;
