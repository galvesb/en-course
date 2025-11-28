import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';


const cleanStringForComparison = (str) => {
  if (!str) return '';
  let cleaned = str.toLowerCase();
  cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"’“”]/g, "");
  cleaned = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
};

function MainApp() {
  const [courseStructure, setCourseStructure] = useState([]);
  const [lessonData, setLessonData] = useState({});
  const [stage, setStage] = useState('map');
  const [simulacaoPapel, setSimulacaoPapel] = useState('A');
  const [simulacaoStep, setSimulacaoStep] = useState(0);
  const [simulacaoHistory, setSimulacaoHistory] = useState([]);
  const [simulacaoInput, setSimulacaoInput] = useState('');
  const [simulacaoHintVisible, setSimulacaoHintVisible] = useState(false);
  const [simulacaoUltimaErrada, setSimulacaoUltimaErrada] = useState(false);
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
              startSimulacaoChat();
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

  // Handler para entrar na simulação completa
  const startSimulacaoChat = () => {
    setStage('role');
  };

  const handleSimulacaoComplete = async () => {
    const day = courseStructure[currentDayIndex];
    const scenario = day.scenarios[currentScenarioIndex];
    const key = scenario.lessonKey;

    // Update local state
    const updatedLessonData = { ...lessonData };
    if (updatedLessonData[key] && updatedLessonData[key].C) {
      updatedLessonData[key].C[0].completed = true;
    }
    setLessonData(updatedLessonData);

    setCourseStructure(prev => {
      const updated = [...prev];
      const updatedDay = { ...updated[currentDayIndex] };
      const updatedScenarios = [...updatedDay.scenarios];
      const updatedScenario = { ...updatedScenarios[currentScenarioIndex] };

      if (updatedScenario.lessons && updatedScenario.lessons.C) {
        updatedScenario.lessons.C[0].completed = true;
      }

      updatedScenarios[currentScenarioIndex] = updatedScenario;
      updatedDay.scenarios = updatedScenarios;
      updated[currentDayIndex] = updatedDay;
      return updated;
    });

    // Save progress
    try {
      const token = localStorage.getItem('token');
      if (token && user) {
        // Re-use logic from saveProgress or call it directly if possible, 
        // but here we construct the data manually to be safe and quick
        // Actually, since we updated state, we can just call saveProgress() if it uses current state?
        // saveProgress uses courseStructure and lessonData state, but state updates are async.
        // So better to construct the payload manually here as done in renderFlashcard.

        // Construct payload similar to renderFlashcard logic
        const progressData = courseStructure.map((d, dIdx) => {
          if (dIdx !== currentDayIndex) {
            // Return existing structure for other days
            return {
              id: d.id,
              title: d.title,
              scenarios: d.scenarios.map(s => ({
                id: s.id,
                completed: s.completed,
                lessons: {
                  A: (lessonData[s.lessonKey]?.A || []).map(l => ({ id: l.id, completed: l.completed })),
                  B: (lessonData[s.lessonKey]?.B || []).map(l => ({ id: l.id, completed: l.completed })),
                  C: (lessonData[s.lessonKey]?.C || []).map(l => ({ id: l.id, completed: l.completed }))
                }
              }))
            };
          }

          return {
            id: d.id,
            title: d.title,
            scenarios: d.scenarios.map((s, sIdx) => {
              const sKey = s.lessonKey;
              const lData = (sIdx === currentScenarioIndex) ? updatedLessonData[sKey] : lessonData[sKey];

              const lessons = {
                A: (lData?.A || []).map(l => ({ id: l.id, completed: l.completed })),
                B: (lData?.B || []).map(l => ({ id: l.id, completed: l.completed })),
                C: (lData?.C || []).map(l => ({ id: l.id, completed: l.completed }))
              };

              const allCompleted =
                lessons.A.every(l => l.completed) &&
                lessons.B.every(l => l.completed) &&
                lessons.C.every(l => l.completed);

              return {
                id: s.id,
                completed: allCompleted,
                lessons
              };
            })
          };
        });

        await axios.post('http://localhost:5000/api/progress',
          { courseProgress: progressData },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Simulação completa salva!');
      }
    } catch (e) {
      console.error("Erro ao salvar simulação", e);
    }
  };

  const renderRoles = () => {
    const day = courseStructure[currentDayIndex];
    const scenario = day.scenarios[currentScenarioIndex];

    return (
      <div className="card" style={{ marginTop: '20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>{scenario.name} - Escolha seu Papel</h2>
        <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
          <button className="btn primary" style={{ flex: '1 1 200px', background: 'var(--duo-blue-dark)' }}
            onClick={() => { setCurrentRole('A'); setStage('chat'); }}>
            Pessoa A (Ex: Scrum Master)
          </button>
          <button className="btn primary" style={{ flex: '1 1 200px', background: 'var(--duo-green-dark)' }}
            onClick={() => { setCurrentRole('B'); setStage('chat'); }}>
            Pessoa B (Ex: Desenvolvedor)
          </button>
        </div>
        <button className="btn ghost" onClick={() => setStage('role-choice-lessons')}>Voltar</button>
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
            {stage === 'role' && renderRoles()}
            {stage === 'chat' && <SimulacaoChat
              scenario={courseStructure[currentDayIndex].scenarios[currentScenarioIndex]}
              conversationLesson={lessonData[courseStructure[currentDayIndex].scenarios[currentScenarioIndex].lessonKey]?.C?.[0]}
              role={currentRole}
              onBack={() => setStage('role')}
              onComplete={handleSimulacaoComplete}
            />}
          </>
        )}
      </div>
    </>
  );
}

function SimulacaoChat({ scenario, conversationLesson, role, onBack, onComplete }) {
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [lastWrong, setLastWrong] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [finished, setFinished] = useState(false);

  const audioRef = useRef(new Audio());
  const manualAudioRef = useRef(new Audio());
  const chatScrollRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const queueGenerationRef = useRef(0);

  // Use a ref to track the current scenario ID to prevent unnecessary resets
  const scenarioIdRef = useRef(scenario?.id);

  // Inicializa a conversa
  useEffect(() => {
    if (!scenario || !scenario.conversations) return;

    if (scenarioIdRef.current === scenario.id && history.length > 0) {
      return;
    }
    scenarioIdRef.current = scenario.id;

    const conv = scenario.conversations;
    setStep(0);
    setHistory([]);
    setInput('');
    setLastWrong(false);
    setFinished(false);

    // Reset audio state
    queueGenerationRef.current++;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    audioRef.current.pause();
    manualAudioRef.current.pause();

    if (role === 'B') {
      const first = conv.A?.[0];
      if (first) {
        pushMessage({ speaker: 'A', text: first.pergunta, audio: first.audio });
      }
    }
  }, [scenario?.id, role]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [history]);

  const processAudioQueue = async (generation) => {
    if (generation !== queueGenerationRef.current) return;
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const src = audioQueueRef.current.shift();

    try {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = src;

      await new Promise((resolve) => {
        // Se a geração mudar durante a espera, resolvemos imediatamente para sair
        const checkGen = () => {
          if (generation !== queueGenerationRef.current) {
            audioRef.current.pause();
            resolve();
            return true;
          }
          return false;
        };

        audioRef.current.onended = resolve;
        audioRef.current.onerror = resolve;

        audioRef.current.play().catch(() => {
          // Se der erro (ex: abort), resolve para tentar o próximo
          resolve();
        });
      });
    } catch (e) {
      console.error("Audio playback error", e);
    } finally {
      if (generation === queueGenerationRef.current) {
        processAudioQueue(generation);
      }
    }
  };

  const queueAudio = (src) => {
    if (!src) return;
    audioQueueRef.current.push(src);
    if (!isPlayingRef.current) {
      processAudioQueue(queueGenerationRef.current);
    }
  };

  const playAudioImmediate = (src) => {
    if (!src) return;

    // Pausa a fila principal temporariamente
    const wasPlaying = !audioRef.current.paused;
    audioRef.current.pause();

    manualAudioRef.current.pause();
    manualAudioRef.current.currentTime = 0;
    manualAudioRef.current.src = src;

    manualAudioRef.current.onended = () => {
      // Retoma a fila se estava tocando
      if (wasPlaying && queueGenerationRef.current === queueGenerationRef.current) {
        audioRef.current.play().catch(() => { });
      }
    };

    manualAudioRef.current.play().catch(e => console.error(e));
  };

  const pushMessage = (msg, playAudio = true) => {
    setHistory(prev => [...prev, msg]);
    if (msg.audio && playAudio) queueAudio(msg.audio);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const conv = scenario.conversations;
    const conversationScript = role === 'A' ? conv.A : conv.B;
    const ul = conversationScript[step];

    if (!ul) {
      setFinished(true);
      onComplete();
      return;
    }

    const expectedText = (role === 'A' ? ul.pergunta : ul.resposta) || '';
    const cleanedInput = cleanStringForComparison(input);
    const cleanedExpected = cleanStringForComparison(expectedText);

    if (cleanedInput === cleanedExpected) {
      setLastWrong(false);
      setInput('');

      // RESET AUDIO STATE ON NEW INTERACTION
      // Incrementa geração para matar loop anterior
      queueGenerationRef.current++;
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      audioRef.current.pause();
      manualAudioRef.current.pause();

      // Adiciona minha fala (SEM AUDIO)
      pushMessage({ speaker: role, text: input, audio: ul.audio || null }, false);

      // Resposta do outro
      const nextSpeaker = role === 'A' ? 'B' : 'A';
      const nextStepIndex = role === 'A' ? step : step + 1;
      const nextConversationScript = role === 'A' ? conv.B : conv.A;
      const rl = nextConversationScript[nextStepIndex];

      if (rl) {
        setTimeout(() => {
          pushMessage({ speaker: nextSpeaker, text: rl.pergunta || rl.resposta, audio: rl.audio });
        }, 500);
      }

      const nextStep = step + 1;
      setStep(nextStep);

      const isFinished = (role === 'A' && nextStep >= conv.A.length) || (role === 'B' && nextStep >= conv.B.length);
      if (isFinished) {
        setFinished(true);
        onComplete();
      }

    } else {
      setLastWrong(true);
    }
  };

  const playFullScript = async () => {
    const conv = scenario.conversations;
    const maxLen = Math.max(conv.A.length, conv.B.length);

    // Reset queue for full script
    queueGenerationRef.current++;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    audioRef.current.pause();

    for (let i = 0; i < maxLen; i++) {
      if (conv.A[i]?.audio) queueAudio(conv.A[i].audio);
      if (conv.B[i]?.audio) queueAudio(conv.B[i].audio);
    }
  };

  const revealAll = () => {
    document.querySelectorAll('.hidden-text').forEach(el => el.classList.add('revealed'));
  };

  const hideAll = () => {
    document.querySelectorAll('.hidden-text').forEach(el => el.classList.remove('revealed'));
  };

  if (!scenario || !scenario.conversations) return <div>Carregando...</div>;

  const conv = scenario.conversations;
  const currentScript = role === 'A' ? conv.A : conv.B;
  const currentLine = currentScript[step];
  const hintText = currentLine ? (role === 'A' ? currentLine.pergunta : currentLine.resposta) : '';
  const hintAudio = currentLine ? currentLine.audio : '';

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <h2>{scenario.name} - Simulação de Conversa</h2>

      <div className="chat-scroll" ref={chatScrollRef}>
        {history.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.speaker === role ? 'flex-end' : 'flex-start' }}>
            <div className={`chat-bubble ${msg.speaker === 'A' ? 'bubble-a' : 'bubble-b'}`}>
              <p style={{ margin: 0 }}>
                <span className="hidden-text" title="Clique para revelar" onClick={(e) => e.target.classList.toggle('revealed')}>
                  {msg.text}
                </span>
              </p>
              {msg.audio && <audio controls src={msg.audio} />}
            </div>
          </div>
        ))}
      </div>

      {finished ? (
        <div style={{ textAlign: 'center', color: '#6b7280', marginBottom: '1rem' }}>Fim da conversa 🎉</div>
      ) : (
        <>
          <div className="input-group" style={{ flexWrap: 'nowrap', marginTop: '.5rem' }}>
            <input
              type="text"
              placeholder="Digite a resposta correta..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className={lastWrong ? 'error-input' : ''}
            />
            <button className="hint-btn"
              title="Mostrar sugestão"
              onClick={() => setHintVisible(!hintVisible)}
              onMouseEnter={() => setHintVisible(true)}
              onMouseLeave={() => setHintVisible(false)}
            >👁</button>
            <button className="audio-btn" title="Ouvir próxima fala" onClick={() => playAudioImmediate(hintAudio)}>🔊</button>
            <button className="btn primary" style={{ width: 'auto', flex: '0 0 auto' }} onClick={handleSend}>Enviar</button>

            <div className="hint-bubble" style={{ display: hintVisible ? 'block' : 'none' }}>
              {hintText}
            </div>
          </div>
          {lastWrong && <p style={{ color: '#ef4444', margin: '-10px 0 10px 0', textAlign: 'center', fontWeight: 600 }}>❌ Resposta incorreta. Corrija e envie novamente!</p>}
        </>
      )}

      <div className="toolbar">
        <button className="btn secondary" onClick={onBack}>📚 Voltar ao Cenário</button>
        <button className="btn secondary" onClick={playFullScript}>🎧 Tocar roteiro</button>
        <button className="btn secondary" onClick={revealAll}>👁️ Revelar tudo</button>
        <button className="btn secondary" onClick={hideAll}>🙈 Ocultar tudo</button>
      </div>
    </div>
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
