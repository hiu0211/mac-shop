import { useRef, useCallback, useEffect } from 'react';

function useDebounceCallback(callback, delay) {
    const timeoutRef = useRef({});

    // Cleanup khi component unmount
    useEffect(() => {
        return () => {
            Object.values(timeoutRef.current).forEach(timeout => {
                clearTimeout(timeout);
            });
        };
    }, []);

    const debouncedCallback = useCallback((key, ...args) => {
        // Clear timeout cũ cho key này
        if (timeoutRef.current[key]) {
            clearTimeout(timeoutRef.current[key]);
        }

        // Tạo timeout mới
        timeoutRef.current[key] = setTimeout(() => {
            callback(...args);
            delete timeoutRef.current[key];
        }, delay);
    }, [callback, delay]);

    return debouncedCallback;
}

export default useDebounceCallback;