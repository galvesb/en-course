const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Course = require('./models/Course');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/fluency')
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
        console.error('Warning: Server will start but database operations may fail.');
        console.error('Make sure MongoDB is running on localhost:27017');
    });

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
});

mongoose.connection.on('connected', () => {
    console.log('MongoDB connection established');
});

// Auth Routes
console.log('Loading auth routes...');
console.log('authRoutes type:', typeof authRoutes);
app.use('/api/auth', authRoutes);
console.log('Auth routes mounted at /api/auth');

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
        // Buscar o scenario que tem o lessonKey correspondente na collection Course
        // Usando projection para buscar apenas o scenario necessário
        const course = await Course.findOne(
            { 'scenarios.lessonKey': req.params.key },
            { 'scenarios.$': 1 } // Retorna apenas o scenario que corresponde
        );
        
        if (!course || !course.scenarios || course.scenarios.length === 0) {
            return res.status(404).json({ message: 'Lesson content not found in Course collection' });
        }

        // Pegar o primeiro scenario (que é o que corresponde ao lessonKey)
        const scenario = course.scenarios[0];
        
        if (!scenario.lessons) {
            return res.status(404).json({ message: 'Lessons not found in scenario' });
        }

        // Retornar os lessons no formato esperado pelo frontend
        res.json({
            key: req.params.key,
            A: scenario.lessons.A || [],
            B: scenario.lessons.B || [],
            C: scenario.lessons.C || []
        });
    } catch (err) {
        console.error('Error fetching lessons:', err);
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
