const mongoose = require('mongoose');

const ScenarioSchema = new mongoose.Schema({
    id: Number,
    name: String,
    icon: String,
    completed: Boolean,
    lessonKey: String,
    conversations: {
        A: [Object],
        B: [Object]
    }
});

const DaySchema = new mongoose.Schema({
    id: Number,
    title: String,
    scenarios: [ScenarioSchema]
});

module.exports = mongoose.model('Course', DaySchema);
