import React, { createContext, useState, useEffect, useContext } from 'react';
import client from '../api/client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user from local storage", e);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password, role) => {
        try {
            const response = await client.post('/auth/login', { email, password, role });
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            // Also store role for easy access
            localStorage.setItem('role', role);

            setUser({ ...user, role }); // Ensure role is in user object
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Login failed'
            };
        }
    };

    const register = async (role, data) => {
        try {
            const endpoint = role === 'agent' ? '/auth/register/agent' : '/auth/register/customer';

            // If sending FormData (for files), let Axios/Browser handle the Content-Type boundary
            // We explicitely set it to undefined to override the default application/json
            const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};

            await client.post(endpoint, data, config);
            return { success: true };
        } catch (error) {
            console.error("Registration Error:", error.response?.data);
            const serverError = error.response?.data;
            const errorMessage = serverError?.details || serverError?.error || 'Registration failed';
            return {
                success: false,
                error: errorMessage
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
