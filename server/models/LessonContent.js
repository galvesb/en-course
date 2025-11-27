const mongoose = require('mongoose');

const WordSchema = new mongoose.Schema({
    word: String,
    translation: String
});

const LessonSchema = new mongoose.Schema({
    id: Number,
    type: String,
    title: String,
    completed: Boolean,
    words: [WordSchema]
});

const LessonContentSchema = new mongoose.Schema({
    key: String, // e.g., "dailyLessons"
    A: [LessonSchema],
    B: [LessonSchema],
    C: [LessonSchema]
});

module.exports = mongoose.model('LessonContent', LessonContentSchema);
