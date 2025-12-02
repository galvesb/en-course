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
    <div className="auth-wrapper">
      <div className="auth-card profession-card">
        <div className="auth-header">
          <p className="auth-badge">Fluency2Work</p>
          <h1>Escolha sua trilha</h1>
          <p>Selecione a profissão para carregar os dias e cenários correspondentes.</p>
        </div>

        {loading && <p className="auth-info">Carregando profissões...</p>}
        {error && <p className="auth-error">{error}</p>}
        {!loading && !error && professions.length === 0 && (
          <p className="auth-info">
            Nenhuma profissão cadastrada ainda. Peça a um administrador para configurar em /api/professions.
          </p>
        )}

        <div className="profession-grid">
          {professions.map((p) => (
            <button
              key={p._id}
              type="button"
              className="profession-card-item"
              onClick={() => handleSelect(p)}
            >
              <span className="profession-icon">{p.icon || '🧑‍💼'}</span>
              <strong>{p.name}</strong>
              <small>{p.key}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectProfession;


