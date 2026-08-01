import { Spin, message } from 'antd';
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { requestAdmin } from '../Config/request';

function ProtectedAdminRoute({ children }) {
    const [isChecking, setIsChecking] = useState(true);
    const [isAllowed, setIsAllowed] = useState(false);
    const location = useLocation();

    useEffect(() => {
        let isMounted = true;

        const verifyAdmin = async () => {
            try {
                await requestAdmin();
                if (isMounted) {
                    setIsAllowed(true);
                }
            } catch (error) {
                if (isMounted) {
                    setIsAllowed(false);
                    const errorMessage = error?.response?.data?.message || 'Bạn không có quyền truy cập';
                    message.error(errorMessage);
                }
            } finally {
                if (isMounted) {
                    setIsChecking(false);
                }
            }
        };

        verifyAdmin();

        return () => {
            isMounted = false;
        };
    }, []);

    if (isChecking) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f5f7fb',
                }}
            >
                <Spin size="large" tip="Đang xác thực quyền quản trị" />
            </div>
        );
    }

    if (!isAllowed) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
}

export default ProtectedAdminRoute;
