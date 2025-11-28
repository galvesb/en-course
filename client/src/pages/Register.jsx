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
            navigate('/');
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
        <div className="card" style={{ maxWidth: '500px', margin: '50px auto' }}>
            <h2 style={{ textAlign: 'center' }}>Cadastro</h2>
            {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div className="input-group" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <input
                        type="text"
                        placeholder="Nome Completo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="text"
                        placeholder="CPF (000.000.000-00)"
                        value={cpf}
                        onChange={handleCPFChange}
                        maxLength="14"
                        required
                    />
                    <input
                        type="text"
                        placeholder="Endereço Completo"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength="6"
                        required
                    />
                </div>
                <button type="submit" className="btn primary">Cadastrar</button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                Já tem uma conta? <Link to="/login">Fazer Login</Link>
            </p>
        </div>
    );
};

export default Register;
