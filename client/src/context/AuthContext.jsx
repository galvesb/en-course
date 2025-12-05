import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const syncUserProfile = async (token) => {
        try {
            const res = await axios.get('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            localStorage.setItem('user', JSON.stringify(res.data));
            setUser(res.data);
        } catch (err) {
            console.error('Error syncing user profile', err);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            syncUserProfile(token).finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        try {
            const res = await axios.post('/api/auth/login', { email, password });
            const { token, user } = res.data;

            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            await syncUserProfile(token);
            return { success: true };
        } catch (err) {
            return { success: false, message: err.response?.data?.message || 'Login failed' };
        }
    };

    const register = async (name, email, cpf, address, password) => {
        try {
            const res = await axios.post('/api/auth/register', {
                name,
                email,
                cpf,
                address,
                password
            });
            const { token, user } = res.data;

            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            await syncUserProfile(token);
            return { success: true };
        } catch (err) {
            console.error('Registration error:', err);
            if (err.response?.data?.message) {
                return { success: false, message: err.response.data.message };
            }
            if (err.code === 'ECONNREFUSED' || err.message === 'Network Error') {
                return { success: false, message: 'Não foi possível conectar ao servidor. Verifique se o servidor está rodando.' };
            }
            return { success: false, message: err.message || 'Erro ao registrar usuário. Tente novamente.' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
