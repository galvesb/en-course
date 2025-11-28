const mongoose = require('mongoose');
const Course = require('./models/Course');
const LessonContent = require('./models/LessonContent');

mongoose.connect('mongodb://localhost:27017/fluency')
    .then(() => console.log('MongoDB connected for seeding'))
    .catch(err => console.log(err));

const courseData = [
    {
        "id": 1,
        "title": "Dia 1",
        "scenarios": [
            {
                "id": 1,
                "name": "Daily Standup",
                "icon": "⏰",
                "completed": false,
                "lessonKey": "dailyLessons",
                "conversations": {
                    "A": [
                        { "id": "1", "pergunta": "Good morning, team! Let’s start with you, Guilherme.", "audio": "audio/scenario-dev-day-1-daily-standup/1.mp3" },
                        { "id": "2", "pergunta": "Awesome! Any blockers today?", "audio": "audio/scenario-dev-day-1-daily-standup/3.mp3" },
                        { "id": "3", "pergunta": "Noted. Let’s sync after the meeting.", "audio": "audio/scenario-dev-day-1-daily-standup/5.mp3" }
                    ],
                    "B": [
                        { "id": "1", "resposta": "Yesterday I finalized the user authentication module.", "audio": "audio/scenario-dev-day-1-daily-standup/2.mp3" },
                        { "id": "2", "resposta": "Yes, I’m facing an issue with OAuth integration.", "audio": "audio/scenario-dev-day-1-daily-standup/4.mp3" },
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
                        { "id": "1", "pergunta": "Good morning, team! Let’s start with you, Guilherme.", "audio": "audio/scenario-dev-day-1-daily-standup/1.mp3" },
                        { "id": "2", "pergunta": "Awesome! Any blockers today?", "audio": "audio/scenario-dev-day-1-daily-standup/3.mp3" },
                        { "id": "3", "pergunta": "Noted. Let’s sync after the meeting.", "audio": "audio/scenario-dev-day-1-daily-standup/5.mp3" }
                    ],
                    "B": [
                        { "id": "1", "resposta": "Yesterday I finalized the user authentication module.", "audio": "audio/scenario-dev-day-1-daily-standup/2.mp3" },
                        { "id": "2", "resposta": "Yes, I’m facing an issue with OAuth integration.", "audio": "audio/scenario-dev-day-1-daily-standup/4.mp3" },
                        { "id": "3", "resposta": "Perfect, thanks!", "audio": "audio/scenario-dev-day-1-daily-standup/6.mp3" }
                    ]
                }
            }
        ]
    },
    {
        "id": 2,
        "title": "Dia 2",
        "scenarios": [
            {
                "id": 1,
                "name": "Daily Standup",
                "icon": "⏰",
                "completed": false,
                "lessonKey": "dailyLessons",
                "conversations": {
                    "A": [
                        { "id": "1", "pergunta": "Good morning, team! Let’s start with you, Guilherme.", "audio": "audio/scenario-dev-day-1-daily-standup/1.mp3" },
                        { "id": "2", "pergunta": "Awesome! Any blockers today?", "audio": "audio/scenario-dev-day-1-daily-standup/3.mp3" },
                        { "id": "3", "pergunta": "Noted. Let’s sync after the meeting.", "audio": "audio/scenario-dev-day-1-daily-standup/5.mp3" }
                    ],
                    "B": [
                        { "id": "1", "resposta": "Yesterday I finalized the user authentication module.", "audio": "audio/scenario-dev-day-1-daily-standup/2.mp3" },
                        { "id": "2", "resposta": "Yes, I’m facing an issue with OAuth integration.", "audio": "audio/scenario-dev-day-1-daily-standup/4.mp3" },
                        { "id": "3", "resposta": "Perfect, thanks!", "audio": "audio/scenario-dev-day-1-daily-standup/6.mp3" }
                    ]
                }
            }
        ]
    }
];

const lessonData = {
    "dailyLessons": {
        "A": [
            { "id": 1, "type": "words", "title": "Vocabulário A", "completed": false, "words": [{ "word": "Start with you", "translation": "Vamos começar com você" }, { "word": "Awesome!", "translation": "Incrível!" }, { "word": "Noted", "translation": "Anotado" }] },
            { "id": 2, "type": "phrases", "title": "Frases A", "completed": false, "words": [{ "word": "Let’s start with you.", "translation": "Vamos começar com você." }, { "word": "Any blockers today?", "translation": "Algum impedimento hoje?" }, { "word": "Let’s sync after the meeting.", "translation": "Vamos nos alinhar após a reunião." }] }
        ],
        "B": [
            { "id": 1, "type": "words", "title": "Vocabulário B", "completed": false, "words": [{ "word": "Finalized", "translation": "Finalizei" }, { "word": "Blocker", "translation": "Impedimento" }, { "word": "OAuth integration", "translation": "Integração OAuth" }] },
            { "id": 2, "type": "phrases", "title": "Frases B", "completed": false, "words": [{ "word": "I finalized the user authentication module.", "translation": "Eu finalizei o módulo de autenticação de usuário." }, { "word": "I’m facing an issue with OAuth integration.", "translation": "Estou enfrentando um problema com a integração OAuth." }] }
        ],
        "C": [
            { "id": 3, "type": "conversation", "title": "Simulação da Daily", "completed": false }
        ]
    },
    "planningLessons": {
        "A": [
            { "id": 1, "type": "words", "title": "Vocabulário A", "completed": false, "words": [{ "word": "Top priority", "translation": "Prioridade máxima" }, { "word": "Implement", "translation": "Implementar" }, { "word": "Allocate", "translation": "Alocar" }] },
            { "id": 2, "type": "phrases", "title": "Frases A", "completed": false, "words": [{ "word": "This feature has top priority.", "translation": "Essa funcionalidade tem prioridade máxima." }, { "word": "Let’s allocate some buffer time.", "translation": "Vamos alocar um tempo de reserva." }] }
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

const seedDB = async () => {
    await Course.deleteMany({});
    await LessonContent.deleteMany({});

    await Course.insertMany(courseData);

    const lessonDocs = Object.keys(lessonData).map(key => ({
        key,
        ...lessonData[key]
    }));

    const mongoose = require('mongoose');
    const Course = require('./models/Course');
    const LessonContent = require('./models/LessonContent');

    mongoose.connect('mongodb://localhost:27017/fluency')
        .then(() => console.log('MongoDB connected for seeding'))
        .catch(err => console.log(err));

    const courseData = [
        {
            "id": 1,
            "title": "Dia 1",
            "scenarios": [
                {
                    "id": 1,
                    "name": "Daily Standup",
                    "icon": "⏰",
                    "completed": false,
                    "lessonKey": "dailyLessons",
                    "conversations": {
                        "A": [
                            { "id": "1", "pergunta": "Good morning, team! Let’s start with you, Guilherme.", "audio": "audio/scenario-dev-day-1-daily-standup/1.mp3" },
                            { "id": "2", "pergunta": "Awesome! Any blockers today?", "audio": "audio/scenario-dev-day-1-daily-standup/3.mp3" },
                            { "id": "3", "pergunta": "Noted. Let’s sync after the meeting.", "audio": "audio/scenario-dev-day-1-daily-standup/5.mp3" }
                        ],
                        "B": [
                            { "id": "1", "resposta": "Yesterday I finalized the user authentication module.", "audio": "audio/scenario-dev-day-1-daily-standup/2.mp3" },
                            { "id": "2", "resposta": "Yes, I’m facing an issue with OAuth integration.", "audio": "audio/scenario-dev-day-1-daily-standup/4.mp3" },
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
                            { "id": "1", "pergunta": "Good morning, team! Let’s start with you, Guilherme.", "audio": "audio/scenario-dev-day-1-daily-standup/1.mp3" },
                            { "id": "2", "pergunta": "Awesome! Any blockers today?", "audio": "audio/scenario-dev-day-1-daily-standup/3.mp3" },
                            { "id": "3", "pergunta": "Noted. Let’s sync after the meeting.", "audio": "audio/scenario-dev-day-1-daily-standup/5.mp3" }
                        ],
                        "B": [
                            { "id": "1", "resposta": "Yesterday I finalized the user authentication module.", "audio": "audio/scenario-dev-day-1-daily-standup/2.mp3" },
                            { "id": "2", "resposta": "Yes, I’m facing an issue with OAuth integration.", "audio": "audio/scenario-dev-day-1-daily-standup/4.mp3" },
                            { "id": "3", "resposta": "Perfect, thanks!", "audio": "audio/scenario-dev-day-1-daily-standup/6.mp3" }
                        ]
                    }
                }
            ]
        },
        {
            "id": 2,
            "title": "Dia 2",
            "scenarios": [
                {
                    "id": 1,
                    "name": "Daily Standup",
                    "icon": "⏰",
                    "completed": false,
                    "lessonKey": "dailyLessons",
                    "conversations": {
                        "A": [
                            { "id": "1", "pergunta": "Good morning, team! Let’s start with you, Guilherme.", "audio": "audio/scenario-dev-day-1-daily-standup/1.mp3" },
                            { "id": "2", "pergunta": "Awesome! Any blockers today?", "audio": "audio/scenario-dev-day-1-daily-standup/3.mp3" },
                            { "id": "3", "pergunta": "Noted. Let’s sync after the meeting.", "audio": "audio/scenario-dev-day-1-daily-standup/5.mp3" }
                        ],
                        "B": [
                            { "id": "1", "resposta": "Yesterday I finalized the user authentication module.", "audio": "audio/scenario-dev-day-1-daily-standup/2.mp3" },
                            { "id": "2", "resposta": "Yes, I’m facing an issue with OAuth integration.", "audio": "audio/scenario-dev-day-1-daily-standup/4.mp3" },
                            { "id": "3", "resposta": "Perfect, thanks!", "audio": "audio/scenario-dev-day-1-daily-standup/6.mp3" }
                        ]
                    }
                }
            ]
        }
    ];

    const lessonData = {
        "dailyLessons": {
            "A": [
                { "id": 1, "type": "words", "title": "Vocabulário A", "completed": false, "words": [{ "word": "Start with you", "translation": "Vamos começar com você" }, { "word": "Awesome!", "translation": "Incrível!" }, { "word": "Noted", "translation": "Anotado" }] },
                { "id": 2, "type": "phrases", "title": "Frases A", "completed": false, "words": [{ "word": "Let’s start with you.", "translation": "Vamos começar com você." }, { "word": "Any blockers today?", "translation": "Algum impedimento hoje?" }, { "word": "Let’s sync after the meeting.", "translation": "Vamos nos alinhar após a reunião." }] }
            ],
            "B": [
                { "id": 1, "type": "words", "title": "Vocabulário B", "completed": false, "words": [{ "word": "Finalized", "translation": "Finalizei" }, { "word": "Blocker", "translation": "Impedimento" }, { "word": "OAuth integration", "translation": "Integração OAuth" }] },
                { "id": 2, "type": "phrases", "title": "Frases B", "completed": false, "words": [{ "word": "I finalized the user authentication module.", "translation": "Eu finalizei o módulo de autenticação de usuário." }, { "word": "I’m facing an issue with OAuth integration.", "translation": "Estou enfrentando um problema com a integração OAuth." }] }
            ],
            "C": [
                { "id": 3, "type": "conversation", "title": "Simulação da Daily", "completed": false }
            ]
        },
        "planningLessons": {
            "A": [
                { "id": 1, "type": "words", "title": "Vocabulário A", "completed": false, "words": [{ "word": "Top priority", "translation": "Prioridade máxima" }, { "word": "Implement", "translation": "Implementar" }, { "word": "Allocate", "translation": "Alocar" }] },
                { "id": 2, "type": "phrases", "title": "Frases A", "completed": false, "words": [{ "word": "This feature has top priority.", "translation": "Essa funcionalidade tem prioridade máxima." }, { "word": "Let’s allocate some buffer time.", "translation": "Vamos alocar um tempo de reserva." }] }
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

    const seedDB = async () => {
        await Course.deleteMany({});
        await LessonContent.deleteMany({});

        await Course.insertMany(courseData);

        const lessonDocs = Object.keys(lessonData).map(key => ({
            key,
            ...lessonData[key]
        }));

        await LessonContent.insertMany(lessonDocs);

        // Seed Admin User
        const bcrypt = require('bcryptjs');
        const User = require('./models/User');
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

        console.log('Database seeded!');
        mongoose.connection.close();
    };

    seedDB();
