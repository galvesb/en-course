const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Course = require('./models/Course');
const Progress = require('./models/Progress');
const authRoutes = require('./routes/authRoutes');
const { authMiddleware, adminMiddleware } = require('./middleware/authMiddleware');

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

// Progress Routes (requires authentication)
console.log('Loading progress routes...');

// Buscar progresso do usuário atual
app.get('/api/progress', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        let progress = await Progress.findOne({ userId });
        
        // Se não existe, cria um documento vazio
        if (!progress) {
            progress = new Progress({
                userId,
                courseProgress: []
            });
            await progress.save();
        }
        
        res.json({
            courseProgress: progress.courseProgress || [],
            lastUpdated: progress.lastUpdated
        });
    } catch (err) {
        console.error('Error fetching progress:', err);
        res.status(500).json({ message: 'Error fetching progress', error: err.message });
    }
});

// Salvar/Atualizar progresso completo do usuário
app.post('/api/progress', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseProgress } = req.body;
        
        console.log('POST /api/progress - Received request from userId:', userId);
        console.log('courseProgress type:', typeof courseProgress, 'isArray:', Array.isArray(courseProgress));
        
        if (!courseProgress || !Array.isArray(courseProgress)) {
            console.error('Invalid courseProgress:', courseProgress);
            return res.status(400).json({ message: 'courseProgress must be an array' });
        }
        
        // Busca ou cria o documento de progresso
        let progress = await Progress.findOne({ userId });
        console.log('Existing progress found:', !!progress);
        
        if (!progress) {
            console.log('Creating new progress document');
            progress = new Progress({
                userId,
                courseProgress
            });
        } else {
            console.log('Updating existing progress document');
            progress.courseProgress = courseProgress;
            progress.lastUpdated = new Date();
        }
        
        await progress.save();
        console.log('Progress saved successfully for userId:', userId);
        console.log('Progress document ID:', progress._id);
        
        res.json({
            message: 'Progress saved successfully',
            courseProgress: progress.courseProgress,
            lastUpdated: progress.lastUpdated
        });
    } catch (err) {
        console.error('Error saving progress:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Error saving progress', error: err.message });
    }
});

// Atualizar progresso de um item específico (curso, cenário ou lição)
app.patch('/api/progress', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseId, scenarioId, lessonId, role, completed } = req.body;
        
        if (courseId === undefined) {
            return res.status(400).json({ message: 'courseId is required' });
        }
        
        let progress = await Progress.findOne({ userId });
        
        if (!progress) {
            progress = new Progress({
                userId,
                courseProgress: []
            });
        }
        
        // Garante que courseProgress é um array
        if (!Array.isArray(progress.courseProgress)) {
            progress.courseProgress = [];
        }
        
        // Encontra ou cria o curso
        let course = progress.courseProgress.find(c => c.id === courseId);
        if (!course) {
            course = { id: courseId, scenarios: [] };
            progress.courseProgress.push(course);
        }
        
        // Se scenarioId foi fornecido
        if (scenarioId !== undefined) {
            let scenario = course.scenarios.find(s => s.id === scenarioId);
            if (!scenario) {
                scenario = { id: scenarioId, completed: false, lessons: { A: [], B: [], C: [] } };
                course.scenarios.push(scenario);
            }
            
            // Se lessonId e role foram fornecidos, atualiza a lição específica
            if (lessonId !== undefined && role) {
                if (!scenario.lessons) {
                    scenario.lessons = { A: [], B: [], C: [] };
                }
                
                const roleLessons = scenario.lessons[role] || [];
                let lesson = roleLessons.find(l => l.id === lessonId);
                
                if (lesson) {
                    lesson.completed = completed !== undefined ? completed : true;
                } else {
                    // Se a lição não existe, adiciona
                    roleLessons.push({ id: lessonId, completed: completed !== undefined ? completed : true });
                    scenario.lessons[role] = roleLessons;
                }
            } else {
                // Atualiza apenas o status do cenário
                scenario.completed = completed !== undefined ? completed : true;
            }
        }
        
        progress.lastUpdated = new Date();
        await progress.save();
        
        res.json({
            message: 'Progress updated successfully',
            courseProgress: progress.courseProgress,
            lastUpdated: progress.lastUpdated
        });
    } catch (err) {
        console.error('Error updating progress:', err);
        res.status(500).json({ message: 'Error updating progress', error: err.message });
    }
});

// Resetar progresso do usuário
app.delete('/api/progress', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        await Progress.findOneAndDelete({ userId });
        
        res.json({ message: 'Progress reset successfully' });
    } catch (err) {
        console.error('Error resetting progress:', err);
        res.status(500).json({ message: 'Error resetting progress', error: err.message });
    }
});

console.log('✅ Progress routes mounted at /api/progress');

// Public course routes
app.get('/api/courses', async (req, res) => {
    try {
        const courses = await Course.find().sort({ id: 1 });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin Course Management (CRUD)
app.post('/api/courses', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const data = { ...req.body };

        // Garante um id sequencial se não for enviado
        if (data.id === undefined || data.id === null) {
            const lastCourse = await Course.findOne().sort({ id: -1 });
            data.id = lastCourse ? (lastCourse.id || 0) + 1 : 1;
        }

        const course = new Course(data);
        await course.save();
        res.status(201).json(course);
    } catch (err) {
        console.error('Error creating course:', err);
        res.status(500).json({ message: 'Error creating course', error: err.message });
    }
});

app.put('/api/courses/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const data = { ...req.body };

        // Nunca sobrescreve o _id
        delete data._id;
        delete data.__v;

        const updated = await Course.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: false
        });

        if (!updated) {
            return res.status(404).json({ message: 'Course not found' });
        }

        res.json(updated);
    } catch (err) {
        console.error('Error updating course:', err);
        res.status(500).json({ message: 'Error updating course', error: err.message });
    }
});

app.delete('/api/courses/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Course.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: 'Course not found' });
        }

        res.json({ message: 'Course deleted successfully' });
    } catch (err) {
        console.error('Error deleting course:', err);
        res.status(500).json({ message: 'Error deleting course', error: err.message });
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

// Test route to verify server is working
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running', routes: ['/api/auth', '/api/progress', '/api/courses', '/api/lessons/:key'] });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Available routes:');
    console.log('  - GET  /api/test');
    console.log('  - POST /api/auth/register');
    console.log('  - POST /api/auth/login');
    console.log('  - GET  /api/progress (requires auth)');
    console.log('  - POST /api/progress (requires auth)');
    console.log('  - GET  /api/courses');
    console.log('  - GET  /api/lessons/:key');
});
