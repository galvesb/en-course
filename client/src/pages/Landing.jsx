import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../index.css';

const Landing = () => {
    const { user } = useAuth();

    return (
        <div className="auth-wrapper" style={{ minHeight: '100vh', padding: 'clamp(32px, 8vw, 80px) clamp(24px, 6vw, 64px)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                {/* Hero Section */}
                <section style={{ textAlign: 'center', marginBottom: 'clamp(60px, 12vw, 120px)' }}>
                    <div className="auth-badge" style={{ marginBottom: '2rem' }}>
                        Fluency2Work
                    </div>
                    <h1 style={{ 
                        fontSize: 'clamp(2rem, 5vw, 3.5rem)', 
                        fontWeight: 800, 
                        lineHeight: 1.2, 
                        color: '#e2e8f0', 
                        margin: '0 0 1.5rem' 
                    }}>
                        Domine o Inglês Profissional
                        <span style={{ display: 'block', color: '#60a5fa' }}>
                            em Contextos Reais
                        </span>
                    </h1>
                    <p style={{ 
                        fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', 
                        color: 'rgba(226, 232, 240, 0.7)', 
                        maxWidth: '700px', 
                        margin: '0 auto 2.5rem',
                        lineHeight: 1.6 
                    }}>
                        Aprenda inglês através de simulações práticas de conversas profissionais.
                        Desenvolva fluência com cenários reais do seu trabalho.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {user ? (
                            <Link to="/" className="btn primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 600, minWidth: '160px' }}>
                                Acessar Plataforma
                            </Link>
                        ) : (
                            <>
                                <Link to="/register" className="btn primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 600, minWidth: '160px' }}>
                                    Começar Agora
                                </Link>
                                <Link to="/login" className="btn secondary" style={{ padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 600, minWidth: '160px' }}>
                                    Fazer Login
                                </Link>
                            </>
                        )}
                    </div>
                </section>

                {/* Features Section */}
                <section style={{ marginBottom: 'clamp(60px, 12vw, 120px)' }}>
                    <h2 style={{ 
                        fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', 
                        fontWeight: 700, 
                        color: '#e2e8f0', 
                        textAlign: 'center', 
                        margin: '0 0 clamp(40px, 8vw, 60px)' 
                    }}>
                        Por que escolher o Fluency2Work?
                    </h2>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                        gap: '1.5rem' 
                    }}>
                        <div className="auth-card" style={{ textAlign: 'center', padding: '2rem', transition: 'all 0.3s ease', cursor: 'pointer' }}
                             onMouseEnter={(e) => {
                                 e.currentTarget.style.transform = 'translateY(-4px)';
                                 e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.3)';
                             }}
                             onMouseLeave={(e) => {
                                 e.currentTarget.style.transform = 'translateY(0)';
                                 e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                             }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💼</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 0.75rem' }}>
                                Cenários Profissionais
                            </h3>
                            <p style={{ fontSize: '0.95rem', color: 'rgba(226, 232, 240, 0.7)', lineHeight: 1.6, margin: 0 }}>
                                Pratique conversas reais do seu ambiente de trabalho. 
                                Desde reuniões até negociações, aprenda o inglês que você realmente precisa.
                            </p>
                        </div>
                        <div className="auth-card" style={{ textAlign: 'center', padding: '2rem', transition: 'all 0.3s ease', cursor: 'pointer' }}
                             onMouseEnter={(e) => {
                                 e.currentTarget.style.transform = 'translateY(-4px)';
                                 e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.3)';
                             }}
                             onMouseLeave={(e) => {
                                 e.currentTarget.style.transform = 'translateY(0)';
                                 e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                             }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 0.75rem' }}>
                                Por Profissão
                            </h3>
                            <p style={{ fontSize: '0.95rem', color: 'rgba(226, 232, 240, 0.7)', lineHeight: 1.6, margin: 0 }}>
                                Conteúdo personalizado para sua área de atuação. 
                                Escolha sua profissão e aprenda o vocabulário específico do seu trabalho.
                            </p>
                        </div>
                        <div className="auth-card" style={{ textAlign: 'center', padding: '2rem', transition: 'all 0.3s ease', cursor: 'pointer' }}
                             onMouseEnter={(e) => {
                                 e.currentTarget.style.transform = 'translateY(-4px)';
                                 e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.3)';
                             }}
                             onMouseLeave={(e) => {
                                 e.currentTarget.style.transform = 'translateY(0)';
                                 e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                             }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗣️</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 0.75rem' }}>
                                Simulação de Conversas
                            </h3>
                            <p style={{ fontSize: '0.95rem', color: 'rgba(226, 232, 240, 0.7)', lineHeight: 1.6, margin: 0 }}>
                                Pratique diálogos interativos com feedback em tempo real. 
                                Aprenda a responder corretamente em situações profissionais.
                            </p>
                        </div>
                        <div className="auth-card" style={{ textAlign: 'center', padding: '2rem', transition: 'all 0.3s ease', cursor: 'pointer' }}
                             onMouseEnter={(e) => {
                                 e.currentTarget.style.transform = 'translateY(-4px)';
                                 e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.3)';
                             }}
                             onMouseLeave={(e) => {
                                 e.currentTarget.style.transform = 'translateY(0)';
                                 e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                             }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 0.75rem' }}>
                                Memorização Inteligente
                            </h3>
                            <p style={{ fontSize: '0.95rem', color: 'rgba(226, 232, 240, 0.7)', lineHeight: 1.6, margin: 0 }}>
                                Sistema de flashcards para memorizar palavras e frases importantes. 
                                Reforce seu aprendizado de forma eficiente.
                            </p>
                        </div>
                        <div className="auth-card" style={{ textAlign: 'center', padding: '2rem', transition: 'all 0.3s ease', cursor: 'pointer' }}
                             onMouseEnter={(e) => {
                                 e.currentTarget.style.transform = 'translateY(-4px)';
                                 e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.3)';
                             }}
                             onMouseLeave={(e) => {
                                 e.currentTarget.style.transform = 'translateY(0)';
                                 e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                             }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎧</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 0.75rem' }}>
                                Áudio Nativo
                            </h3>
                            <p style={{ fontSize: '0.95rem', color: 'rgba(226, 232, 240, 0.7)', lineHeight: 1.6, margin: 0 }}>
                                Ouça pronúncias corretas de todas as palavras e frases. 
                                Desenvolva sua compreensão auditiva e pronúncia.
                            </p>
                        </div>
                        <div className="auth-card" style={{ textAlign: 'center', padding: '2rem', transition: 'all 0.3s ease', cursor: 'pointer' }}
                             onMouseEnter={(e) => {
                                 e.currentTarget.style.transform = 'translateY(-4px)';
                                 e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.3)';
                             }}
                             onMouseLeave={(e) => {
                                 e.currentTarget.style.transform = 'translateY(0)';
                                 e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                             }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 0.75rem' }}>
                                Acompanhe seu Progresso
                            </h3>
                            <p style={{ fontSize: '0.95rem', color: 'rgba(226, 232, 240, 0.7)', lineHeight: 1.6, margin: 0 }}>
                                Visualize seu avanço através de dias e cenários completos. 
                                Mantenha-se motivado com seu desenvolvimento.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Plans Section */}
                <section style={{ marginBottom: 'clamp(60px, 12vw, 120px)' }}>
                    <h2 style={{ 
                        fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', 
                        fontWeight: 700, 
                        color: '#e2e8f0', 
                        textAlign: 'center', 
                        margin: '0 0 clamp(40px, 8vw, 60px)' 
                    }}>
                        Escolha seu Plano
                    </h2>
                    <div className="plans-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div className="subscription-plan-card">
                            <div className="plan-header">
                                <h2 style={{ fontSize: '1.5rem' }}>Plano Free</h2>
                                <div className="plan-price">
                                    <span className="price-amount" style={{ fontSize: '2rem' }}>Grátis</span>
                                </div>
                            </div>
                            <ul className="plan-features">
                                <li>✅ Acesso ao Dia 1</li>
                                <li>✅ Cenários limitados</li>
                                <li>✅ Lições básicas</li>
                                <li>✅ Simulação de conversas</li>
                            </ul>
                        </div>
                        <div className="subscription-plan-card selected">
                            <div className="plan-header">
                                <h2 style={{ fontSize: '1.5rem' }}>Plano Mensal</h2>
                                <div className="plan-price">
                                    <span className="price-amount">R$ 20,00</span>
                                    <span className="price-period">/ mês</span>
                                </div>
                            </div>
                            <ul className="plan-features">
                                <li>✅ Acesso a todos os dias e cenários</li>
                                <li>✅ Lições completas de memorização</li>
                                <li>✅ Simulação de conversas ilimitadas</li>
                                <li>✅ Suporte prioritário</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* CTA Final */}
                <section style={{ 
                    textAlign: 'center', 
                    padding: 'clamp(40px, 8vw, 80px) 0',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                    <h2 style={{ 
                        fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', 
                        fontWeight: 700, 
                        color: '#e2e8f0', 
                        margin: '0 0 1rem' 
                    }}>
                        Pronto para começar?
                    </h2>
                    <p style={{ 
                        fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', 
                        color: 'rgba(226, 232, 240, 0.7)', 
                        margin: '0 0 2rem',
                        maxWidth: '600px',
                        marginLeft: 'auto',
                        marginRight: 'auto'
                    }}>
                        Junte-se a milhares de profissionais que estão melhorando seu inglês com o Fluency2Work.
                    </p>
                    {!user && (
                        <Link to="/register" className="btn primary" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
                            Criar Conta Grátis
                        </Link>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Landing;

