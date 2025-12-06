import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../index.css';

function Subscribe() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('monthly'); // 'monthly' ou 'free'
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Se já tem assinatura, redireciona
    if (user?.hasSubscription) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Cria a sessão de checkout na Stripe
      const res = await axios.post(
        '/api/stripe/create-checkout-session',
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.data?.url) {
        // Redireciona para o checkout da Stripe
        window.location.href = res.data.url;
      } else {
        setError('Erro ao criar sessão de pagamento. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao criar checkout session:', err);
      setError(err.response?.data?.message || 'Erro ao processar pagamento. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card subscribe-card">
        <h1>Assinar Plano</h1>
        <p className="auth-subtitle">
          Desbloqueie todos os dias e cenários da plataforma
        </p>

        <div className="plans-container">
          {/* Plano Pago */}
          <div 
            className={`subscription-plan-card ${selectedPlan === 'monthly' ? 'selected' : ''}`}
            style={{ 
              border: selectedPlan === 'monthly' ? '2px solid rgba(96, 165, 250, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
              opacity: selectedPlan === 'monthly' ? 1 : 0.7,
              cursor: 'pointer'
            }}
            onClick={() => setSelectedPlan('monthly')}
          >
            <div className="plan-header">
              <h2>Plano Mensal</h2>
              <div className="plan-price">
                <span className="price-amount">R$ 20,00</span>
                <span className="price-period">/ mês</span>
              </div>
            </div>

            <ul className="plan-features">
              <li>✅ Acesso a todos os dias e cenários</li>
              <li>✅ Lições completas de memorização</li>
              <li>✅ Simulação de conversas</li>
              <li>✅ Suporte prioritário</li>
            </ul>

            {selectedPlan === 'monthly' && (
              <>
                {error && (
                  <div className="error-message" style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: '#ef4444' }}>
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubscribe(e);
                  }}
                  disabled={loading}
                  className="btn primary"
                  style={{ width: '100%', marginTop: 'auto', padding: '1rem' }}
                >
                  {loading ? 'Processando...' : 'Assinar Agora'}
                </button>

                <p className="plan-note" style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center' }}>
                  Pagamento seguro processado pela Stripe
                </p>
              </>
            )}
          </div>

          {/* Plano Free */}
          <div 
            className={`subscription-plan-card ${selectedPlan === 'free' ? 'selected' : ''}`}
            style={{ 
              border: selectedPlan === 'free' ? '2px solid rgba(96, 165, 250, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
              opacity: selectedPlan === 'free' ? 1 : 0.7,
              cursor: 'pointer'
            }}
            onClick={() => setSelectedPlan('free')}
          >
            <div className="plan-header">
              <h2 style={{ fontSize: '1.2rem' }}>Plano Free</h2>
              <div className="plan-price">
                <span className="price-amount" style={{ fontSize: '1.5rem' }}>Grátis</span>
              </div>
            </div>

            <ul className="plan-features">
              <li>✅ Acesso ao Dia 1</li>
              <li>✅ Cenários limitados</li>
              <li>✅ Lições básicas</li>
              <li>❌ Sem suporte prioritário</li>
            </ul>

            {selectedPlan === 'free' && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/');
                  }}
                  className="btn secondary"
                  style={{ width: '100%', marginTop: 'auto', padding: '1rem' }}
                >
                  Continuar com Plano Free
                </button>

                <p className="plan-note" style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center' }}>
                  Você poode atualizar seu plano depois
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Subscribe;

