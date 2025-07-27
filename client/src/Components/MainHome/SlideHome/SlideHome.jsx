import classNames from 'classnames/bind';
import styles from './SlideHome.module.scss';

import { Swiper, SwiperSlide } from 'swiper/react';

import { EffectFade, Navigation, Pagination, Autoplay } from 'swiper/modules';

const cx = classNames.bind(styles);

function SlideHome() {
    return (
        <div className={cx('wrapper')}>
            <Swiper
                slidesPerView={1}
                autoplay={{
                    delay: 2000,
                    disableOnInteraction: false,
                }}
                loop={true}
                speed={1000}
                spaceBetween={30}
                effect={'fade'}
                navigation={true}
                pagination={{
                    clickable: true,
                }}
                modules={[EffectFade, Navigation, Pagination, Autoplay]}
                className="mySwiper"
            >
                <SwiperSlide>
                    <img src="https://macone.vn/wp-content/uploads/2025/02/Banner-Combo-macmini-vs-asus-01fg-scaled.jpg" />
                </SwiperSlide>
                <SwiperSlide>
                    <img src="https://macone.vn/wp-content/uploads/2025/03/Banner-slideshow-air-801.jpg" />
                </SwiperSlide>
                <SwiperSlide>
                    <img src="https://macone.vn/wp-content/uploads/2025/03/Banner-slideshow-air-02.jpg" />
                </SwiperSlide>
                <SwiperSlide>
                    <img src="https://macone.vn/wp-content/uploads/2024/11/464277525_531963139472607_5648188381988869690_n-scaled.jpg" />
                </SwiperSlide>

                <SwiperSlide>
                    <img src="https://macone.vn/wp-content/uploads/2024/11/bannemacbookprorm4-01-scaled.jpg" />
                </SwiperSlide>

                <SwiperSlide>
                    <img src="https://macone.vn/wp-content/uploads/2024/11/Banner-slideshowm4-01.jpg" />
                </SwiperSlide>
            </Swiper>
        </div>
    );
}

export default SlideHome;
