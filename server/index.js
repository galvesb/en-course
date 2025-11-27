const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Course = require('./models/Course');
const LessonContent = require('./models/LessonContent');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/fluency')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Routes
app.get('/api/courses', async (req, res) => {
    try {
        const courses = await Course.find().sort({ id: 1 });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/lessons/:key', async (req, res) => {
    try {
        const lessonContent = await LessonContent.findOne({ key: req.params.key });
        if (!lessonContent) return res.status(404).json({ message: 'Lesson content not found' });
        res.json(lessonContent);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
