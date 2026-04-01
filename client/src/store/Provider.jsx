import Context from './Context';
import CryptoJS from 'crypto-js';

import cookies from 'js-cookie';

import { useEffect, useState } from 'react';
import { requestAuth } from '../Config/request';

export function Provider({ children }) {
    const [dataUser, setDataUser] = useState({});

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

        if (!token) {
            return;
        }
        fetchAuth();
    }, []);

    return (
        <Context.Provider
            value={{
                dataUser,
                fetchAuth,
                clearAuth,
            }}
        >
            {children}
        </Context.Provider>
    );
}
