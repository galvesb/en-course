import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [address, setAddress] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await register(name, email, cpf, address, password);
        if (res.success) {
            navigate('/profession');
        } else {
            setError(res.message);
        }
    };

    const formatCPF = (value) => {
        // Remove tudo que não é dígito
        const numbers = value.replace(/\D/g, '');

        // Aplica a máscara XXX.XXX.XXX-XX
        if (numbers.length <= 11) {
            return numbers
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        return numbers.slice(0, 11);
    };

    const handleCPFChange = (e) => {
        const formatted = formatCPF(e.target.value);
        setCpf(formatted);
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
                        <span>Nome Completo</span>
                        <input
                            type="text"
                            placeholder="Seu nome completo"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </label>
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
                        <span>CPF</span>
                        <input
                            type="text"
                            placeholder="000.000.000-00"
                            value={cpf}
                            onChange={handleCPFChange}
                            maxLength="14"
                            required
                        />
                    </label>
                    <label>
                        <span>Endereço Completo</span>
                        <input
                            type="text"
                            placeholder="Rua, número, bairro, cidade, estado"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
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
                            minLength="6"
                            required
                        />
                    </label>
                    <button type="submit" className="btn primary auth-submit">
                        Cadastrar
                    </button>
                </form>

                <p className="auth-footer">
                    Já tem uma conta? <Link to="/login">Fazer Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
