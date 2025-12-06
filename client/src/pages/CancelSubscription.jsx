import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../index.css';

function CancelSubscription() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Se não tem assinatura, redireciona
    if (user && !user.hasSubscription) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleCancelSubscription = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const res = await axios.post(
        '/api/stripe/cancel-subscription',
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.data?.hasSubscription === false) {
        setSuccess(true);
        
        // Atualiza o perfil do usuário
        if (refreshUser) {
          await refreshUser();
        }

        // Redireciona após 3 segundos
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        setError('Erro ao cancelar assinatura. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao cancelar assinatura:', err);
      setError(err.response?.data?.message || 'Erro ao cancelar assinatura. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card subscribe-card">
          <h1>Assinatura Cancelada</h1>
          <p className="auth-subtitle" style={{ color: '#60a5fa' }}>
            ✅ Sua assinatura foi cancelada com sucesso.
          </p>
          <p style={{ marginTop: '1rem', fontSize: '0.95rem', color: '#94a3b8' }}>
            Você será redirecionado para a página inicial...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card subscribe-card">
        <h1>Cancelar Assinatura</h1>
        <p className="auth-subtitle">
          Tem certeza que deseja cancelar sua assinatura?
        </p>

        <div className="cancel-warning-card" style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginTop: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ 
            marginTop: 0, 
            marginBottom: '1rem', 
            color: '#ef4444',
            fontSize: '1.1rem'
          }}>
            ⚠️ Atenção: Cancelamento Imediato
          </h3>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '1.5rem', 
            color: '#e2e8f0',
            fontSize: '0.95rem',
            lineHeight: '1.6'
          }}>
            <li>Você perderá o acesso imediato a todos os dias e cenários premium</li>
            <li>Apenas o Dia 1 permanecerá disponível (Plano Free)</li>
            <li>Não será possível reembolso do período restante do mês</li>
            <li>Para reativar sua assinatura, será necessário realizar um novo pagamento</li>
          </ul>
        </div>

        {error && (
          <div className="error-message" style={{ 
            marginBottom: '1.5rem', 
            padding: '0.75rem', 
            background: 'rgba(239, 68, 68, 0.1)', 
            borderRadius: '8px', 
            color: '#ef4444' 
          }}>
            {error}
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem' 
        }}>
          <button
            type="button"
            onClick={handleCancelSubscription}
            disabled={loading}
            className="btn danger"
            style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
          >
            {loading ? 'Cancelando...' : 'Sim, cancelar minha assinatura'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn secondary"
            style={{ width: '100%', padding: '1rem' }}
            disabled={loading}
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

export default CancelSubscription;

