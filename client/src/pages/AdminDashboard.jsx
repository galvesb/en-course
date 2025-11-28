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

    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
        fetchCourses();
    }, []);

    const authHeaders = () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
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

    const fetchCourses = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/courses');
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
        setCourseMessage('');
        setCourseError('');
    };

    const handleNewCourse = () => {
        setSelectedCourse(null);
        const template = {
            id: courses.length > 0 ? (Math.max(...courses.map(c => c.id || 0)) + 1) : 1,
            title: `Dia ${courses.length + 1}`,
            scenarios: []
        };
        setCourseJson(JSON.stringify(template, null, 2));
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

            {/* Gestão de usuários */}
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

            {/* Gestão de Dias / Cursos */}
            <h3>Course / Days Management</h3>
            <p style={{ fontSize: '.9rem', color: '#6b7280' }}>
                Aqui você pode criar e editar os dias com cenários, conversas e lessons usando o JSON
                no mesmo formato do documento de exemplo (incluindo <code>scenarios</code>, <code>conversations</code> e <code>lessons</code>).
            </p>

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
                </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <button className="btn ghost" onClick={() => navigate('/')}>Go to App</button>
            </div>
        </div>
    );
};

export default AdminDashboard;
