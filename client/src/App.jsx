import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function MainApp() {
  const [courseStructure, setCourseStructure] = useState([]);
  const [lessonData, setLessonData] = useState({});
  const [stage, setStage] = useState('map');
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [currentRole, setCurrentRole] = useState(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [flashcardQueue, setFlashcardQueue] = useState([]);
  const [currentCardIndexInQueue, setCurrentCardIndexInQueue] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, []);

  // Carrega o progresso após os cursos serem carregados
  useEffect(() => {
    if (user && courseStructure.length > 0) {
      fetchUserProgress();
    }
  }, [user, courseStructure.length]);

  const fetchCourses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/courses');
      setCourseStructure(res.data);
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  };

  const fetchLessonData = async (key) => {
    if (lessonData[key]) return lessonData[key];
    try {
      const res = await axios.get(`http://localhost:5000/api/lessons/${key}`);
      const data = res.data;
      setLessonData(prev => ({ ...prev, [key]: data }));
      return data;
    } catch (err) {
      console.error("Error fetching lesson data:", err);
      return null;
    }
  };

  const fetchUserProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping progress fetch');
        return;
      }
      
      console.log('Fetching user progress...');
      const res = await axios.get('http://localhost:5000/api/progress', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { courseProgress } = res.data;
      console.log('Progress fetched:', courseProgress);
      
      if (courseProgress && courseProgress.length > 0) {
        // Aplica o progresso salvo à estrutura de cursos
        await applyProgressToCourses(courseProgress);
        console.log('Progress applied to courses');
      } else {
        console.log('No progress found for user');
      }
    } catch (err) {
      console.error("Error fetching user progress:", err);
      if (err.response?.status === 404) {
        console.log('Progress endpoint not found - server may need restart');
      }
    }
  };

  const applyProgressToCourses = async (savedProgress) => {
    console.log('Applying progress to courses:', savedProgress);
    
    // Primeiro, carrega todos os lessonData necessários
    const lessonKeysToLoad = new Set();
    savedProgress.forEach(savedDay => {
      const day = courseStructure.find(d => d.id === savedDay.id);
      if (!day) return;
      savedDay.scenarios?.forEach(savedScenario => {
        const scenario = day.scenarios.find(s => s.id === savedScenario.id);
        if (scenario?.lessonKey) {
          lessonKeysToLoad.add(scenario.lessonKey);
        }
      });
    });
    
    // Carrega todos os lessonData que ainda não foram carregados
    const loadPromises = Array.from(lessonKeysToLoad).map(key => {
      if (!lessonData[key]) {
        return fetchLessonData(key);
      }
      return Promise.resolve(lessonData[key]);
    });
    
    await Promise.all(loadPromises);
    
    // Agora aplica o progresso ao lessonData
    setLessonData(prev => {
      const updated = { ...prev };
      savedProgress.forEach(savedDay => {
        const day = courseStructure.find(d => d.id === savedDay.id);
        if (!day) return;
        
        savedDay.scenarios?.forEach(savedScenario => {
          const scenario = day.scenarios.find(s => s.id === savedScenario.id);
          if (!scenario || !scenario.lessonKey) return;
          
          const key = scenario.lessonKey;
          if (updated[key] && savedScenario.lessons) {
            const updatedData = { ...updated[key] };
            ['A', 'B', 'C'].forEach(role => {
              if (savedScenario.lessons[role] && updatedData[role]) {
                updatedData[role] = updatedData[role].map(lesson => {
                  const savedLesson = savedScenario.lessons[role].find(sl => sl.id === lesson.id);
                  if (savedLesson && savedLesson.completed) {
                    console.log(`✅ Marking lesson ${lesson.id} in role ${role} as completed`);
                    return { ...lesson, completed: true };
                  }
                  return lesson;
                });
              }
            });
            updated[key] = updatedData;
          }
        });
      });
      return updated;
    });
    
    // Depois atualiza o courseStructure
    setCourseStructure(prev => {
      return prev.map(day => {
        const savedDay = savedProgress.find(sd => sd.id === day.id);
        if (!savedDay) return day;
        
        return {
          ...day,
          scenarios: day.scenarios.map(scenario => {
            const savedScenario = savedDay.scenarios?.find(ss => ss.id === scenario.id);
            if (!savedScenario) return scenario;
            
            // Atualiza o status do cenário baseado nas lições completas
            const allLessonsCompleted = 
              savedScenario.lessons?.A?.length > 0 && savedScenario.lessons.A.every(l => l.completed) &&
              savedScenario.lessons?.B?.length > 0 && savedScenario.lessons.B.every(l => l.completed) &&
              savedScenario.lessons?.C?.length > 0 && savedScenario.lessons.C.every(l => l.completed);
            
            return {
              ...scenario,
              completed: allLessonsCompleted || savedScenario.completed || false
            };
          })
        };
      });
    });
  };

  const saveProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user) {
        console.warn('Cannot save progress: no token or user');
        return;
      }
      
      console.log('Saving progress...', { user: user.email, lessonDataKeys: Object.keys(lessonData) });
      
      // Prepara o progresso no formato esperado usando lessonData como fonte de verdade
      const progressData = courseStructure.map(day => ({
        id: day.id,
        title: day.title,
        scenarios: day.scenarios.map(scenario => {
          const key = scenario.lessonKey;
          const lessonDataForScenario = lessonData[key];
          
          const lessons = {
            A: [],
            B: [],
            C: []
          };
          
          // Usa lessonData como fonte de verdade
          if (lessonDataForScenario) {
            lessons.A = (lessonDataForScenario.A || []).map(lesson => ({
              id: lesson.id,
              completed: lesson.completed || false
            }));
            lessons.B = (lessonDataForScenario.B || []).map(lesson => ({
              id: lesson.id,
              completed: lesson.completed || false
            }));
            lessons.C = (lessonDataForScenario.C || []).map(lesson => ({
              id: lesson.id,
              completed: lesson.completed || false
            }));
          }
          
          // Determina se o cenário está completo
          const allLessonsCompleted = 
            lessons.A.every(l => l.completed) &&
            lessons.B.every(l => l.completed) &&
            lessons.C.every(l => l.completed);
          
          return {
            id: scenario.id,
            completed: allLessonsCompleted,
            lessons
          };
        })
      }));
      
      console.log('Progress data to save:', JSON.stringify(progressData, null, 2));
      
      const response = await axios.post('http://localhost:5000/api/progress', 
        { courseProgress: progressData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Progress saved successfully:', response.data);
    } catch (err) {
      console.error("Error saving progress:", err);
      if (err.response) {
        console.error("Response error:", err.response.data);
        console.error("Status:", err.response.status);
      }
    }
  };

  const renderMap = () => (
    <div id="map-container">
      <div className="day-path">
        {courseStructure.map((day, dIdx) => {
          const allScenariosCompleted = day.scenarios.every(s => s.completed);
          const statusClass = allScenariosCompleted ? 'completed' : 'active';
          const bubbleColor = allScenariosCompleted ? 'var(--gray-border)' : 'var(--duo-green-dark)';
          const borderColor = allScenariosCompleted ? '#9ca3af' : 'var(--duo-green-light)';
          const textColor = allScenariosCompleted ? '#4b5563' : '#fff';

          return (
            <React.Fragment key={day.id}>
              <div className="day-node" onClick={() => {
                setCurrentDayIndex(dIdx);
                setStage('day-scenarios');
              }}>
                <div className={`main-bubble ${statusClass}`}
                  style={{ background: bubbleColor, borderColor: borderColor, color: textColor }}>
                  📚
                </div>
                <p style={{ fontWeight: 600 }}>{day.title}</p>
              </div>
              {dIdx < courseStructure.length - 1 && <div></div>}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  const renderDayScenarios = () => {
    const day = courseStructure[currentDayIndex];
    return (
      <div className="card" style={{ marginTop: '20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>{day.title}</h2>
        <div id="scenarios-list" className="day-path" style={{ padding: 0, margin: 0, width: '100%', position: 'relative' }}>
          {day.scenarios.map((scenario, sIdx) => (
            <div key={scenario.id} className="day-node" onClick={() => {
              setCurrentScenarioIndex(sIdx);
              fetchLessonData(scenario.lessonKey);
              setStage('role-choice-lessons');
            }}>
              <div className={`scenario-bubble ${scenario.completed ? 'completed' : 'active'}`}>{scenario.icon}</div>
              <p style={{ fontWeight: 600, marginBottom: 0 }}>{scenario.name}</p>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '.9rem' }}>{scenario.completed ? 'COMPLETO' : 'PENDENTE'}</p>
            </div>
          ))}
        </div>
        <button className="btn ghost" onClick={() => setStage('map')}>Voltar aos Dias</button>
      </div>
    );
  };

  const renderRoleChoiceLessons = () => {
    const day = courseStructure[currentDayIndex];
    const scenario = day.scenarios[currentScenarioIndex];
    const key = scenario.lessonKey;
    const data = lessonData[key];

    if (!data) return <div className="card">Loading lessons...</div>;

    const lessonsA = data.A || [];
    const lessonsB = data.B || [];
    const conversationLesson = data.C ? data.C[0] : null;

    const allRoleALessonsCompleted = lessonsA.every(l => l.completed);
    const allRoleBLessonsCompleted = lessonsB.every(l => l.completed);
    const conversationIsActive = allRoleALessonsCompleted && allRoleBLessonsCompleted;

    return (
      <div className="card" style={{ marginTop: '20px' }}>
        <h2 style={{ textAlign: 'center' }}>{scenario.name}</h2>
        <h3 style={{ textAlign: 'center', marginTop: '-1rem', color: '#6b7280' }}>Escolha seu Papel e Treinamento</h3>
        <div id="lessons-list" className="day-path" style={{ padding: 0, margin: 0, width: '100%', position: 'relative' }}>

          <div className="day-node" onClick={() => { setCurrentRole('A'); setStage('flashcard-selector'); }} style={{ cursor: 'pointer' }}>
            <div className={`sub-bubble role-A ${allRoleALessonsCompleted ? 'completed' : 'active'}`}
              style={{ width: '80px', height: '80px', fontSize: '2rem' }}>👤</div>
            <p style={{ fontWeight: 600 }}>Pessoa A</p>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '.9rem' }}>{allRoleALessonsCompleted ? 'COMPLETO' : 'PENDENTE'}</p>
          </div>

          <div className="day-node" onClick={() => { setCurrentRole('B'); setStage('flashcard-selector'); }} style={{ cursor: 'pointer' }}>
            <div className={`sub-bubble role-B ${allRoleBLessonsCompleted ? 'completed' : 'active'}`}
              style={{ width: '80px', height: '80px', fontSize: '2rem' }}>👤</div>
            <p style={{ fontWeight: 600 }}>Pessoa B</p>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '.9rem' }}>{allRoleBLessonsCompleted ? 'COMPLETO' : 'PENDENTE'}</p>
          </div>

          <div className="day-node" onClick={() => {
            if (conversationIsActive || conversationLesson?.completed) {
              alert("Conversation simulator not fully implemented in this demo.");
            } else {
              alert('Complete as lições da Pessoa A e B primeiro!');
            }
          }}>
            <div className={`sub-bubble ${conversationLesson?.completed ? 'completed' : (conversationIsActive ? 'active' : '')}`}
              style={{ width: '80px', height: '80px', fontSize: '2rem' }}>🗣️</div>
            <p style={{ fontWeight: 600 }}>Simulação Completa</p>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '.9rem' }}>{conversationLesson?.completed ? 'COMPLETO' : 'PRONTO PARA INICIAR'}</p>
          </div>
        </div>
        <button className="btn ghost" onClick={() => setStage('day-scenarios')}>Voltar aos Cenários</button>
      </div>
    );
  };

  const renderFlashcardSelector = () => {
    const day = courseStructure[currentDayIndex];
    const scenario = day.scenarios[currentScenarioIndex];
    const key = scenario.lessonKey;
    const data = lessonData[key];
    const roleLessons = data[currentRole];
    const roleName = currentRole === 'A' ? 'Pessoa A' : 'Pessoa B';
    const roleClass = currentRole === 'A' ? 'role-A' : 'role-B';

    return (
      <div className="card" style={{ marginTop: '20px' }}>
        <h2 style={{ textAlign: 'center' }}>{scenario.name}</h2>
        <h3 style={{ textAlign: 'center', marginTop: '-1rem', color: currentRole === 'A' ? 'var(--duo-blue-dark)' : 'var(--duo-green-dark)' }}>{roleName} - Seleção de Lição</h3>
        <div id="lessons-list" className="day-path" style={{ padding: 0, margin: 0, width: '100%', position: 'relative' }}>
          {roleLessons.map((lesson, lIdx) => {
            const icon = lesson.type === 'words' ? '📖' : '💬';
            const nextLessonIndex = roleLessons.findIndex(l => !l.completed);
            const isActive = lIdx === nextLessonIndex;
            const statusClass = lesson.completed ? 'completed' : (isActive ? 'active' : '');
            // Quando completed, não adiciona roleClass para ficar cinza
            const bubbleClass = lesson.completed ? 'completed' : `${statusClass} ${roleClass}`;

            return (
              <div key={lesson.id} className="day-node" onClick={() => {
                if (isActive || lesson.completed) {
                  setCurrentLessonIndex(lIdx);
                  setFlashcardQueue(lesson.words || []);
                  setCurrentCardIndexInQueue(0);
                  setIsFlashcardFlipped(false);
                  setStage('flashcard');
                } else {
                  alert('Complete a lição anterior primeiro!');
                }
              }}>
                <div className={`sub-bubble ${bubbleClass}`} style={{ width: '60px', height: '60px', borderWidth: '4px' }}>{icon}</div>
                <p style={{ fontWeight: 500, color: lesson.completed ? '#6b7280' : '#1f2937' }}>{lesson.title}</p>
                {lesson.completed && <p style={{ margin: 0, color: '#6b7280', fontSize: '.8rem' }}>✓ Completo</p>}
              </div>
            );
          })}
        </div>
        <button className="btn ghost" onClick={() => setStage('role-choice-lessons')}>Voltar</button>
      </div>
    );
  };

  const renderFlashcard = () => {
    if (flashcardQueue.length === 0) return <div>No cards</div>;
    const card = flashcardQueue[currentCardIndexInQueue];

    const markAsKnown = async () => {
      if (currentCardIndexInQueue < flashcardQueue.length - 1) {
        setCurrentCardIndexInQueue(prev => prev + 1);
        setIsFlashcardFlipped(false);
      } else {
        // Marca a lição como completa
        const day = courseStructure[currentDayIndex];
        const scenario = day.scenarios[currentScenarioIndex];
        const key = scenario.lessonKey;
        
        // Prepara os dados atualizados ANTES de atualizar o estado
        const updatedLessonData = { ...lessonData };
        if (updatedLessonData[key] && updatedLessonData[key][currentRole]) {
          updatedLessonData[key] = {
            ...updatedLessonData[key],
            [currentRole]: updatedLessonData[key][currentRole].map((lesson, idx) => 
              idx === currentLessonIndex ? { ...lesson, completed: true } : lesson
            )
          };
        }
        
        // Atualiza o lessonData
        setLessonData(updatedLessonData);
        
        // Atualiza o courseStructure
        setCourseStructure(prev => {
          const updated = [...prev];
          const updatedDay = { ...updated[currentDayIndex] };
          const updatedScenarios = [...updatedDay.scenarios];
          const updatedScenario = { ...updatedScenarios[currentScenarioIndex] };
          
          if (updatedScenario.lessons && updatedScenario.lessons[currentRole]) {
            updatedScenario.lessons = {
              ...updatedScenario.lessons,
              [currentRole]: updatedScenario.lessons[currentRole].map((lesson, idx) =>
                idx === currentLessonIndex ? { ...lesson, completed: true } : lesson
              )
            };
          }
          
          updatedScenarios[currentScenarioIndex] = updatedScenario;
          updatedDay.scenarios = updatedScenarios;
          updated[currentDayIndex] = updatedDay;
          
          return updated;
        });
        
        // Salva o progresso IMEDIATAMENTE usando os dados preparados
        try {
          const token = localStorage.getItem('token');
          if (!token || !user) {
            console.warn('Cannot save: no token or user');
            alert("Lição Completa!");
            setStage('flashcard-selector');
            return;
          }
          
          // Prepara o progresso usando os dados atualizados
          const progressData = courseStructure.map(day => ({
            id: day.id,
            title: day.title,
            scenarios: day.scenarios.map(scenario => {
              const scenarioKey = scenario.lessonKey;
              const lessonDataForScenario = updatedLessonData[scenarioKey];
              
              const lessons = {
                A: [],
                B: [],
                C: []
              };
              
              if (lessonDataForScenario) {
                lessons.A = (lessonDataForScenario.A || []).map(lesson => ({
                  id: lesson.id,
                  completed: lesson.completed || false
                }));
                lessons.B = (lessonDataForScenario.B || []).map(lesson => ({
                  id: lesson.id,
                  completed: lesson.completed || false
                }));
                lessons.C = (lessonDataForScenario.C || []).map(lesson => ({
                  id: lesson.id,
                  completed: lesson.completed || false
                }));
              }
              
              const allLessonsCompleted = 
                lessons.A.length > 0 && lessons.A.every(l => l.completed) &&
                lessons.B.length > 0 && lessons.B.every(l => l.completed) &&
                lessons.C.length > 0 && lessons.C.every(l => l.completed);
              
              return {
                id: scenario.id,
                completed: allLessonsCompleted,
                lessons
              };
            })
          }));
          
          console.log('💾 Saving progress immediately after lesson completion...');
          console.log('Progress data:', JSON.stringify(progressData, null, 2));
          
          const response = await axios.post('http://localhost:5000/api/progress', 
            { courseProgress: progressData },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          console.log('✅ Progress saved successfully!', response.data);
          
          // Recarrega o progresso para garantir que está sincronizado
          setTimeout(() => {
            fetchUserProgress();
          }, 300);
        } catch (err) {
          console.error("❌ Error saving progress:", err);
          if (err.response) {
            console.error("Response error:", err.response.data);
            console.error("Status:", err.response.status);
          }
          // Não bloqueia o fluxo, apenas mostra erro no console
        }
        
        alert("Lição Completa!");
        setStage('flashcard-selector');
      }
    };

    // Adiciona esta função:
    const markAsUnknown = () => {
      // Se só existe 1 card, só reseta o flip
      if (flashcardQueue.length === 1) {
        setIsFlashcardFlipped(false);
        return;
      }
      // Move o card atual para o final
      setFlashcardQueue(prevQueue => {
        const updatedQueue = [...prevQueue];
        const [current] = updatedQueue.splice(currentCardIndexInQueue, 1);
        updatedQueue.push(current);
        return updatedQueue;
      });
      // NÃO avança currentCardIndex! Só reseta flip
      setIsFlashcardFlipped(false);
    };

    return (
      <div className="card" style={{ marginTop: '20px' }}>
        <h2 style={{ textAlign: 'center' }}>Flashcard</h2>
        <div className="flashcard-container">
          <div className="flashcard-progress">Card {currentCardIndexInQueue + 1} of {flashcardQueue.length}</div>
          <div className={`flashcard ${isFlashcardFlipped ? 'flipped' : ''}`} onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}>
            <div className="card-inner">
              <div className="card-front">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '1.8rem', marginBottom: '10px' }}>
                    {card.word}
                  </div>
                  <button className="audio-btn" title="Ouvir Pronúncia" onClick={(e) => { e.stopPropagation(); alert('Audio playing not implemented'); }}>🔊</button>
                </div>
              </div>
              <div className="card-back">
                <div style={{ fontWeight: 500, fontSize: '1.5rem', color: '#fff' }}>
                  {card.translation}
                </div>
              </div>
            </div>
          </div>

          {isFlashcardFlipped ? (
            <div className="flashcard-nav" style={{ flexDirection: 'column', width: '100%', maxWidth: '400px', gap: '15px' }}>
              <button className="btn primary" style={{ background: 'var(--duo-green-dark)' }} onClick={markAsKnown}>✅ SEI (Próximo)</button>
              <button className="btn secondary" style={{ color: 'var(--duo-blue-dark)' }} onClick={markAsUnknown}>🔄 NÃO SEI (Repetir)</button>
            </div>
          ) : (
            <div className="flashcard-nav" style={{ width: '100%', maxWidth: '400px' }}>
              <button className="btn primary" onClick={() => setIsFlashcardFlipped(true)}>REVELAR RESPOSTA</button>
            </div>
          )}

        </div>
        <button className="btn ghost" onClick={() => setStage('flashcard-selector')}>Voltar às Lições</button>
      </div>
    );
  };

  return (
    <>
      <header className="nav-header">
        <h1 id="header-title">Fluency2Work</h1>
        <div className="nav-header-icons">
          <div style={{ fontSize: '1.1rem' }}>❤️ 5</div>
          <div style={{ fontSize: '1.1rem' }}>🔥 10</div>
          <button className="hint-btn" style={{ color: 'white', fontSize: '1.8rem' }} onClick={() => setSettingsVisible(!settingsVisible)}>☰</button>
        </div>
      </header>

      <div id="settings-menu" className={`settings-menu ${settingsVisible ? 'visible' : ''}`} onClick={(e) => e.target.id === 'settings-menu' && setSettingsVisible(false)}>
        <div className="settings-menu-content">
          <h3>Configurações</h3>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1.5rem' }}>
            Usuário: {user?.name || user?.email} ({user?.role})
          </p>
          {user?.role === 'admin' && (
            <button className="btn primary" onClick={() => {
              setSettingsVisible(false);
              navigate('/admin');
            }}>
              Admin Dashboard
            </button>
          )}
          <button className="btn danger" style={{ marginTop: '1rem' }} onClick={() => {
            setSettingsVisible(false);
            logout();
            navigate('/login');
          }}>
            Sair
          </button>
          <button className="btn secondary" style={{ marginTop: '1rem' }} onClick={() => setSettingsVisible(false)}>
            Voltar
          </button>
        </div>
      </div>

      <div id="app" style={{ width: '100%', maxWidth: '800px', padding: '0 clamp(12px, 3.5vw, 32px)' }}>
        {courseStructure.length === 0 ? (
          <div className="card">
            <h2>Carregando...</h2>
            <p>Aguarde o carregamento dos dados do curso.</p>
          </div>
        ) : (
          <>
            {stage === 'map' && renderMap()}
            {stage === 'day-scenarios' && renderDayScenarios()}
            {stage === 'role-choice-lessons' && renderRoleChoiceLessons()}
            {stage === 'flashcard-selector' && renderFlashcardSelector()}
            {stage === 'flashcard' && renderFlashcard()}
          </>
        )}
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={
            <ProtectedRoute adminOnly={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <MainApp />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
