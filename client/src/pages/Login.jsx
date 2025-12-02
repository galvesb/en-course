import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await login(email, password);
        if (res.success) {
            // Após login, força usuário a escolher uma profissão
            navigate('/profession');
        } else {
            setError(res.message);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                <div className="auth-header">
                    <p className="auth-badge">Fluency2Work</p>
                </div>

                {error && <p className="auth-error">{error}</p>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label>
                        <span>E-mail</span>
                        <input
                            type="email"
                            placeholder="voce@empresa.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </label>
                    <label>
                        <span>Senha</span>
                        <input
                            type="password"
                            placeholder="********"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>
                    <button type="submit" className="btn primary auth-submit">
                        Entrar
                    </button>
                </form>

                <p className="auth-footer">
                    Não tem conta? <Link to="/register">Criar cadastro</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
