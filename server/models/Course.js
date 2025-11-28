const mongoose = require('mongoose');

const WordSchema = new mongoose.Schema({
    word: String,
    translation: String
}, { _id: false });

const LessonSchema = new mongoose.Schema({
    id: Number,
    type: String,
    title: String,
    completed: Boolean,
    words: [WordSchema]
}, { _id: false });

const ScenarioSchema = new mongoose.Schema({
    id: Number,
    name: String,
    icon: String,
    completed: Boolean,
    lessonKey: String,
    conversations: {
        A: [Object],
        B: [Object]
    },
    lessons: {
        A: [LessonSchema],
        B: [LessonSchema],
        C: [LessonSchema]
    }
});

const DaySchema = new mongoose.Schema({
    id: Number,
    title: String,
    scenarios: [ScenarioSchema]
});

module.exports = mongoose.model('Course', DaySchema);
