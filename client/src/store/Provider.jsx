import Context from './Context';
import CryptoJS from 'crypto-js';
import cookies from 'js-cookie';
import { useEffect, useState } from 'react';
import { requestAuth, requestGetWishlist, requestAddWishlist, requestRemoveWishlist } from '../Config/request';

export function Provider({ children }) {
    const [dataUser, setDataUser] = useState({});
    const [wishlist, setWishlist] = useState([]);

    const fetchAuth = async () => {
        const res = await requestAuth();
        const bytes = CryptoJS.AES.decrypt(res.metadata.auth, import.meta.env.VITE_SECRET_CRYPTO);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        const user = JSON.parse(originalText);
        setDataUser(user);
    };

    const clearAuth = () => {
        setDataUser({});
    };

    useEffect(() => {
        const token = cookies.get('logged');
        if (!token) return;
        fetchAuth();
    }, []);

    // Chỉ load wishlist khi đã đăng nhập
    useEffect(() => {
        const load = async () => {
            if (!dataUser?._id) {
                setWishlist([]);
                return;
            }
            try {
                const res = await requestGetWishlist();
                const ids = res?.metadata || [];
                setWishlist(Array.isArray(ids) ? ids.map(String) : []);
            } catch (err) {
                console.error('Error loading wishlist:', err);
                setWishlist([]);
            }
        };
        load();
    }, [dataUser?._id]);

    const refreshWishlist = async () => {
        if (!dataUser?._id) return;
        try {
            const res = await requestGetWishlist();
            const ids = res?.metadata || [];
            setWishlist(Array.isArray(ids) ? ids.map(String) : []);
        } catch (err) {
            console.error('Error refreshing wishlist:', err);
        }
    };

    const isWishlisted = (productId) => {
        if (!productId) return false;
        return wishlist.includes(String(productId));
    };

    const toggleWishlist = async (productId) => {
        if (!productId || !dataUser?._id) return; // chặn guest
        const pid = String(productId);
        const exists = wishlist.includes(pid);
        const next = exists ? wishlist.filter((id) => id !== pid) : [...wishlist, pid];

        setWishlist(next); // optimistic update

        try {
            if (!exists) {
                await requestAddWishlist({ productId: pid });
            } else {
                await requestRemoveWishlist(pid);
            }
        } catch (err) {
            console.error('Error toggling wishlist:', err);
            setWishlist(wishlist); // rollback
        }
    };

    const clearWishlist = () => {
        setWishlist([]);
    };

    return (
        <Context.Provider
            value={{
                dataUser,
                fetchAuth,
                clearAuth,
                wishlist,
                toggleWishlist,
                clearWishlist,
                isWishlisted,
                refreshWishlist,
                wishlistCount: wishlist.length,
            }}
        >
            {children}
        </Context.Provider>
    );
}