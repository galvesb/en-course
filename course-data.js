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
      {
        "id": 2,
        "name": "Planning",
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
  },

];