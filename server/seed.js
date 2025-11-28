const mongoose = require('mongoose');
const Course = require('./models/Course');
const User = require('./models/User');
const Profession = require('./models/Profession');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/fluency')
    .then(() => console.log('MongoDB connected for seeding'))
    .catch(err => console.log(err));

const lessonData = {
    "dailyLessons": {
        "A": [
            { "id": 1, "type": "words", "title": "Vocabulário A", "completed": false, "words": [{ "word": "Start with youw", "translation": "Vamos começar com você" }, { "word": "Awesome!", "translation": "Incrível!" }, { "word": "Noted", "translation": "Anotado" }] },
            { "id": 2, "type": "phrases", "title": "Frases A", "completed": false, "words": [{ "word": "Let's start with you.", "translation": "Vamos começar com você." }, { "word": "Any blockers today?", "translation": "Algum impedimento hoje?" }, { "word": "Let's sync after the meeting.", "translation": "Vamos nos alinhar após a reunião." }] }
        ],
        "B": [
            { "id": 1, "type": "words", "title": "Vocabulário B", "completed": false, "words": [{ "word": "Finalized", "translation": "Finalizei" }, { "word": "Blocker", "translation": "Impedimento" }, { "word": "OAuth integration", "translation": "Integração OAuth" }] },
            { "id": 2, "type": "phrases", "title": "Frases B", "completed": false, "words": [{ "word": "I finalized the user authentication module.", "translation": "Eu finalizei o módulo de autenticação de usuário." }, { "word": "I'm facing an issue with OAuth integration.", "translation": "Estou enfrentando um problema com a integração OAuth." }] }
        ],
        "C": [
            { "id": 3, "type": "conversation", "title": "Simulação da Daily", "completed": false }
        ]
    },
    "planningLessons": {
        "A": [
            { "id": 1, "type": "words", "title": "Vocabulário A", "completed": false, "words": [{ "word": "Top priority", "translation": "Prioridade máxima" }, { "word": "Implement", "translation": "Implementar" }, { "word": "Allocate", "translation": "Alocar" }] },
            { "id": 2, "type": "phrases", "title": "Frases A", "completed": false, "words": [{ "word": "This feature has top priority.", "translation": "Essa funcionalidade tem prioridade máxima." }, { "word": "Let's allocate some buffer time.", "translation": "Vamos alocar um tempo de reserva." }] }
        ],
        "B": [
            { "id": 1, "type": "words", "title": "Vocabulário B", "completed": false, "words": [{ "word": "Got it", "translation": "Entendi" }, { "word": "Database schema", "translation": "Estrutura do banco" }, { "word": "Better to be safe", "translation": "Melhor prevenir" }] },
            { "id": 2, "type": "phrases", "title": "Frases B", "completed": false, "words": [{ "word": "It needs changes in the database schema.", "translation": "Precisa de mudanças na estrutura do banco." }, { "word": "Around two days including testing.", "translation": "Cerca de dois dias, incluindo testes." }] }
        ],
        "C": [
            { "id": 3, "type": "conversation", "title": "Simulação de Planning", "completed": false }
        ]
    }
};

// Função para adicionar lessons aos scenarios baseado no lessonKey
const addLessonsToScenarios = (courseData, lessonData) => {
    return courseData.map(day => ({
        ...day,
        scenarios: day.scenarios.map(scenario => {
            if (scenario.lessonKey && lessonData[scenario.lessonKey]) {
                return {
                    ...scenario,
                    lessons: lessonData[scenario.lessonKey]
                };
            }
            return scenario;
        })
    }));
};

// Dias base da trilha "Software Developer" (professionKey: "developer")
const courseData = [
    {
        "id": 1,
        "title": "Dia 1",
        "professionKey": "developer",
        "scenarios": [
            {
                "id": 1,
                "name": "Daily Standup",
                "icon": "⏰",
                "completed": false,
                "lessonKey": "dailyLessons",
                "conversations": {
                    "A": [
                        { "id": "1", "pergunta": "Good morning, team! Let's start with you, Guilherme.", "audio": "audio/scenario-dev-day-1-daily-standup/1.mp3" },
                        { "id": "2", "pergunta": "Awesome! Any blockers today?", "audio": "audio/scenario-dev-day-1-daily-standup/3.mp3" },
                        { "id": "3", "pergunta": "Noted. Let's sync after the meeting.", "audio": "audio/scenario-dev-day-1-daily-standup/5.mp3" }
                    ],
                    "B": [
                        { "id": "1", "resposta": "Yesterday I finalized the user authentication module.", "audio": "audio/scenario-dev-day-1-daily-standup/2.mp3" },
                        { "id": "2", "resposta": "Yes, I'm facing an issue with OAuth integration.", "audio": "audio/scenario-dev-day-1-daily-standup/4.mp3" },
                        { "id": "3", "resposta": "Perfect, thanks!", "audio": "audio/scenario-dev-day-1-daily-standup/6.mp3" }
                    ]
                }
            },
            {
                "id": 2,
                "name": "Planning",
                "icon": "⏰",
                "completed": false,
                "lessonKey": "planningLessons",
                "conversations": {
                    "A": [
                        { "id": "1", "pergunta": "Good morning, team! Let's start with you, Guilherme.", "audio": "audio/scenario-dev-day-1-daily-standup/1.mp3" },
                        { "id": "2", "pergunta": "Awesome! Any blockers today?", "audio": "audio/scenario-dev-day-1-daily-standup/3.mp3" },
                        { "id": "3", "pergunta": "Noted. Let's sync after the meeting.", "audio": "audio/scenario-dev-day-1-daily-standup/5.mp3" }
                    ],
                    "B": [
                        { "id": "1", "resposta": "Yesterday I finalized the user authentication module.", "audio": "audio/scenario-dev-day-1-daily-standup/2.mp3" },
                        { "id": "2", "resposta": "Yes, I'm facing an issue with OAuth integration.", "audio": "audio/scenario-dev-day-1-daily-standup/4.mp3" },
                        { "id": "3", "resposta": "Perfect, thanks!", "audio": "audio/scenario-dev-day-1-daily-standup/6.mp3" }
                    ]
                }
            }
        ]
    },
    {
        "id": 2,
        "title": "Dia 2",
        "professionKey": "developer",
        "scenarios": [
            {
                "id": 1,
                "name": "Daily Standup",
                "icon": "⏰",
                "completed": false,
                "lessonKey": "dailyLessons",
                "conversations": {
                    "A": [
                        { "id": "1", "pergunta": "Good morning, team! Let's start with you, Guilherme.", "audio": "audio/scenario-dev-day-1-daily-standup/1.mp3" },
                        { "id": "2", "pergunta": "Awesome! Any blockers today?", "audio": "audio/scenario-dev-day-1-daily-standup/3.mp3" },
                        { "id": "3", "pergunta": "Noted. Let's sync after the meeting.", "audio": "audio/scenario-dev-day-1-daily-standup/5.mp3" }
                    ],
                    "B": [
                        { "id": "1", "resposta": "Yesterday I finalized the user authentication module.", "audio": "audio/scenario-dev-day-1-daily-standup/2.mp3" },
                        { "id": "2", "resposta": "Yes, I'm facing an issue with OAuth integration.", "audio": "audio/scenario-dev-day-1-daily-standup/4.mp3" },
                        { "id": "3", "resposta": "Perfect, thanks!", "audio": "audio/scenario-dev-day-1-daily-standup/6.mp3" }
                    ]
                }
            }
        ]
    }
];

const seedDB = async () => {
    try {
        // Limpar dados existentes
        await Course.deleteMany({});
        await Profession.deleteMany({});
        console.log('Courses and professions collections cleared');

        // Adicionar lessons aos scenarios
        const courseDataWithLessons = addLessonsToScenarios(courseData, lessonData);

        // Inserir courses com lessons incluídos
        await Course.insertMany(courseDataWithLessons);
        console.log('Courses with lessons inserted');

        // Criar profissão padrão "Software Developer"
        const devProfession = new Profession({
            id: 1,
            key: 'developer',
            name: 'Software Developer',
            icon: '💻'
        });
        await devProfession.save();
        console.log('Profession created: Software Developer (key: developer)');

        // Seed Admin User
        await User.deleteMany({});
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const adminUser = new User({
            name: 'Administrator',
            email: 'admin@fluency2work.com',
            cpf: '000.000.000-00',
            address: 'Admin Address',
            password: hashedPassword,
            role: 'admin'
        });

        await adminUser.save();
        console.log('Admin user created: admin@fluency2work.com / admin123');

        console.log('Database seeded successfully!');
        mongoose.connection.close();
    } catch (err) {
        console.error('Error seeding database:', err);
        mongoose.connection.close();
        process.exit(1);
    }
};

seedDB();
