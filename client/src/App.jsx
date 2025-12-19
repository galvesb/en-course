import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import SelectProfession from './pages/SelectProfession';
import Subscribe from './pages/Subscribe';
import CancelSubscription from './pages/CancelSubscription';
import Landing from './pages/Landing';


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
  const [toast, setToast] = useState(null); // { message: string, type: 'success' | 'error' }
  const toastTimerRef = useRef(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [currentRole, setCurrentRole] = useState(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [flashcardQueue, setFlashcardQueue] = useState([]);
  const [currentCardIndexInQueue, setCurrentCardIndexInQueue] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [temporarySubscriptionAccess, setTemporarySubscriptionAccess] = useState(false); // Liberação temporária ao clicar em pagar
  const [reviews, setReviews] = useState([]); // Lista de revisões pendentes
  const flashcardActionsRef = useRef({ know: null, dontKnow: null, back: null });
  const flashcardAudioRef = useRef(null);
  const stripeCheckDoneRef = useRef(false); // Flag para evitar múltiplas chamadas na mesma sessão
  const temporaryAccessTimerRef = useRef(null); // Timer de 5 minutos para liberação temporária
  const temporaryAccessStartTimeRef = useRef(null); // Timestamp de quando começou a liberação temporária

  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Função para mostrar toast
  const showToast = (message, type = 'success') => {
    // Limpa timer anterior se existir
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    
    setToast({ message, type });
    
    // Remove o toast após 1 segundo
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2500);
  };

  // Cleanup do timer ao desmontar
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Garante que o usuário tenha escolhido uma profissão antes de carregar os cursos
    const professionKey = localStorage.getItem('selectedProfessionKey');
    if (!professionKey) {
      navigate('/profession');
      return;
    }
    fetchCourses(professionKey);

    // Cleanup: limpa timer de acesso temporário ao desmontar
    return () => {
      if (temporaryAccessTimerRef.current) {
        clearTimeout(temporaryAccessTimerRef.current);
        temporaryAccessTimerRef.current = null;
      }
      temporaryAccessStartTimeRef.current = null;
    };
  }, []);

  // Verifica parâmetros de URL ao carregar (retorno do pagamento)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      console.log('✅ Pagamento bem-sucedido! Verificando assinatura...');
      // Remove o parâmetro da URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Verifica assinatura imediatamente
      if (user?.email) {
        stripeCheckDoneRef.current = false;
        const checkSubscription = async () => {
          try {
            const res = await axios.get('/api/stripe/check-subscription');
            if (res.data?.hasSubscription && refreshUser) {
              await refreshUser();
              // Remove acesso temporário se confirmado
              setTemporarySubscriptionAccess(false);
              if (temporaryAccessTimerRef.current) {
                clearTimeout(temporaryAccessTimerRef.current);
                temporaryAccessTimerRef.current = null;
              }
              temporaryAccessStartTimeRef.current = null;
              
              // Recarrega cursos
              const professionKey = localStorage.getItem('selectedProfessionKey');
              if (professionKey) {
                fetchCourses(professionKey);
              }
            }
          } catch (err) {
            console.error('Erro ao verificar assinatura após pagamento:', err);
          }
        };
        checkSubscription();
      }
    }
  }, [user?.email, refreshUser]);

  // Verifica assinatura Stripe quando o usuário acessa a rota raiz (/)
  useEffect(() => {
    if (!user || !user.email) {
      return;
    }

    // Sempre verifica quando a página carrega (permite verificação ao voltar da Stripe)
    const checkStripeSubscription = async () => {
      try {
        const res = await axios.get('/api/stripe/check-subscription');
        if (res.data?.hasSubscription !== undefined && refreshUser) {
          const previousStatus = user?.hasSubscription;
          
          // Atualiza o perfil do usuário após verificar a Stripe
          await refreshUser();
          
          // Se confirmou o pagamento (status mudou de false para true), recarrega cursos
          if (!previousStatus && res.data.hasSubscription) {
            console.log('✅ Pagamento confirmado! Recarregando cursos...');
            const professionKey = localStorage.getItem('selectedProfessionKey');
            if (professionKey) {
              fetchCourses(professionKey);
            }
            // Remove acesso temporário e limpa o timer se o pagamento foi confirmado
            setTemporarySubscriptionAccess(false);
            if (temporaryAccessTimerRef.current) {
              clearTimeout(temporaryAccessTimerRef.current);
              temporaryAccessTimerRef.current = null;
            }
            temporaryAccessStartTimeRef.current = null;
          }
          // NOTA: Não remove acesso temporário aqui se não tiver assinatura
          // O acesso temporário só será removido após 5 minutos ou se confirmar pagamento
        }
      } catch (err) {
        console.error('Erro ao verificar assinatura Stripe:', err);
        // Em caso de erro, mantém acesso temporário se existir
      }
    };

    // Verifica imediatamente ao montar
    checkStripeSubscription();

    // Verifica quando a janela recebe foco (usuário volta da Stripe)
    const handleFocus = () => {
      // Verifica se tem acesso temporário usando a função de setState
      setTemporarySubscriptionAccess(current => {
        if (current) {
          console.log('🔄 Usuário voltou da Stripe. Verificando pagamento...');
          checkStripeSubscription();
        }
        return current; // Mantém o estado atual
      });
    };

    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]); // Executa quando o email muda ou quando o componente monta

  // Polling durante acesso temporário: verifica assinatura a cada 10 segundos enquanto tem acesso temporário
  useEffect(() => {
    if (!temporarySubscriptionAccess || !user?.email) {
      return;
    }

    // Verifica se ainda está dentro dos 5 minutos
    const checkIfStillInTimeWindow = () => {
      if (!temporaryAccessStartTimeRef.current) return false;
      const elapsed = Date.now() - temporaryAccessStartTimeRef.current;
      return elapsed < 5 * 60 * 1000; // 5 minutos
    };

    const pollSubscription = async () => {
      // Só verifica se ainda está dentro da janela de 5 minutos
      if (!checkIfStillInTimeWindow()) {
        return;
      }

      try {
        const res = await axios.get('/api/stripe/check-subscription');
        if (res.data?.hasSubscription && refreshUser) {
          const previousStatus = user?.hasSubscription;
          await refreshUser();
          
          // Se confirmou o pagamento, remove acesso temporário e limpa timer
          if (!previousStatus && res.data.hasSubscription) {
            console.log('✅ Pagamento confirmado durante polling! Mantendo acesso permanente.');
            setTemporarySubscriptionAccess(false);
            if (temporaryAccessTimerRef.current) {
              clearTimeout(temporaryAccessTimerRef.current);
              temporaryAccessTimerRef.current = null;
            }
            temporaryAccessStartTimeRef.current = null;
            
            // Recarrega cursos para garantir que está tudo atualizado
            const professionKey = localStorage.getItem('selectedProfessionKey');
            if (professionKey) {
              fetchCourses(professionKey);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao verificar assinatura durante polling:', err);
      }
    };

    // Verifica imediatamente
    pollSubscription();

    // Configura polling a cada 10 segundos
    const pollingInterval = setInterval(() => {
      if (checkIfStillInTimeWindow()) {
        pollSubscription();
      } else {
        // Se passou dos 5 minutos, para o polling (o timer vai lidar com a remoção)
        clearInterval(pollingInterval);
      }
    }, 10000); // 10 segundos

    // Cleanup
    return () => {
      clearInterval(pollingInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temporarySubscriptionAccess, user?.email]); // Executa quando tem acesso temporário

useEffect(() => {
  if (stage === 'flashcard') {
    document.body.classList.add('flashcard-screen');
  } else {
    document.body.classList.remove('flashcard-screen');
  }
  return () => document.body.classList.remove('flashcard-screen');
}, [stage]);

  // Carrega o progresso após os cursos serem carregados
  useEffect(() => {
    if (user && courseStructure.length > 0) {
      fetchUserProgress();
    }
  }, [user, courseStructure.length]);

  // Carrega revisões quando o stage for 'reviews'
  useEffect(() => {
    if (stage === 'reviews' && user && courseStructure.length > 0) {
      console.log('Carregando revisões - courseStructure já carregado');
      fetchReviews();
    } else if (stage === 'reviews' && user && courseStructure.length === 0) {
      console.log('Aguardando courseStructure carregar antes de buscar revisões...');
      // Se os cursos ainda não foram carregados, tenta carregar
      const professionKey = localStorage.getItem('selectedProfessionKey');
      if (professionKey) {
        fetchCourses(professionKey).then(() => {
          fetchReviews();
        });
      }
    }
  }, [stage, user, courseStructure.length]);

  const fetchCourses = async (professionKeyParam) => {
    try {
      const key = professionKeyParam || localStorage.getItem('selectedProfessionKey');
      if (!key) {
        console.warn('No profession selected, redirecting to /profession');
        navigate('/profession');
        return;
      }

      const res = await axios.get(`/api/courses?professionKey=${encodeURIComponent(key)}`);
      setCourseStructure(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate('/login');
      } else {
        console.error("Error fetching courses:", err);
      }
    }
  };

  const fetchLessonData = async (key) => {
    if (lessonData[key]) return lessonData[key];
    try {
      const res = await axios.get(`/api/lessons/${key}`);
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

      const professionKey = localStorage.getItem('selectedProfessionKey');
      if (!professionKey) {
        console.log('No professionKey found, skipping progress fetch');
        return;
      }

      console.log('Fetching user progress for professionKey:', professionKey);
      const url = `/api/progress?professionKey=${encodeURIComponent(professionKey)}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const courseProgress = res.data.courseProgress || [];
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

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping reviews fetch');
        return;
      }

      const professionKey = localStorage.getItem('selectedProfessionKey');
      if (!professionKey) {
        console.log('No professionKey found, skipping reviews fetch');
        return;
      }

      console.log('Fetching reviews for professionKey:', professionKey);
      const url = `/api/progress/reviews?professionKey=${encodeURIComponent(professionKey)}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const reviewsData = res.data.reviews || [];
      console.log('Reviews fetched:', reviewsData);
      console.log('Number of reviews:', reviewsData.length);
      console.log('Reviews data structure:', JSON.stringify(reviewsData, null, 2));
      setReviews(reviewsData);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setReviews([]);
    }
  };

  const completeReview = async (courseId, scenarioId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Erro: não autenticado', 'error');
        return;
      }

      const professionKey = localStorage.getItem('selectedProfessionKey');
      if (!professionKey) {
        showToast('Erro: profissão não selecionada', 'error');
        return;
      }

      // Usa courseId e scenarioId para encontrar a revisão no backend
      const url = `/api/progress/reviews/0/complete`; // O índice não importa mais, usamos courseId e scenarioId
      await axios.post(url, { 
        professionKey,
        courseId,
        scenarioId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast('Revisão concluída! Próxima revisão agendada.', 'success');
      
      // Recarrega as revisões
      await fetchReviews();
      
      // Se não há mais revisões, volta para o mapa
      const updatedReviews = reviews.filter(r => 
        !(r.courseId === courseId && r.scenarioId === scenarioId)
      );
      if (updatedReviews.length === 0) {
        setStage('map');
      }
    } catch (err) {
      console.error("Error completing review:", err);
      showToast('Erro ao concluir revisão', 'error');
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
                  if (savedLesson) {
                    // console.log(`✅ Restoring lesson ${lesson.id} in role ${role}`);
                    return {
                      ...lesson,
                      completed: savedLesson.completed || false,
                      completedRoles: savedLesson.completedRoles || []
                    };
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
            // Agora considera: lições regulares de A e B + simulações de A e B
            const allRegularLessonsACompleted = savedScenario.lessons?.A?.length > 0 && savedScenario.lessons.A.every(l => l.completed);
            const allRegularLessonsBCompleted = savedScenario.lessons?.B?.length > 0 && savedScenario.lessons.B.every(l => l.completed);
            
            // Verifica se as simulações de A e B foram completadas (via completedRoles no C)
            const conversationLesson = savedScenario.lessons?.C?.[0];
            const completedRoles = conversationLesson?.completedRoles || [];
            const simulationACompleted = completedRoles.includes('A');
            const simulationBCompleted = completedRoles.includes('B');
            
            const allLessonsCompleted =
              allRegularLessonsACompleted &&
              allRegularLessonsBCompleted &&
              simulationACompleted &&
              simulationBCompleted;

            return {
              ...scenario,
              completed: allLessonsCompleted || savedScenario.completed || false
            };
          })
        };
      });
    });
  };

  const buildProgressSnapshot = (coursesSource, lessonsSource) => {
    if (!Array.isArray(coursesSource)) return [];

    return coursesSource.map(day => ({
      id: day.id,
      title: day.title,
      scenarios: day.scenarios.map(scenario => {
        const key = scenario.lessonKey;
        const lessonDataForScenario = lessonsSource?.[key];

        const lessons = {
          A: [],
          B: [],
          C: []
        };

        if (lessonDataForScenario) {
          lessons.A = (lessonDataForScenario.A || []).map(lesson => ({
            id: lesson.id,
            completed: !!lesson.completed
          }));
          lessons.B = (lessonDataForScenario.B || []).map(lesson => ({
            id: lesson.id,
            completed: !!lesson.completed
          }));
          lessons.C = (lessonDataForScenario.C || []).map(lesson => ({
            id: lesson.id,
            completed: !!lesson.completed,
            completedRoles: lesson.completedRoles || []
          }));
        }

        // Verifica completude: lições regulares de A e B + simulações de A e B
        const allRegularLessonsACompleted = lessons.A.every(l => l.completed);
        const allRegularLessonsBCompleted = lessons.B.every(l => l.completed);
        const conversationLesson = lessons.C?.[0];
        const completedRoles = conversationLesson?.completedRoles || [];
        const simulationACompleted = completedRoles.includes('A');
        const simulationBCompleted = completedRoles.includes('B');
        
        const allLessonsCompleted =
          allRegularLessonsACompleted &&
          allRegularLessonsBCompleted &&
          simulationACompleted &&
          simulationBCompleted;

        return {
          id: scenario.id,
          completed: allLessonsCompleted,
          lessons
        };
      })
    }));
  };

  const saveProgress = async ({ lessonsOverride, courseStructureOverride } = {}) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user) {
        console.warn('Cannot save progress: no token or user');
        return;
      }

      const lessonsSource = lessonsOverride || lessonData;
      const coursesSource = courseStructureOverride || courseStructure;

      console.log('Saving progress...', { user: user.email, lessons: Object.keys(lessonsSource || {}) });

      const progressData = buildProgressSnapshot(coursesSource, lessonsSource);
      const professionKey = localStorage.getItem('selectedProfessionKey');
      
      if (!professionKey) {
        console.warn('Cannot save progress: no professionKey selected');
        return;
      }
      
      console.log('Progress data to save:', JSON.stringify(progressData, null, 2));
      console.log('Saving for professionKey:', professionKey);

      const response = await axios.post('/api/progress',
        { 
          courseProgress: progressData, 
          professionKey: professionKey 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Progress saved successfully:', response.data);

      // Recarrega as revisões após salvar o progresso para atualizar a lista
      // Aguarda um pouco para garantir que o backend processou a atualização
      setTimeout(async () => {
        await fetchReviews();
        console.log('✅ Revisões recarregadas após salvar progresso');
      }, 1000);

      // Verifica se há uma revisão pendente para o cenário atual e se foi completado
      if (currentDayIndex !== null && currentScenarioIndex !== null) {
        const day = coursesSource[currentDayIndex];
        const scenario = day?.scenarios?.[currentScenarioIndex];
        
        if (day && scenario) {
          // Verifica se o cenário foi completado
          const scenarioProgress = progressData.find(c => c.id === day.id)?.scenarios?.find(s => s.id === scenario.id);
          if (scenarioProgress?.completed) {
            // Aguarda um pouco para garantir que as revisões foram atualizadas
            setTimeout(async () => {
              await fetchReviews();
              // Verifica se há uma revisão pendente para este cenário
              const updatedReviews = await axios.get(`/api/progress/reviews?professionKey=${encodeURIComponent(professionKey)}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              const pendingReview = updatedReviews.data.reviews?.find(r => 
                r.courseId === day.id && r.scenarioId === scenario.id
              );
              
              if (pendingReview) {
                // Marca a revisão como concluída automaticamente
                console.log('Cenário completado durante revisão, marcando revisão como concluída...');
                await completeReview(day.id, scenario.id);
              }
            }, 500);
          }
        }
      }
    } catch (err) {
      console.error("Error saving progress:", err);
      if (err.response) {
        console.error("Response error:", err.response.data);
        console.error("Status:", err.response.status);
      }
    }
  };

  // Considera assinatura ativa se: tem assinatura confirmada OU tem acesso temporário (clicou para pagar)
  const subscriptionActive = !!user?.hasSubscription || temporarySubscriptionAccess;

  const handleDaySelection = (dayIndex) => {
    const day = courseStructure[dayIndex];
    if (!day) return;
    if (day.locked && !subscriptionActive) {
      showToast('Este dia está disponível apenas para assinantes.', 'error');
      return;
    }
    setCurrentDayIndex(dayIndex);
    setStage('day-scenarios');
  };

  const renderLockedCard = (title = 'Conteúdo bloqueado') => (
    <div className="card scenario-card trail-card locked-card">
      <h2>{title}</h2>
      <p className="trail-subtitle">Este conteúdo está disponível apenas para assinantes.</p>
      <ul className="locked-list">
        <li>Dia 1 liberado no plano gratuito</li>
        <li>Assinantes acessam todos os dias e cenários</li>
      </ul>
    </div>
  );

  const renderMap = () => (
    <div className="card scenario-card trail-card">
      <h2>Mapa da jornada</h2>
      <p className="trail-subtitle">
        Selecione o dia desejado e avance pelos cenários da sua trilha.
      </p>
      {!subscriptionActive && (
        <div className="subscription-banner">
          <strong>Plano Free:</strong> apenas o Dia 1 está liberado.{' '}
          <Link
            className="subscription-inline-link"
            to="/subscribe"
            onClick={() => {
              // Ao clicar no link, libera temporariamente o conteúdo por 5 minutos
              console.log('🔓 Liberando conteúdo temporariamente por 5 minutos...');
              
              // Marca o início da liberação temporária
              temporaryAccessStartTimeRef.current = Date.now();
              setTemporarySubscriptionAccess(true);
              
              // Atualiza os cursos localmente para desbloquear tudo instantaneamente
              setCourseStructure(prevCourses => 
                prevCourses.map(course => ({
                  ...course,
                  locked: false // Desbloqueia todos os cursos
                }))
              );
              
              // Limpa timer anterior se existir
              if (temporaryAccessTimerRef.current) {
                clearTimeout(temporaryAccessTimerRef.current);
              }
              
              // Configura timer de 5 minutos para remover acesso temporário
              temporaryAccessTimerRef.current = setTimeout(() => {
                console.log('⏰ 5 minutos expirados. Verificando assinatura final...');
                
                // Verifica uma última vez se tem assinatura
                const checkFinalSubscription = async () => {
                  try {
                    const res = await axios.get('/api/stripe/check-subscription');
                    if (res.data?.hasSubscription && refreshUser) {
                      await refreshUser();
                      // Se tem assinatura, mantém acesso
                      console.log('✅ Assinatura confirmada! Mantendo acesso.');
                      return;
                    }
                  } catch (err) {
                    console.error('Erro ao verificar assinatura final:', err);
                  }
                  
                  // Se não tem assinatura, remove acesso temporário
                  if (!user?.hasSubscription) {
                    console.log('❌ Sem assinatura confirmada. Removendo acesso temporário.');
                    setTemporarySubscriptionAccess(false);
                    
                    // Recarrega cursos para bloquear novamente
                    const professionKey = localStorage.getItem('selectedProfessionKey');
                    if (professionKey) {
                      fetchCourses(professionKey);
                    }
                  }
                };
                
                checkFinalSubscription();
                temporaryAccessTimerRef.current = null;
                temporaryAccessStartTimeRef.current = null;
              }, 5 * 60 * 1000); // 5 minutos
              
              // Resetar flag para permitir verificação quando voltar
              stripeCheckDoneRef.current = false;
            }}
          >
            Assine para desbloquear todas as aulas.
          </Link>
        </div>
      )}
      <div className="day-path map-trail">
        {courseStructure.map((day, dIdx) => {
          const completedScenarios = day.scenarios.filter(s => s.completed).length;
          const allScenariosCompleted = completedScenarios === day.scenarios.length && day.scenarios.length > 0;
          const isActiveDay = dIdx === currentDayIndex;

          return (
            <React.Fragment key={day.id}>
              <div
                className={`day-node ${day.locked ? 'locked' : ''}`}
                onClick={() => handleDaySelection(dIdx)}
              >
                <div className={`main-bubble ${allScenariosCompleted ? 'completed' : (isActiveDay ? 'active' : '')}`}>
                  {day.title.replace(/\D/g, '')}
                </div>
                <p className="scenario-name">{day.title}</p>
                <p className="scenario-meta-trail">
                  {day.locked && !subscriptionActive
                    ? 'Indisponível para o plano Free'
                    : `${completedScenarios}/${day.scenarios.length} cenários completos`}
                </p>
              </div>
              {dIdx !== courseStructure.length - 1 && <div />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  const renderDayScenarios = () => {
    const day = courseStructure[currentDayIndex];
    if (!day) return null;

    if (day.locked && !subscriptionActive) {
      return renderLockedCard(day.title);
    }

    return (
      <div className="card scenario-card trail-card">
        <h2>{day.title}</h2>
        <p className="trail-subtitle">Selecione o cenário para continuar a trilha.</p>

        <div className="day-path scenario-trail">
          {day.scenarios.map((scenario, sIdx) => (
            <React.Fragment key={scenario.id}>
              <div
                className="day-node"
                onClick={() => {
                  setCurrentScenarioIndex(sIdx);
                  fetchLessonData(scenario.lessonKey);
                  setStage('role-choice-lessons');
                }}
              >
                <div className={`scenario-bubble ${scenario.completed ? 'completed' : ''}`}>
                  {scenario.icon || '🎯'}
                </div>
                <p className="scenario-name">{scenario.name}</p>
                <p className="scenario-meta-trail">
                  {scenario.completed ? 'Concluído' : (scenario.description || 'Disponível para praticar')}
                </p>
              </div>
              {sIdx !== day.scenarios.length - 1 && <div />}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderRoleChoiceLessons = () => {
    const day = courseStructure[currentDayIndex];
    if (!day) return null;
    if (day.locked && !subscriptionActive) {
      return renderLockedCard(day.title);
    }
    const scenario = day.scenarios[currentScenarioIndex];
    const key = scenario.lessonKey;
    const data = lessonData[key];

    if (!data) {
      return (
        <div className="card scenario-card role-lessons-card">
          <h2 style={{ textAlign: 'center' }}>Carregando lições...</h2>
        </div>
      );
    }

    const lessonsA = data.A || [];
    const lessonsB = data.B || [];
    const conversationLesson = data.C ? data.C[0] : null;

    // Verifica se a simulação do role foi completada
    const getRoleSimulationCompleted = (role) => {
      if (!conversationLesson || !conversationLesson.completedRoles) return false;
      return conversationLesson.completedRoles.includes(role);
    };

    const simulationACompleted = getRoleSimulationCompleted('A');
    const simulationBCompleted = getRoleSimulationCompleted('B');

    const allRoleALessonsCompleted = lessonsA.every(l => l.completed);
    const allRoleBLessonsCompleted = lessonsB.every(l => l.completed);

    const describeLessons = (lessons, hasSimulation, simulationCompleted) => {
      const regularCount = lessons.length;
      const simCount = hasSimulation ? 1 : 0;
      const total = regularCount + simCount;
      const word = total === 1 ? 'lição' : 'lições';
      const completedRegular = lessons.every(l => l.completed);
      const allCompleted = completedRegular && (hasSimulation ? simulationCompleted : true);
      return `${total} ${word} · ${allCompleted ? 'Completo' : 'Pendente'}`;
    };

    return (
      <div className="card scenario-card trail-card">
        <h2>{scenario.name}</h2>
        <p className="trail-subtitle">Complete cada trilha abaixo incluindo a simulação.</p>

        <div className="day-path role-trail">
          <div
            className="day-node"
            onClick={() => {
              setCurrentRole('A');
              setStage('flashcard-selector');
            }}
          >
            <div className={`sub-bubble role-A ${allRoleALessonsCompleted && simulationACompleted ? 'completed' : 'active'}`}>👤</div>
            <p className="scenario-name">Pessoa A</p>
            <p className="scenario-meta-trail">
              {describeLessons(lessonsA, true, simulationACompleted)}
            </p>
          </div>

          <div />

          <div
            className="day-node"
            onClick={() => {
              setCurrentRole('B');
              setStage('flashcard-selector');
            }}
          >
            <div className={`sub-bubble role-B ${allRoleBLessonsCompleted && simulationBCompleted ? 'completed' : 'active'}`}>👤</div>
            <p className="scenario-name">Pessoa B</p>
            <p className="scenario-meta-trail">
              {describeLessons(lessonsB, true, simulationBCompleted)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderFlashcardSelector = () => {
    const day = courseStructure[currentDayIndex];
    if (!day) return null;
    if (day.locked && !subscriptionActive) {
      return renderLockedCard(day.title);
    }
    const scenario = day.scenarios[currentScenarioIndex];
    const key = scenario.lessonKey;
    const data = lessonData[key];
    const roleLessons = data[currentRole] || [];
    const roleName = currentRole === 'A' ? 'Pessoa A' : 'Pessoa B';
    const roleClass = currentRole === 'A' ? 'role-A' : 'role-B';
    
    // Verifica se a simulação do role foi completada
    const conversationLesson = data.C ? data.C[0] : null;
    const roleSimulationCompleted = conversationLesson?.completedRoles?.includes(currentRole) || false;
    
    // Verifica quais lições regulares estão completas
    const allRegularLessonsCompleted = roleLessons.every(l => l.completed);
    const simulationIsActive = allRegularLessonsCompleted;

    return (
      <div className="card scenario-card trail-card">
        <h2>{scenario.name}</h2>
        <p className="trail-subtitle" style={{ color: currentRole === 'A' ? 'var(--duo-blue-light)' : 'var(--duo-green-light)' }}>
          {roleName} — selecione a próxima lição da trilha.
        </p>
        <div id="lessons-list" className="day-path lesson-trail">
          {roleLessons.map((lesson, lIdx) => {
            const icon = lesson.type === 'words' ? '📖' : '💬';
            const nextLessonIndex = roleLessons.findIndex(l => !l.completed);
            const isActive = lIdx === nextLessonIndex || nextLessonIndex === -1;
            const bubbleClass = lesson.completed
              ? 'completed'
              : (isActive ? `active ${roleClass}` : roleClass);

            return (
              <React.Fragment key={lesson.id}>
                <div
                  className="day-node"
                  onClick={() => {
                    if (isActive || lesson.completed) {
                      setCurrentLessonIndex(lIdx);
                      setFlashcardQueue(lesson.words || []);
                      setCurrentCardIndexInQueue(0);
                      setIsFlashcardFlipped(false);
                      setStage('flashcard');
                    } else {
                      showToast('Complete a lição anterior primeiro!', 'error');
                    }
                  }}
                >
                  <div className={`sub-bubble ${bubbleClass}`} style={{ width: '64px', height: '64px', borderWidth: '4px' }}>
                    {icon}
                  </div>
                  <p className="scenario-name">{lesson.title}</p>
                  <p className="scenario-meta-trail">
                    {lesson.completed ? '✓ Completo' : (isActive ? 'Pronto para iniciar' : 'Bloqueado')}
                  </p>
                </div>
                <div />
              </React.Fragment>
            );
          })}
          
          {/* Simulação do Role */}
          <div
            className={`day-node ${!simulationIsActive ? 'locked' : ''}`}
            onClick={() => {
              if (!simulationIsActive) {
                showToast('Complete todas as lições anteriores primeiro!', 'error');
                return;
              }
              startSimulacaoChat(currentRole);
            }}
          >
            <div className={`sub-bubble ${roleSimulationCompleted ? 'completed' : (simulationIsActive ? `active ${roleClass}` : roleClass)}`} 
                 style={{ width: '64px', height: '64px', borderWidth: '4px' }}>
              🗣️
            </div>
            <p className="scenario-name">Simulação {roleName}</p>
            <p className="scenario-meta-trail">
              {roleSimulationCompleted ? '✓ Completo' : (simulationIsActive ? 'Pronto para iniciar' : 'Bloqueado')}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderFlashcard = () => {
    if (flashcardQueue.length === 0) {
      return (
        <div className="card scenario-card trail-card">
          <h2>Nenhum card disponível</h2>
          <p className="trail-subtitle">Selecione outra lição para continuar praticando.</p>
        </div>
      );
    }

    const card = flashcardQueue[currentCardIndexInQueue];
    const day = courseStructure[currentDayIndex];
    if (!day) return null;
    if (day.locked && !subscriptionActive) {
      return renderLockedCard(day.title);
    }
    const scenario = day?.scenarios?.[currentScenarioIndex];
    const roleName = currentRole === 'A' ? 'Pessoa A' : 'Pessoa B';

    // Tenta buscar áudio equivalente na conversação se o card não tiver audio próprio
    const findConversationAudioForCard = () => {
      try {
        if (!scenario || !scenario.conversations) return null;

        const normalize = (s) => (s || '').trim();
        const target = normalize(card.word);
        if (!target) return null;

        const convA = Array.isArray(scenario.conversations.A) ? scenario.conversations.A : [];
        const convB = Array.isArray(scenario.conversations.B) ? scenario.conversations.B : [];

        // Procura primeiro nas respostas (B), depois nas perguntas (A)
        const matchB = convB.find(l => normalize(l.resposta) === target);
        if (matchB?.audio) return matchB.audio;

        const matchA = convA.find(l => normalize(l.pergunta) === target);
        if (matchA?.audio) return matchA.audio;

        return null;
      } catch {
        return null;
      }
    };

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

          // Recalculate scenario completion
          // Agora considera: lições regulares de A e B completas + simulações de A e B completas
          const lData = updatedLessonData[key];
          if (lData) {
            const lessonsA = (lData.A || []).map(l => ({ completed: l.completed }));
            const lessonsB = (lData.B || []).map(l => ({ completed: l.completed }));
            const conversationLesson = lData.C?.[0];
            const completedRoles = conversationLesson?.completedRoles || [];
            
            const allRegularLessonsACompleted = lessonsA.every(l => l.completed);
            const allRegularLessonsBCompleted = lessonsB.every(l => l.completed);
            const simulationACompleted = completedRoles.includes('A');
            const simulationBCompleted = completedRoles.includes('B');

            const allCompleted =
              allRegularLessonsACompleted &&
              allRegularLessonsBCompleted &&
              simulationACompleted &&
              simulationBCompleted;

            updatedScenario.completed = allCompleted;
          }

          updatedScenarios[currentScenarioIndex] = updatedScenario;
          updatedDay.scenarios = updatedScenarios;
          updated[currentDayIndex] = updatedDay;

          return updated;
        });

        await saveProgress({ lessonsOverride: updatedLessonData });

        // Recarrega o progresso para garantir que está sincronizado
        setTimeout(() => {
          fetchUserProgress();
        }, 300);

        showToast("Lição Completa!", 'success');
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

    flashcardActionsRef.current = {
      know: markAsKnown,
      dontKnow: markAsUnknown,
      back: () => setStage('flashcard-selector')
    };

    return (
      <div className="flashcard-wrapper">
      <div className="card scenario-card flashcard-stage">
        <div className="flashcard-stage-header">
          <p className="flashcard-progress">
            Card {currentCardIndexInQueue + 1}/{flashcardQueue.length}
          </p>
        </div>

        <div className="flashcard-container">
          <div
            className={`flashcard ${isFlashcardFlipped ? 'flipped' : ''}`}
            onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
          >
            <div className="card-inner">
              <div className="card-front">
                <div className="flashcard-word">{card.word}</div>
                <button
                  className="audio-btn"
                  title="Ouvir Pronúncia"
                  onClick={(e) => {
                    e.stopPropagation();
                    const src = card.audio || findConversationAudioForCard();
                    if (!src) {
                      showToast('Áudio ainda não configurado para este item.', 'error');
                      return;
                    }
                    try {
                      if (!flashcardAudioRef.current) {
                        flashcardAudioRef.current = new Audio();
                      }
                      flashcardAudioRef.current.pause();
                      flashcardAudioRef.current.currentTime = 0;
                      flashcardAudioRef.current.src = src;
                      flashcardAudioRef.current.play().catch((err) => {
                        console.error('Erro ao tocar áudio do flashcard', err);
                      });
                    } catch (err) {
                      console.error('Exceção ao tocar áudio do flashcard', err);
                    }
                  }}
                >
                  🔊
                </button>
              </div>
              <div className="card-back">
                <div className="flashcard-translation">{card.translation}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
      </div>
    );
  };

  // Handler para entrar na simulação do role específico
  const startSimulacaoChat = (role) => {
    const day = courseStructure[currentDayIndex];
    if (day?.locked && !subscriptionActive) {
      showToast('Assine para liberar a simulação deste dia.', 'error');
      return;
    }
    setCurrentRole(role);
    setStage('chat');
  };

  const handleSimulacaoComplete = async (completedRole) => {
    const day = courseStructure[currentDayIndex];
    const scenario = day.scenarios[currentScenarioIndex];
    const key = scenario.lessonKey;

    // Update local state
    const updatedLessonData = { ...lessonData };
    let isFullyComplete = false;

    if (updatedLessonData[key] && updatedLessonData[key].C) {
      const lesson = updatedLessonData[key].C[0];
      const completedRoles = lesson.completedRoles || [];

      if (!completedRoles.includes(completedRole)) {
        completedRoles.push(completedRole);
      }

      lesson.completedRoles = completedRoles;

      // Check if both roles are completed
      if (completedRoles.includes('A') && completedRoles.includes('B')) {
        lesson.completed = true;
        isFullyComplete = true;
      }
    }
    setLessonData(updatedLessonData);

    setCourseStructure(prev => {
      const updated = [...prev];
      const updatedDay = { ...updated[currentDayIndex] };
      const updatedScenarios = [...updatedDay.scenarios];
      const updatedScenario = { ...updatedScenarios[currentScenarioIndex] };

      if (updatedScenario.lessons && updatedScenario.lessons.C) {
        const lesson = updatedScenario.lessons.C[0];
        const completedRoles = lesson.completedRoles || [];
        if (!completedRoles.includes(completedRole)) {
          completedRoles.push(completedRole);
        }
        lesson.completedRoles = completedRoles;
        if (completedRoles.includes('A') && completedRoles.includes('B')) {
          lesson.completed = true;
        }
      }

      // Recalculate scenario completion
      // Agora considera: lições regulares de A e B completas + simulações de A e B completas
      const lData = updatedLessonData[key];
      if (lData) {
        const lessonsA = (lData.A || []).map(l => ({ completed: l.completed }));
        const lessonsB = (lData.B || []).map(l => ({ completed: l.completed }));
        const conversationLesson = lData.C?.[0];
        const completedRoles = conversationLesson?.completedRoles || [];
        
        const allRegularLessonsACompleted = lessonsA.every(l => l.completed);
        const allRegularLessonsBCompleted = lessonsB.every(l => l.completed);
        const simulationACompleted = completedRoles.includes('A');
        const simulationBCompleted = completedRoles.includes('B');

        const allCompleted =
          allRegularLessonsACompleted &&
          allRegularLessonsBCompleted &&
          simulationACompleted &&
          simulationBCompleted;

        updatedScenario.completed = allCompleted;
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
        // Construct payload similar to renderFlashcard logic
        await saveProgress({ lessonsOverride: updatedLessonData });
        console.log('Simulação parcial/completa salva!');
      }
    } catch (e) {
      console.error("Erro ao salvar simulação", e);
    }
  };

  const renderReviews = () => {
    console.log('renderReviews called, reviews.length:', reviews.length);
    console.log('courseStructure.length:', courseStructure.length);
    console.log('reviews data:', reviews);
    console.log('courseStructure IDs:', courseStructure.map(d => ({ id: d.id, type: typeof d.id, title: d.title })));

    if (reviews.length === 0) {
      return (
        <div className="card scenario-card trail-card">
          <h2>📚 Revisão</h2>
          <p className="trail-subtitle">
            Não há cenários para revisar no momento. Continue praticando e os cenários concluídos aparecerão aqui para revisão!
          </p>
          <div style={{ marginTop: '2rem' }}>
            <button className="btn primary" onClick={() => setStage('map')}>
              Voltar ao Mapa
            </button>
          </div>
        </div>
      );
    }

    // Filtra revisões que podem ser exibidas (têm dia e cenário correspondentes)
    // Normaliza tipos para comparação (pode ser string ou number)
    const validReviews = reviews.filter(review => {
      // Tenta encontrar o dia comparando tanto como número quanto como string
      const day = courseStructure.find(d => {
        const dId = typeof d.id === 'number' ? d.id : parseInt(d.id);
        const rId = typeof review.courseId === 'number' ? review.courseId : parseInt(review.courseId);
        return dId === rId || String(d.id) === String(review.courseId);
      });
      
      if (!day) {
        console.warn(`Dia não encontrado para review: courseId=${review.courseId} (tipo: ${typeof review.courseId})`);
        console.warn('IDs disponíveis nos cursos:', courseStructure.map(d => ({ id: d.id, type: typeof d.id })));
        return false;
      }
      
      // Tenta encontrar o cenário comparando tanto como número quanto como string
      const scenario = day.scenarios?.find(s => {
        const sId = typeof s.id === 'number' ? s.id : String(s.id);
        const rId = typeof review.scenarioId === 'number' ? review.scenarioId : String(review.scenarioId);
        return sId === rId || String(s.id) === String(review.scenarioId);
      });
      
      if (!scenario) {
        console.warn(`Cenário não encontrado para review: courseId=${review.courseId}, scenarioId=${review.scenarioId} (tipo: ${typeof review.scenarioId})`);
        if (day.scenarios) {
          console.warn('IDs de cenários disponíveis:', day.scenarios.map(s => ({ id: s.id, type: typeof s.id })));
        }
        return false;
      }
      return true;
    });

    console.log('validReviews.length:', validReviews.length);

    if (validReviews.length === 0) {
      return (
        <div className="card scenario-card trail-card">
          <h2>📚 Revisão</h2>
          <p className="trail-subtitle">
            Não foi possível encontrar os cenários correspondentes às revisões. Isso pode acontecer se os cursos ainda não foram carregados.
          </p>
          <div style={{ marginTop: '2rem' }}>
            <button className="btn primary" onClick={() => {
              fetchReviews();
              const professionKey = localStorage.getItem('selectedProfessionKey');
              if (professionKey) {
                fetchCourses(professionKey);
              }
            }}>
              Recarregar
            </button>
            <button className="btn secondary" style={{ marginTop: '0.5rem' }} onClick={() => setStage('map')}>
              Voltar ao Mapa
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="card scenario-card trail-card">
        <h2>📚 Revisão</h2>
        <p className="trail-subtitle">
          Revise os cenários que você já concluiu. A repetição espaçada ajuda a fixar o aprendizado!
        </p>
        <div className="day-path scenario-trail" style={{ marginTop: '2rem' }}>
          {validReviews.map((review, idx) => {
            // Encontra o dia e cenário correspondentes (já validados no filter acima)
            const day = courseStructure.find(d => {
              const dId = typeof d.id === 'number' ? d.id : parseInt(d.id);
              const rId = typeof review.courseId === 'number' ? review.courseId : parseInt(review.courseId);
              return dId === rId || String(d.id) === String(review.courseId);
            });
            if (!day) {
              console.error(`Dia não encontrado após validação: courseId=${review.courseId}`);
              return null;
            }
            
            const scenario = day.scenarios?.find(s => {
              const sId = typeof s.id === 'number' ? s.id : String(s.id);
              const rId = typeof review.scenarioId === 'number' ? review.scenarioId : String(review.scenarioId);
              return sId === rId || String(s.id) === String(review.scenarioId);
            });
            if (!scenario) {
              console.error(`Cenário não encontrado após validação: scenarioId=${review.scenarioId}`);
              return null;
            }

            const nextReviewDate = new Date(review.nextReviewDate);
            const now = new Date();
            // Compara apenas a data (ignora hora) para evitar problemas de timezone
            const reviewDateOnly = new Date(nextReviewDate.getFullYear(), nextReviewDate.getMonth(), nextReviewDate.getDate());
            const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const isOverdue = reviewDateOnly <= todayOnly;
            const daysUntilReview = Math.ceil((reviewDateOnly - todayOnly) / (1000 * 60 * 60 * 24));
            
            console.log(`Review ${idx}: courseId=${review.courseId}, scenarioId=${review.scenarioId}, nextReviewDate=${review.nextReviewDate}, isOverdue=${isOverdue}`);

            return (
              <div key={idx} className="day-node" style={{ marginBottom: '1.5rem' }}>
                <div className={`scenario-bubble ${isOverdue ? 'completed' : ''}`}>
                  {scenario.icon || '🎯'}
                </div>
                <p className="scenario-name">{day.title} - {scenario.name}</p>
                <p className="scenario-meta-trail">
                  {isOverdue 
                    ? 'Pronto para revisar!' 
                    : `Próxima revisão em ${daysUntilReview} dia${daysUntilReview !== 1 ? 's' : ''}`
                  }
                </p>
                {isOverdue && (
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                      className="btn primary"
                      onClick={() => {
                        // Abre o cenário para revisão
                        const dayIndex = courseStructure.findIndex(d => {
                          const dId = typeof d.id === 'number' ? d.id : parseInt(d.id);
                          const rId = typeof review.courseId === 'number' ? review.courseId : parseInt(review.courseId);
                          return dId === rId || String(d.id) === String(review.courseId);
                        });
                        const scenarioIndex = day.scenarios.findIndex(s => {
                          const sId = typeof s.id === 'number' ? s.id : String(s.id);
                          const rId = typeof review.scenarioId === 'number' ? review.scenarioId : String(review.scenarioId);
                          return sId === rId || String(s.id) === String(review.scenarioId);
                        });
                        setCurrentDayIndex(dayIndex);
                        setCurrentScenarioIndex(scenarioIndex);
                        fetchLessonData(scenario.lessonKey);
                        setStage('role-choice-lessons');
                      }}
                    >
                      Revisar
                    </button>
                    <button
                      className="btn secondary"
                      onClick={async () => {
                        // Marca como concluída sem revisar
                        await completeReview(review.courseId, review.scenarioId);
                      }}
                    >
                      Marcar como Revisado
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: '2rem' }}>
          <button className="btn secondary" onClick={() => setStage('map')}>
            Voltar ao Mapa
          </button>
        </div>
      </div>
    );
  };

  const renderRoles = () => {
    const day = courseStructure[currentDayIndex];
    if (!day) return null;
    if (day.locked && !subscriptionActive) {
      return renderLockedCard(day.title);
    }
    const scenario = day.scenarios[currentScenarioIndex];

    // Get lesson data to check completion status
    const key = scenario.lessonKey;
    const data = lessonData[key];
    const conversationLesson = data?.C?.[0];
    const completedRoles = conversationLesson?.completedRoles || [];

    const isACompleted = completedRoles.includes('A');
    const isBCompleted = completedRoles.includes('B');

    const roleOptions = [
      {
        key: 'A',
        title: 'Pessoa A',
        subtitle: 'Scrum Master / Facilitador',
        icon: '🧑‍💼',
        colorClass: 'role-A',
        completed: isACompleted
      },
      {
        key: 'B',
        title: 'Pessoa B',
        subtitle: 'Desenvolvedor · Participante',
        icon: '🛠️',
        colorClass: 'role-B',
        completed: isBCompleted
      }
    ];

    return (
      <div className="card scenario-card trail-card role-select-card">
        <h2>{scenario.name}</h2>
        <p className="trail-subtitle">Escolha o papel para praticar o roteiro completo desta conversa.</p>

        <div className="day-path role-trail role-select-trail">
          {roleOptions.map((role, idx) => {
            const statusText = role.completed ? 'Já concluído' : 'Pronto para praticar';
            const ctaText = role.completed ? 'Repetir conversa' : 'Entrar';
            const bubbleState = role.completed ? 'completed' : 'active';

            return (
              <React.Fragment key={role.key}>
                <div
                  className="day-node role-select-node"
                  onClick={() => {
                    setCurrentRole(role.key);
                    setStage('chat');
                  }}
                >
                  <div className={`sub-bubble ${role.colorClass} ${bubbleState}`}>
                    {role.icon}
                  </div>
                  <p className="scenario-name">{role.title}</p>
                  <p className="scenario-meta-trail">{role.subtitle}</p>
                  <p className="scenario-meta-trail role-status-text">{statusText}</p>
                  <span className="trail-action role-status">{ctaText}</span>
                </div>
                {idx !== roleOptions.length - 1 && <div />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const professionName = localStorage.getItem('selectedProfessionName') || 'Sua jornada';
  const professionIcon = localStorage.getItem('selectedProfessionIcon') || '📚';
  const totalDays = courseStructure.length;
  const currentDay = courseStructure[currentDayIndex];
  const scenariosCount = currentDay?.scenarios.length || 0;
  const completedScenarios = currentDay ? currentDay.scenarios.filter(s => s.completed).length : 0;
  const lessonStages = ['day-scenarios', 'role-choice-lessons', 'flashcard-selector', 'flashcard', 'role', 'chat', 'reviews'];

  const staticStages = ['role-choice-lessons', 'flashcard'];
  const stageContainerClass = staticStages.includes(stage) ? 'app-stage-static' : 'app-stage-scroll';

  return (
    <>
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
          {user?.hasSubscription && (
            <button 
              className="btn danger" 
              style={{ marginTop: '1rem' }}
              onClick={() => {
                setSettingsVisible(false);
                navigate('/cancel-subscription');
              }}
            >
              Cancelar Assinatura
            </button>
          )}
          <button className="btn secondary" style={{ marginTop: '1rem' }} onClick={() => {
            setSettingsVisible(false);
            localStorage.removeItem('selectedProfessionKey');
            localStorage.removeItem('selectedProfessionName');
            navigate('/profession');
          }}>
            Trocar profissão
          </button>
          <button className="btn danger" style={{ marginTop: '1rem' }} onClick={() => {
            setSettingsVisible(false);
            logout();
            navigate('/login');
          }}>
            Sair
          </button>
          <button className="sim-icon-btn" type="button" onClick={() => setSettingsVisible(false)}>‹</button>
        </div>
      </div>

      <div className={`app-shell ${stage === 'flashcard' ? 'flashcard-mode' : ''} ${stage === 'chat' ? 'chat-mode' : ''}`}>
        <header className="app-header">
          <div className="app-header-left">
            {stage !== 'map' && (
              <button 
                className="sim-icon-btn" 
                type="button" 
                onClick={() => {
                  if (stage === 'day-scenarios') {
                    setStage('map');
                  } else if (stage === 'role-choice-lessons') {
                    setStage('day-scenarios');
                  } else if (stage === 'flashcard-selector') {
                    setStage('role-choice-lessons');
                  } else if (stage === 'role') {
                    setStage('role-choice-lessons');
                  } else if (stage === 'reviews') {
                    setStage('map');
                  }
                }}
              >
                ‹
              </button>
            )}
          </div>
          <div className="app-header-center">
            <p className="app-eyebrow">Profissão atual</p>
            <div className="app-title">
              <span className="app-profession-icon">{professionIcon}</span>
              <span>{professionName}</span>
            </div>
            <p className="app-progress">
              {totalDays > 0 ? `Dia ${currentDayIndex + 1}/${totalDays}` : 'Carregando trilha'}
              {scenariosCount > 0 && ` · ${completedScenarios}/${scenariosCount} cenários`}
            </p>
          </div>
          <div className="app-header-right"></div>
        </header>

        <div className={`app-body ${stage === 'flashcard' ? 'flashcard-body' : ''} ${stage === 'chat' ? 'chat-body' : ''}`}>
          {courseStructure.length === 0 ? (
            <div className="card">
              <h2>Carregando...</h2>
              <p>Aguarde o carregamento dos dados do curso.</p>
            </div>
          ) : (
            <div className={`${stageContainerClass} ${stage === 'chat' ? 'chat-stage' : ''}`}>
              {stage === 'map' && renderMap()}
              {stage === 'reviews' && renderReviews()}
              {stage === 'day-scenarios' && renderDayScenarios()}
              {stage === 'role-choice-lessons' && renderRoleChoiceLessons()}
              {stage === 'flashcard-selector' && renderFlashcardSelector()}
              {stage === 'flashcard' && renderFlashcard()}
              {stage === 'role' && renderRoles()}
              {stage === 'chat' && (
                <SimulacaoChat
                  scenario={courseStructure[currentDayIndex].scenarios[currentScenarioIndex]}
                  conversationLesson={lessonData[courseStructure[currentDayIndex].scenarios[currentScenarioIndex].lessonKey]?.C?.[0]}
                  role={currentRole}
                  onBack={() => setStage('flashcard-selector')}
                  onComplete={handleSimulacaoComplete}
                />
              )}
            </div>
          )}
        </div>

        <footer className="app-tab-bar">
          {stage === 'flashcard' ? (
            <>
              <button type="button" className="flashcard-btn know" onClick={() => flashcardActionsRef.current.know?.()}>
                SEI
              </button>
              <button type="button" className="flashcard-btn dont-know" onClick={() => flashcardActionsRef.current.dontKnow?.()}>
                NÃO SEI
              </button>
              <button type="button" className="flashcard-btn" onClick={() => flashcardActionsRef.current.back?.()}>Voltar</button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={stage === 'map' ? 'active' : ''}
                onClick={() => setStage('map')}
              >
                <span>🗺️</span>
                <small>Mapa</small>
              </button>
              <button
                type="button"
                className={stage === 'reviews' ? 'active' : ''}
                onClick={() => setStage('reviews')}
                title={reviews.length > 0 ? `${reviews.length} revisão${reviews.length !== 1 ? 'ões' : ''} pendente${reviews.length !== 1 ? 's' : ''}` : 'Revisão'}
                style={{ position: 'relative' }}
              >
                <span>📚</span>
                <small>Revisão</small>
                {reviews.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    fontSize: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    lineHeight: '16px'
                  }}>
                    {reviews.length > 9 ? '9+' : reviews.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                className={lessonStages.includes(stage) ? 'active' : ''}
                onClick={() => navigate('/profession')}
                disabled={!courseStructure.length}
              >
                <span>🔁</span>
                <small>Profissões</small>
              </button>
              <button type="button" onClick={() => setSettingsVisible(true)}>
                <span>⚙️</span>
                <small>Menu</small>
              </button>
            </>
          )}
        </footer>
        
        {/* Toast Notification */}
        {toast && (
          <div className={`toast-notification ${toast.type} show`}>
            <div className="toast-content">
              <span>{toast.message}</span>
            </div>
          </div>
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
  const [mistakeInfo, setMistakeInfo] = useState(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [finished, setFinished] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

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
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateMatches = (event) => setIsMobileViewport(event.matches);
    setIsMobileViewport(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateMatches);
    } else {
      mediaQuery.addListener(updateMatches);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateMatches);
      } else {
        mediaQuery.removeListener(updateMatches);
      }
    };
  }, []);

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
    const enriched = { timestamp: Date.now(), ...msg };
    setHistory(prev => [...prev, enriched]);
    if (msg.audio && playAudio) queueAudio(msg.audio);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const conv = scenario.conversations;
    const conversationScript = role === 'A' ? conv.A : conv.B;
    const ul = conversationScript[step];

    if (!ul) {
      setFinished(true);
      onComplete(role);
      return;
    }

    const expectedText = (role === 'A' ? ul.pergunta : ul.resposta) || '';
    const cleanedInput = cleanStringForComparison(input);
    const cleanedExpected = cleanStringForComparison(expectedText);

    if (cleanedInput === cleanedExpected) {
      setLastWrong(false);
      setMistakeInfo(null);
      setInput('');
      setHintVisible(false);

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
        onComplete(role);
      }

    } else {
      setMistakeInfo(analyzeMistake(input, expectedText));
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

  if (!scenario || !scenario.conversations) return <div>Carregando...</div>;

  const conv = scenario.conversations;
  const currentScript = role === 'A' ? conv.A : conv.B;
  const currentLine = currentScript[step];
  const hintText = currentLine ? (role === 'A' ? currentLine.pergunta : currentLine.resposta) : '';
  const hintAudio = currentLine ? currentLine.audio : '';
  const headerSubtitle = conversationLesson?.lastSeenText || 'disponível agora';

  const toggleHintToast = () => {
    if (!hintText) return;
    setHintVisible(prev => !prev);
  };

  const closeHintToast = () => setHintVisible(false);

  const closeErrorToast = () => {
    setLastWrong(false);
    setMistakeInfo(null);
  };

  const quickActions = [
    { icon: '📄', label: 'Document', action: onBack, accent: '#38bdf8', title: 'Voltar aos cenários' },
    { icon: '📷', label: 'Camera', action: playFullScript, accent: '#f472b6', title: 'Ouvir roteiro completo' },
    { icon: '📍', label: 'Location', action: toggleHintToast, accent: '#fb923c', title: 'Mostrar dica' },
    {
      icon: '👤', label: 'Contact', accent: '#c084fc', title: 'Marcar simulação como concluída',
      action: () => {
        if (!finished) {
          setFinished(true);
          onComplete(role);
        }
      }
    }
  ];

  const formatTime = (timestamp) =>
    new Date(timestamp || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const analyzeMistake = (userText, expectedText) => {
    const normalizeWord = (word = '') => word
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"“”'’]/g, '')
      .toLowerCase();
    const userWords = userText.trim() ? userText.trim().split(/\s+/) : [];
    const expectedWords = expectedText.trim() ? expectedText.trim().split(/\s+/) : [];
    const maxLen = Math.max(userWords.length, expectedWords.length);
    const wrongWords = [];
    const missingWords = [];
    const extraWords = [];

    for (let i = 0; i < maxLen; i++) {
      const userWord = userWords[i];
      const expectedWord = expectedWords[i];

      if (typeof userWord === 'undefined' && typeof expectedWord === 'string') {
        missingWords.push(expectedWord);
        continue;
      }
      if (typeof expectedWord === 'undefined' && typeof userWord === 'string') {
        extraWords.push(userWord);
        continue;
      }
      if (normalizeWord(userWord) !== normalizeWord(expectedWord)) {
        wrongWords.push({ userWord, expectedWord });
      }
    }

    return { wrongWords, missingWords, extraWords };
  };

  const inputRows = isMobileViewport
    ? Math.min(6, Math.max(1, Math.ceil((input.length || 1) / 20)))
    : 1;

  const inputClassName = [
    lastWrong ? 'error-input' : '',
    isMobileViewport && input.length > 20 ? 'expanded' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className="sim-chat-wrapper">
      <div className="sim-chat-shell">
        <div className="sim-chat-header">
          <div className="sim-header-left">
            <button className="sim-icon-btn" type="button" onClick={onBack}>‹</button>
            <div>
              <div className="sim-header-name">{scenario.name}</div>
              <div className="sim-header-status">{headerSubtitle}</div>
            </div>
          </div>
          <div className="sim-header-icons">
            <button
              className="sim-icon-btn"
              type="button"
              title="Ouvir todo o roteiro"
              onClick={playFullScript}
            >
              📢
            </button>
          </div>
        </div>

        <div className="sim-chat-body" ref={chatScrollRef}>
          {history.map((msg, i) => {
            const isSelf = msg.speaker === role;
            return (
              <div key={i} className={`sim-bubble ${isSelf ? 'self' : 'other'}`}>
                <span className="sim-bubble-text">
                  {msg.text}
                </span>
                {msg.audio && (
                  <button
                    type="button"
                    className="sim-bubble-audio"
                    onClick={() => playAudioImmediate(msg.audio)}
                  >
                    ▶️ Reproduzir áudio
                  </button>
                )}
                <span className="sim-bubble-meta">{formatTime(msg.timestamp)} ✓✓</span>
              </div>
            );
          })}
          {finished && (
            <div className="sim-finished-banner">Fim da conversa 🎉</div>
          )}
        </div>

        {/* <div className="sim-action-row">
          {quickActions.map(action => (
            <button
              key={action.label}
              className="sim-action-btn"
              style={{ '--accent': action.accent }}
              type="button"
              title={action.title}
              onClick={action.action}
            >
              <span className="sim-action-icon">{action.icon}</span>
              <span className="sim-action-label">{action.label}</span>
            </button>
          ))}
        </div> */}

        <div className="sim-input-bar">
          <button type="button" className="sim-input-icon" onClick={toggleHintToast}>💡</button>
          <textarea
            placeholder="Digite sua resposta..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className={inputClassName}
            rows={inputRows}
            autoComplete="off"
          />
          <button type="button" className="sim-input-icon" title="Ouvir próxima fala" onClick={() => playAudioImmediate(hintAudio)}>🔊</button>
          <button type="button" className="sim-send-btn" onClick={handleSend}>➤</button>
        </div>
        <div className={`sim-hint-popover ${hintVisible ? 'show' : ''}`}>
          <button type="button" className="toast-close" onClick={closeHintToast}>×</button>
          {hintText || 'Nenhuma dica disponível para esta fala.'}
        </div>

        <div className={`sim-error ${lastWrong ? 'show' : ''}`}>
          <button type="button" className="toast-close" onClick={closeErrorToast}>×</button>
          <p>❌ Resposta incorreta.</p>
          {mistakeInfo && (
            <>
              {mistakeInfo.wrongWords.length > 0 && (
                <div className="mistake-block">
                  <p>Palavras incorretas:</p>
                  <ul>
                    {mistakeInfo.wrongWords.map((pair, idx) => (
                      <li key={`wrong-${idx}`} className="diff-pair">
                        <span className="diff-word wrong">{pair.userWord || '(vazio)'}</span>
                        <span className="diff-arrow">→</span>
                        <span className="diff-word correct">{pair.expectedWord || '(correto)'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {mistakeInfo.missingWords.length > 0 && (
                <div className="mistake-block">
                  <p>Você não digitou:</p>
                  <div className="diff-list">
                    {mistakeInfo.missingWords.map((word, idx) => (
                      <span key={`missing-${idx}`} className="diff-word correct">{word}</span>
                    ))}
                  </div>
                </div>
              )}
              {mistakeInfo.extraWords.length > 0 && (
                <div className="mistake-block">
                  <p>Palavras extras:</p>
                  <div className="diff-list">
                    {mistakeInfo.extraWords.map((word, idx) => (
                      <span key={`extra-${idx}`} className="diff-word wrong">{word}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profession" element={
            <ProtectedRoute>
              <SelectProfession />
            </ProtectedRoute>
          } />
          <Route path="/subscribe" element={
            <ProtectedRoute>
              <Subscribe />
            </ProtectedRoute>
          } />
          <Route path="/cancel-subscription" element={
            <ProtectedRoute>
              <CancelSubscription />
            </ProtectedRoute>
          } />
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
