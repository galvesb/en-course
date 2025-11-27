// course-data.js
// ATENÇÃO: Os dados estão em um arquivo .js, não .json.

window.courseStructureStatic = [
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
    //   { 
    //     "id": 2, 
    //     "name": "Sprint Planning", 
    //     "icon": "📅", 
    //     "completed": false, 
    //     "lessonKey": "planningLessons", 
    //     "conversations": {
    //         "A": [
    //             { "id": "1", "pergunta": "This feature has top priority for the next sprint.", "audio": "audio/scenario-dev-day-3-sprint-planning/1.mp3" },
    //             { "id": "2", "pergunta": "Will that take much time to implement?", "audio": "audio/scenario-dev-day-3-sprint-planning/3.mp3" },
    //             { "id": "3", "pergunta": "Let’s allocate some buffer time.", "audio": "audio/scenario-dev-day-3-sprint-planning/5.mp3" }
    //         ],
    //         "B": [
    //             { "id": "1", "resposta": "Got it. It needs changes in the database schema.", "audio": "audio/scenario-dev-day-3-sprint-planning/2.mp3" },
    //             { "id": "2", "resposta": "Around two days including testing.", "audio": "audio/scenario-dev-day-3-sprint-planning/4.mp3" },
    //             { "id": "3", "resposta": "Agreed, better to be safe.", "audio": "audio/scenario-dev-day-3-sprint-planning/6.mp3" }
    //         ]
    //     }
    //   },
    //   { "id": 3, "name": "Discutindo Tecnologia", "icon": "💻", "completed": false, "lessonKey": "planningLessons", "conversations": {} },
    //   { "id": 4, "name": "Ajudando um Dev", "icon": "🤝", "completed": false, "lessonKey": "planningLessons", "conversations": {} },
    //   { "id": 5, "name": "Sendo Ajuda", "icon": "🙋‍♂️", "completed": false, "lessonKey": "planningLessons", "conversations": {} },
    //   { "id": 6, "name": "Resolvendo Problema", "icon": "🐛", "completed": false, "lessonKey": "planningLessons", "conversations": {} },
    //   { "id": 7, "name": "Entregando Projeto", "icon": "✅", "completed": false, "lessonKey": "planningLessons", "conversations": {} },
    //   { "id": 8, "name": "Regra de Negócio", "icon": "📄", "completed": false, "lessonKey": "planningLessons", "conversations": {} },
    //   { "id": 9, "name": "Conversa Aleatória", "icon": "☕", "completed": false, "lessonKey": "planningLessons", "conversations": {} },
    //   { "id": 10, "name": "Final do Dia", "icon": "😴", "completed": false, "lessonKey": "planningLessons", "conversations": {} }
    ]
  },
//   { 
//     "id": 2, 
//     "title": "Dia 2: Discussões Avançadas",
//     "scenarios": [
//       { "id": 1, "name": "Review de Código", "icon": "🔍", "completed": false, "lessonKey": "dailyLessons", "conversations": {} },
//       { "id": 2, "name": "Reunião com Cliente", "icon": "💼", "completed": false, "lessonKey": "dailyLessons", "conversations": {} }
//     ]
//   }
];