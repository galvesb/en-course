import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SelectProfession = () => {
  const [professions, setProfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await axios.get('/api/professions');
        setProfessions(res.data || []);
      } catch (err) {
        console.error('Error fetching professions', err);
        setError('Erro ao carregar profissões. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSelect = (profession) => {
    if (!profession) return;
    // salva escolha localmente
    localStorage.setItem('selectedProfessionKey', profession.key);
    localStorage.setItem('selectedProfessionName', profession.name);
    if (profession.icon) {
      localStorage.setItem('selectedProfessionIcon', profession.icon);
    } else {
      localStorage.removeItem('selectedProfessionIcon');
    }
    navigate('/');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="card" style={{ marginTop: '40px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Selecione sua profissão</h2>
      <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '.9rem', marginBottom: '1.5rem' }}>
        Escolha a profissão (em inglês) para ver os dias e cenários de aula específicos daquela área.
      </p>

      {loading && (
        <p style={{ textAlign: 'center' }}>Carregando profissões...</p>
      )}

      {error && (
        <p style={{ textAlign: 'center', color: '#ef4444' }}>{error}</p>
      )}

      {!loading && !error && professions.length === 0 && (
        <p style={{ textAlign: 'center', color: '#6b7280' }}>
          Nenhuma profissão cadastrada ainda. Peça a um administrador para configurar em /api/professions.
        </p>
      )}

      <div className="day-path" style={{ justifyContent: 'center' }}>
        {professions.map((p) => (
          <div
            key={p._id}
            className="day-node"
            style={{ cursor: 'pointer' }}
            onClick={() => handleSelect(p)}
          >
            <div
              className="main-bubble active"
              style={{
                background: 'var(--duo-green-dark)',
                borderColor: 'var(--duo-green-light)',
                color: '#fff',
                fontSize: '2rem'
              }}
            >
              {p.icon || '🧑‍💼'}
            </div>
            <p style={{ fontWeight: 600 }}>{p.name}</p>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '.85rem' }}>
              key: {p.key}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectProfession;


