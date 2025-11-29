import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [courseJson, setCourseJson] = useState('');
    const [courseMessage, setCourseMessage] = useState('');
    const [courseError, setCourseError] = useState('');
    const [activeTab, setActiveTab] = useState('users'); // 'users' | 'courses'

    const [professions, setProfessions] = useState([]);
    const [selectedProfessionKey, setSelectedProfessionKey] = useState('');

    // Representação em objeto do JSON (para helper visual)
    const [parsedCourse, setParsedCourse] = useState(null);
    const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
    const [selectedRole, setSelectedRole] = useState('A');
    const [selectedLineIdx, setSelectedLineIdx] = useState(0);
    const [audioTargetType, setAudioTargetType] = useState('conversation'); // 'conversation' | 'word'
    const [selectedLessonIdx, setSelectedLessonIdx] = useState(0); // índice dentro do filtro (words/phrases)
    const [selectedWordIdx, setSelectedWordIdx] = useState(0); // índice dentro de lesson.words

    const [audioFile, setAudioFile] = useState(null);
    const [audioMessage, setAudioMessage] = useState('');
    const [audioError, setAudioError] = useState('');
    const [audioPath, setAudioPath] = useState('');

    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
        fetchProfessions();
    }, []);

    // Mantém uma versão em objeto do JSON para facilitar escolha de fala na hora do upload
    useEffect(() => {
        if (!courseJson.trim()) {
            setParsedCourse(null);
            return;
        }
        try {
            const obj = JSON.parse(courseJson);
            setParsedCourse(obj);

            if (Array.isArray(obj.scenarios) && obj.scenarios.length > 0) {
                const safeScenarioIdx = Math.min(selectedScenarioIdx, obj.scenarios.length - 1);
                setSelectedScenarioIdx(safeScenarioIdx);

                const scenario = obj.scenarios[safeScenarioIdx];
                const convList = scenario?.conversations?.[selectedRole] || [];
                const safeLineIdx = Math.min(selectedLineIdx, Math.max(convList.length - 1, 0));
                setSelectedLineIdx(safeLineIdx);

                // Ajusta índices de lesson/word para não sair do range
                const lessonsForRole = scenario?.lessons?.[selectedRole] || [];
                const filteredLessons = lessonsForRole
                    .map((l, idx) => ({ l, idx }))
                    .filter(entry => entry.l.type === (audioTargetType === 'word' ? 'words' : 'phrases'));
                if (filteredLessons.length > 0) {
                    const safeLessonIdx = Math.min(selectedLessonIdx, filteredLessons.length - 1);
                    setSelectedLessonIdx(safeLessonIdx);

                    const targetLesson = filteredLessons[safeLessonIdx].l;
                    const words = targetLesson.words || [];
                    const safeWordIdx = Math.min(selectedWordIdx, Math.max(words.length - 1, 0));
                    setSelectedWordIdx(safeWordIdx);
                } else {
                    setSelectedLessonIdx(0);
                    setSelectedWordIdx(0);
                }
            } else {
                setSelectedScenarioIdx(0);
                setSelectedLineIdx(0);
                setSelectedLessonIdx(0);
                setSelectedWordIdx(0);
            }
        } catch {
            // JSON inválido: desabilita helper visual
            setParsedCourse(null);
        }
    }, [courseJson, selectedRole]);

    const authHeaders = () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchProfessions = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/professions');
            setProfessions(res.data || []);
        } catch (err) {
            console.error("Error fetching professions", err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/auth/users', {
                headers: authHeaders()
            });
            setUsers(res.data);
        } catch (err) {
            console.error("Error fetching users", err);
        }
    };

    const deleteUser = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/auth/users/${id}`, {
                headers: authHeaders()
            });
            setUsers(users.filter(u => u._id !== id));
        } catch (err) {
            console.error("Error deleting user", err);
        }
    };

    const fetchCourses = async (professionKeyParam) => {
        try {
            const key = professionKeyParam || selectedProfessionKey;
            if (!key) {
                setCourses([]);
                return;
            }
            const res = await axios.get(`http://localhost:5000/api/courses?professionKey=${encodeURIComponent(key)}`);
            setCourses(res.data);
        } catch (err) {
            console.error("Error fetching courses", err);
        }
    };

    const handleSelectCourse = (course) => {
        setSelectedCourse(course);
        // Remove campos internos do Mongo para edição
        const { _id, __v, ...rest } = course;
        setCourseJson(JSON.stringify(rest, null, 2));
        setParsedCourse(rest);
        setSelectedScenarioIdx(0);
        setSelectedRole('A');
        setSelectedLineIdx(0);
        setCourseMessage('');
        setCourseError('');
    };

    const handleNewCourse = () => {
        setSelectedCourse(null);
        const template = {
            id: courses.length > 0 ? (Math.max(...courses.map(c => c.id || 0)) + 1) : 1,
            title: `Dia ${courses.length + 1}`,
            professionKey: selectedProfessionKey || null,
            scenarios: []
        };
        setCourseJson(JSON.stringify(template, null, 2));
        setParsedCourse(template);
        setSelectedScenarioIdx(0);
        setSelectedRole('A');
        setSelectedLineIdx(0);
        setCourseMessage('');
        setCourseError('');
    };

    const handleSaveCourse = async () => {
        try {
            setCourseMessage('');
            setCourseError('');

            if (!courseJson.trim()) {
                setCourseError('JSON do curso não pode estar vazio.');
                return;
            }

            let payload;
            try {
                payload = JSON.parse(courseJson);
            } catch (e) {
                setCourseError('JSON inválido. Verifique a formatação.');
                return;
            }

            // Validações básicas
            if (typeof payload.id !== 'number') {
                setCourseError('Campo "id" (número do dia) é obrigatório e deve ser número.');
                return;
            }
            if (!payload.title) {
                setCourseError('Campo "title" é obrigatório.');
                return;
            }
            if (!Array.isArray(payload.scenarios)) {
                setCourseError('Campo "scenarios" deve ser um array.');
                return;
            }

            if (selectedCourse && selectedCourse._id) {
                // Update existente
                await axios.put(
                    `http://localhost:5000/api/courses/${selectedCourse._id}`,
                    payload,
                    { headers: authHeaders() }
                );
                setCourseMessage('Dia atualizado com sucesso!');
            } else {
                // Criar novo
                await axios.post(
                    'http://localhost:5000/api/courses',
                    payload,
                    { headers: authHeaders() }
                );
                setCourseMessage('Novo dia criado com sucesso!');
            }

            await fetchCourses();

        } catch (err) {
            console.error("Error saving course", err);
            const msg = err.response?.data?.message || 'Erro ao salvar o dia.';
            setCourseError(msg);
        }
    };

    const handleDeleteCourse = async () => {
        if (!selectedCourse || !selectedCourse._id) {
            return;
        }
        if (!window.confirm(`Tem certeza que deseja excluir o dia "${selectedCourse.title}"?`)) return;

        try {
            await axios.delete(`http://localhost:5000/api/courses/${selectedCourse._id}`, {
                headers: authHeaders()
            });
            setCourseMessage('Dia excluído com sucesso!');
            setCourseError('');
            setSelectedCourse(null);
            setCourseJson('');
            await fetchCourses();
        } catch (err) {
            console.error("Error deleting course", err);
            const msg = err.response?.data?.message || 'Erro ao excluir o dia.';
            setCourseError(msg);
        }
    };

    const handleAudioFileChange = (e) => {
        setAudioFile(e.target.files?.[0] || null);
        setAudioMessage('');
        setAudioError('');
        setAudioPath('');
    };

    const handleUploadAudio = async () => {
        try {
            setAudioMessage('');
            setAudioError('');
            setAudioPath('');

            if (!audioFile) {
                setAudioError('Selecione um arquivo de áudio primeiro.');
                return;
            }

            const formData = new FormData();
            formData.append('file', audioFile);

            const res = await axios.post(
                'http://localhost:5000/api/upload-audio',
                formData,
                {
                    headers: {
                        ...authHeaders(),
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            const path = res.data?.path;
            setAudioPath(path || '');

            if (path) {
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(path);
                        setAudioMessage(`Upload concluído! Caminho "${path}" copiado para a área de transferência. Use esse valor no campo "audio" do JSON.`);
                    } else {
                        setAudioMessage(`Upload concluído! Use o caminho "${path}" no campo "audio" do JSON.`);
                    }
                } catch {
                    setAudioMessage(`Upload concluído! Use o caminho "${path}" no campo "audio" do JSON.`);
                }
            } else {
                setAudioMessage('Upload concluído!');
            }

            // Atualiza automaticamente o campo "audio" conforme o tipo selecionado (conversação / words / phrases)
            if (path && parsedCourse && Array.isArray(parsedCourse.scenarios) && parsedCourse.scenarios.length > 0) {
                const safeScenarioIdx = Math.min(selectedScenarioIdx, parsedCourse.scenarios.length - 1);
                const scenario = parsedCourse.scenarios[safeScenarioIdx];
                if (scenario) {
                    let updatedScenario = { ...scenario };

                    // 1) Conversação (sempre atualizamos se tipo for conversação ou frase)
                    if (audioTargetType === 'conversation' || audioTargetType === 'phrase') {
                        const conversations = scenario.conversations || {};
                        const list = Array.isArray(conversations[selectedRole]) ? [...conversations[selectedRole]] : [];

                        if (list.length > 0) {
                            const safeLineIdx = Math.min(selectedLineIdx, list.length - 1);
                            const line = list[safeLineIdx];
                            if (line) {
                                const updatedLine = { ...line, audio: path };
                                list[safeLineIdx] = updatedLine;

                                updatedScenario = {
                                    ...updatedScenario,
                                    conversations: {
                                        ...conversations,
                                        [selectedRole]: list
                                    }
                                };
                            }
                        }
                    }

                    // 2) Words: atualização manual de lesson.words[*].audio
                    if (audioTargetType === 'word') {
                        const lessonsForRole = updatedScenario.lessons?.[selectedRole] || [];

                        const filtered = lessonsForRole
                            .map((l, idx) => ({ l, idx }))
                            .filter(entry => entry.l.type === 'words');

                        if (filtered.length > 0) {
                            const updatedLessonsForRole = lessonsForRole.map((lesson, idx) => {
                                const matchEntry = filtered.find(e => e.idx === idx);
                                if (!matchEntry) return lesson;

                                const originalWords = Array.isArray(lesson.words) ? lesson.words : [];
                                if (originalWords.length === 0) return lesson;

                                const safeLessonIdxInner = Math.min(selectedLessonIdx, filtered.length - 1);
                                if (filtered[safeLessonIdxInner].idx !== idx) return lesson;

                                const safeWordIdxInner = Math.min(selectedWordIdx, Math.max(originalWords.length - 1, 0));
                                const wordItem = originalWords[safeWordIdxInner];
                                if (!wordItem) return lesson;

                                const newWords = originalWords.map((w, wIdx) =>
                                    wIdx === safeWordIdxInner ? { ...w, audio: path } : w
                                );

                                return {
                                    ...lesson,
                                    words: newWords
                                };
                            });

                            updatedScenario = {
                                ...updatedScenario,
                                lessons: {
                                    ...updatedScenario.lessons,
                                    [selectedRole]: updatedLessonsForRole
                                }
                            };
                        }
                    }

                    // 3) Phrases: sempre sincroniza frases cujo texto é igual ao da conversação atual
                    {
                        const lessonsForRole = updatedScenario.lessons?.[selectedRole] || [];

                        // Texto base para comparação (pergunta/resposta da conversação)
                        let baseText = '';
                        const conversationsForPhrases = updatedScenario.conversations || {};
                        const convListForPhrases = Array.isArray(conversationsForPhrases[selectedRole])
                            ? conversationsForPhrases[selectedRole]
                            : [];
                        if (convListForPhrases.length > 0) {
                            const safeLineIdxForPhrases = Math.min(selectedLineIdx, convListForPhrases.length - 1);
                            const lineForPhrases = convListForPhrases[safeLineIdxForPhrases];
                            baseText = (lineForPhrases?.pergunta || lineForPhrases?.resposta || '').trim();
                        }

                        if (baseText) {
                            const updatedLessonsForRole = lessonsForRole.map((lesson) => {
                                if (lesson.type !== 'phrases' || !Array.isArray(lesson.words)) return lesson;
                                const newWords = lesson.words.map(w => {
                                    if ((w.word || '').trim() === baseText) {
                                        return { ...w, audio: path };
                                    }
                                    return w;
                                });
                                return { ...lesson, words: newWords };
                            });

                            updatedScenario = {
                                ...updatedScenario,
                                lessons: {
                                    ...updatedScenario.lessons,
                                    [selectedRole]: updatedLessonsForRole
                                }
                            };
                        }
                    }

                    const updatedCourse = {
                        ...parsedCourse,
                        scenarios: parsedCourse.scenarios.map((s, idx) =>
                            idx === safeScenarioIdx ? updatedScenario : s
                        )
                    };

                    setParsedCourse(updatedCourse);
                    setCourseJson(JSON.stringify(updatedCourse, null, 2));
                }
            }
        } catch (err) {
            console.error('Error uploading audio', err);
            const msg = err.response?.data?.message || 'Erro ao enviar o áudio.';
            setAudioError(msg);
        }
    };

    return (
        <div className="card" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Admin Dashboard</h2>
                <button
                    className="btn secondary"
                    style={{ width: 'auto' }}
                    onClick={() => { logout(); navigate('/login'); }}
                >
                    Logout
                </button>
            </div>
            <p>Welcome, {user?.name || user?.email}!</p>

            {/* Menu de navegação entre seções */}
            <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
                <button
                    type="button"
                    className={`btn ${activeTab === 'users' ? 'primary' : 'secondary'}`}
                    style={{
                        width: 'auto',
                        padding: '6px 14px',
                        fontSize: '.9rem'
                    }}
                    onClick={() => setActiveTab('users')}
                >
                    User Management
                </button>
                <button
                    type="button"
                    className={`btn ${activeTab === 'courses' ? 'primary' : 'secondary'}`}
                    style={{
                        width: 'auto',
                        padding: '6px 14px',
                        fontSize: '.9rem'
                    }}
                    onClick={() => setActiveTab('courses')}
                >
                    Course / Days Management
                </button>
            </div>

            {activeTab === 'users' && (
                <>
                    <h3>User Management</h3>
                    <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--gray-border)' }}>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>CPF</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Role</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u._id} style={{ borderBottom: '1px solid var(--gray-border)' }}>
                                        <td style={{ padding: '10px' }}>{u.name}</td>
                                        <td style={{ padding: '10px' }}>{u.email}</td>
                                        <td style={{ padding: '10px' }}>{u.cpf}</td>
                                        <td style={{ padding: '10px' }}>{u.role}</td>
                                        <td style={{ padding: '10px' }}>
                                            {u.role !== 'admin' && (
                                                <button
                                                    className="btn danger"
                                                    style={{ width: 'auto', padding: '5px 10px', marginTop: 0 }}
                                                    onClick={() => deleteUser(u._id)}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'courses' && (
                <>
                    <h3>Course / Days Management</h3>
                    <p style={{ fontSize: '.9rem', color: '#6b7280' }}>
                        Aqui você pode criar e editar os dias com cenários, conversas e lessons usando o JSON
                        no mesmo formato do documento de exemplo (incluindo <code>scenarios</code>, <code>conversations</code> e <code>lessons</code>).
                    </p>

                    {/* Seleção de profissão para gerenciamento de dias */}
                    <div style={{ margin: '0.75rem 0 1.25rem 0', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '.9rem', fontWeight: 500 }}>Profissão:</span>
                        <select
                            value={selectedProfessionKey}
                            onChange={(e) => {
                                const key = e.target.value;
                                setSelectedProfessionKey(key);
                                setSelectedCourse(null);
                                setCourseJson('');
                                setParsedCourse(null);
                                setCourseMessage('');
                                setCourseError('');
                                setAudioFile(null);
                                setAudioMessage('');
                                setAudioError('');
                                setAudioPath('');
                                if (key) {
                                    fetchCourses(key);
                                } else {
                                    setCourses([]);
                                }
                            }}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--gray-border)',
                                minWidth: '220px'
                            }}
                        >
                            <option value="">Selecione uma profissão...</option>
                            {professions.map(p => (
                                <option key={p._id} value={p.key}>
                                    {p.icon ? `${p.icon} ` : ''}{p.name} ({p.key})
                                </option>
                            ))}
                        </select>
                    </div>

                    {!selectedProfessionKey && (
                        <p style={{ fontSize: '.85rem', color: '#6b7280', marginBottom: 0 }}>
                            Selecione uma profissão acima para visualizar e editar os dias dessa trilha.
                        </p>
                    )}

                    {selectedProfessionKey && (
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                <div style={{ flex: '1 1 220px', minWidth: '220px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
                        <h4 style={{ margin: 0 }}>Dias existentes</h4>
                        <button className="btn primary" style={{ width: 'auto', padding: '5px 10px' }} onClick={handleNewCourse}>
                            + Novo Dia
                        </button>
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--gray-border)', borderRadius: '8px' }}>
                        {courses.map(c => {
                            const isSelected = selectedCourse && selectedCourse._id === c._id;
                            return (
                                <div
                                    key={c._id}
                                    onClick={() => handleSelectCourse(c)}
                                    style={{
                                        padding: '8px 10px',
                                        cursor: 'pointer',
                                        background: isSelected ? 'var(--duo-green-light)' : 'transparent',
                                        color: isSelected ? '#fff' : '#111827',
                                        borderBottom: '1px solid var(--gray-border)'
                                    }}
                                >
                                    <strong>Dia {c.id}</strong> - {c.title}
                                </div>
                            );
                        })}
                        {courses.length === 0 && (
                            <div style={{ padding: '10px', fontSize: '.9rem', color: '#6b7280' }}>
                                Nenhum dia cadastrado ainda.
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ flex: '2 1 300px', minWidth: '260px' }}>
                    <h4 style={{ marginTop: 0 }}>{selectedCourse ? `Editar Dia ${selectedCourse.id}` : 'Novo Dia'}</h4>
                    <textarea
                        value={courseJson}
                        onChange={(e) => setCourseJson(e.target.value)}
                        placeholder={`Cole aqui o JSON do dia, por exemplo:\n{\n  "id": 2,\n  "title": "Dia 2",\n  "scenarios": [ ... ]\n}`}
                        style={{
                            width: '100%',
                            minHeight: '240px',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            borderRadius: '8px',
                            border: '1px solid var(--gray-border)',
                            padding: '10px',
                            resize: 'vertical'
                        }}
                    />
                    <div style={{ marginTop: '.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button className="btn primary" style={{ width: 'auto' }} onClick={handleSaveCourse}>
                            Salvar Dia
                        </button>
                        {selectedCourse && (
                            <button className="btn danger" style={{ width: 'auto' }} onClick={handleDeleteCourse}>
                                Excluir Dia
                            </button>
                        )}
                    </div>
                    {courseMessage && (
                        <p style={{ marginTop: '.5rem', color: 'var(--duo-green-dark)', fontSize: '.9rem' }}>{courseMessage}</p>
                    )}
                    {courseError && (
                        <p style={{ marginTop: '.5rem', color: '#ef4444', fontSize: '.9rem' }}>{courseError}</p>
                    )}

                    {/* Upload auxiliar de áudio com helper visual (apenas quando um dia existente está selecionado) */}
                    {selectedCourse && (
                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-border)' }}>
                            <h5 style={{ margin: 0, marginBottom: '.5rem' }}>Upload de Áudio</h5>
                            <div style={{ marginBottom: '.5rem', display: 'flex', flexWrap: 'wrap', gap: '.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '.8rem', fontWeight: 500 }}>Atualizar:</span>
                                <select
                                    value={audioTargetType}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setAudioTargetType(val === 'word' ? 'word' : 'conversation');
                                    }}
                                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--gray-border)' }}
                                >
                                    <option value="conversation">Conversação (e frases vinculadas)</option>
                                    <option value="word">Vocabulário (words)</option>
                                </select>
                            </div>
                            {parsedCourse && Array.isArray(parsedCourse.scenarios) && parsedCourse.scenarios.length > 0 ? (
                                <>
                                    <p style={{ fontSize: '.8rem', color: '#6b7280', marginBottom: '.5rem' }}>
                                        Escolha o cenário, o papel (A/B) e a fala; depois envie o arquivo. O caminho do áudio será inserido automaticamente no campo <code>"audio"</code> daquela fala no JSON.
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.5rem' }}>
                                        <select
                                            value={selectedScenarioIdx}
                                            onChange={(e) => setSelectedScenarioIdx(Number(e.target.value) || 0)}
                                            style={{ flex: '1 1 140px', padding: '4px' }}
                                        >
                                            {parsedCourse.scenarios.map((s, idx) => (
                                                <option key={idx} value={idx}>
                                                    {s.name || s.title || `Cenário ${idx + 1}`}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => {
                                                const role = e.target.value === 'B' ? 'B' : 'A';
                                                setSelectedRole(role);
                                                setSelectedLineIdx(0);
                                                setSelectedLessonIdx(0);
                                                setSelectedWordIdx(0);
                                            }}
                                            style={{ flex: '0 0 90px', padding: '4px' }}
                                        >
                                            <option value="A">Pessoa A</option>
                                            <option value="B">Pessoa B</option>
                                        </select>
                                        {audioTargetType !== 'word' && (() => {
                                            const scenario = parsedCourse.scenarios[selectedScenarioIdx] || {};
                                            const convList = scenario.conversations?.[selectedRole] || [];
                                            const safeValue = Math.min(selectedLineIdx, Math.max(convList.length - 1, 0));
                                            return (
                                                <>
                                                    <select
                                                        value={safeValue}
                                                        onChange={(e) => setSelectedLineIdx(Number(e.target.value) || 0)}
                                                        style={{ flex: '2 1 220px', padding: '4px' }}
                                                    >
                                                        {convList.length === 0 && (
                                                            <option value={0}>Sem falas cadastradas para esse papel</option>
                                                        )}
                                                        {convList.map((line, idx) => (
                                                            <option key={idx} value={idx}>
                                                                {(line.id || idx + 1) + ' - ' + (line.pergunta || line.resposta || 'Sem texto')}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {convList.length > 0 && (
                                                        <button
                                                            type="button"
                                                            className="btn secondary"
                                                            style={{ width: 'auto', padding: '4px 10px', fontSize: '.8rem' }}
                                                            onClick={() => {
                                                                const safeIdx = Math.min(selectedLineIdx, convList.length - 1);
                                                                const line = convList[safeIdx];
                                                                const phrase = (line?.pergunta || line?.resposta || '').trim();
                                                                if (!phrase) {
                                                                    alert('Não há texto em inglês definido para esta fala.');
                                                                    return;
                                                                }
                                                                try {
                                                                    if (navigator.clipboard && navigator.clipboard.writeText) {
                                                                        navigator.clipboard.writeText(phrase);
                                                                        // alert('Frase copiada para a área de transferência:\n\n' + phrase);
                                                                    } else {
                                                                        alert('Frase em inglês:\n\n' + phrase);
                                                                    }
                                                                } catch {
                                                                    alert('Frase em inglês:\n\n' + phrase);
                                                                }
                                                            }}
                                                        >
                                                            Copiar frase (inglês)
                                                        </button>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {audioTargetType === 'word' && (() => {
                                        const scenario = parsedCourse.scenarios[selectedScenarioIdx] || {};
                                        const lessonsForRole = scenario.lessons?.[selectedRole] || [];
                                        const filtered = lessonsForRole
                                            .map((l, idx) => ({ l, idx }))
                                            .filter(entry => entry.l.type === 'words');

                                        if (filtered.length === 0) {
                                            return (
                                                <p style={{ fontSize: '.8rem', color: '#6b7280', marginBottom: '.5rem' }}>
                                                    Nenhuma lesson do tipo <code>words</code> encontrada para esse papel.
                                                </p>
                                            );
                                        }

                                        const safeLessonIdx = Math.min(selectedLessonIdx, filtered.length - 1);
                                        const lessonEntry = filtered[safeLessonIdx];
                                        const words = lessonEntry.l.words || [];
                                        const safeWordIdx = Math.min(selectedWordIdx, Math.max(words.length - 1, 0));

                                        const selectedWord = words[safeWordIdx];

                                        return (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.5rem', alignItems: 'center' }}>
                                                <select
                                                    value={safeLessonIdx}
                                                    onChange={(e) => {
                                                        setSelectedLessonIdx(Number(e.target.value) || 0);
                                                        setSelectedWordIdx(0);
                                                    }}
                                                    style={{ flex: '1 1 200px', padding: '4px' }}
                                                >
                                                    {filtered.map((entry, idx) => (
                                                        <option key={entry.idx} value={idx}>
                                                            {(entry.l.id || entry.idx + 1) + ' - ' + (entry.l.title || '')}
                                                        </option>
                                                    ))}
                                                </select>

                                                <select
                                                    value={safeWordIdx}
                                                    onChange={(e) => setSelectedWordIdx(Number(e.target.value) || 0)}
                                                    style={{ flex: '2 1 220px', padding: '4px' }}
                                                >
                                                    {words.length === 0 && (
                                                        <option value={0}>Nenhuma entrada em words para essa lesson</option>
                                                    )}
                                                    {words.map((w, idx) => (
                                                        <option key={idx} value={idx}>
                                                            {(w.word || `Item ${idx + 1}`) + (w.translation ? ` - ${w.translation}` : '')}
                                                        </option>
                                                    ))}
                                                </select>

                                                {words.length > 0 && (
                                                    <button
                                                        type="button"
                                                        className="btn secondary"
                                                        style={{ width: 'auto', padding: '4px 10px', fontSize: '.8rem' }}
                                                        onClick={() => {
                                                            const phrase = (selectedWord?.word || '').trim();
                                                            if (!phrase) {
                                                                alert('Não há palavra/frase em inglês definida para este item.');
                                                                return;
                                                            }
                                                            try {
                                                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                                                    navigator.clipboard.writeText(phrase);
                                                                    alert('Texto copiado para a área de transferência:\n\n' + phrase);
                                                                } else {
                                                                    alert('Texto em inglês:\n\n' + phrase);
                                                                }
                                                            } catch {
                                                                alert('Texto em inglês:\n\n' + phrase);
                                                            }
                                                        }}
                                                    >
                                                        Copiar texto (inglês)
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </>
                            ) : (
                                <p style={{ fontSize: '.8rem', color: '#6b7280', marginBottom: '.5rem' }}>
                                    Para usar o helper de áudio, garanta que o JSON acima é válido e possui um array <code>scenarios</code> com <code>conversations.A</code> e/ou <code>conversations.B</code>.
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={handleAudioFileChange}
                                    style={{ flex: '1 1 180px' }}
                                />
                                <button
                                    className="btn secondary"
                                    type="button"
                                    style={{ width: 'auto' }}
                                    onClick={handleUploadAudio}
                                >
                                    Enviar Áudio
                                </button>
                            </div>
                            {audioPath && (
                                <p style={{ marginTop: '.5rem', fontSize: '.8rem' }}>
                                    Caminho: <code>{audioPath}</code>
                                </p>
                            )}
                            {audioMessage && (
                                <p style={{ marginTop: '.25rem', color: 'var(--duo-green-dark)', fontSize: '.8rem' }}>
                                    {audioMessage}
                                </p>
                            )}
                            {audioError && (
                                <p style={{ marginTop: '.25rem', color: '#ef4444', fontSize: '.8rem' }}>
                                    {audioError}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                        </div>
                    )}
                </>
            )}

            <div style={{ marginTop: '2rem' }}>
                <button className="btn ghost" onClick={() => navigate('/')}>Go to App</button>
            </div>
        </div>
    );
};

export default AdminDashboard;
