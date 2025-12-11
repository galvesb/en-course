const express = require('express');
const Progress = require('../models/Progress');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Buscar progresso do usuário atual para uma profissão específica
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const professionKey = req.query.professionKey; // Query parameter obrigatório
        
        if (!professionKey) {
            return res.status(400).json({ message: 'professionKey is required' });
        }
        
        // Busca o documento específico para essa combinação de usuário + profissão
        let progress = await Progress.findOne({ userId, professionKey });
        
        // Se não existe, cria um documento vazio para essa profissão
        if (!progress) {
            progress = new Progress({
                userId,
                professionKey,
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

// Salvar/Atualizar progresso completo do usuário para uma profissão específica
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseProgress, professionKey } = req.body;
        
        console.log('POST /api/progress - Received request from userId:', userId);
        console.log('professionKey:', professionKey);
        console.log('courseProgress type:', typeof courseProgress, 'isArray:', Array.isArray(courseProgress));
        
        if (!courseProgress || !Array.isArray(courseProgress)) {
            console.error('Invalid courseProgress:', courseProgress);
            return res.status(400).json({ message: 'courseProgress must be an array' });
        }
        
        if (!professionKey) {
            console.error('professionKey is required');
            return res.status(400).json({ message: 'professionKey is required' });
        }
        
        // Busca ou cria o documento de progresso específico para essa combinação de usuário + profissão
        let progress = await Progress.findOne({ userId, professionKey });
        console.log('Existing progress found:', !!progress);
        
        if (!progress) {
            console.log('Creating new progress document for userId:', userId, 'professionKey:', professionKey);
            progress = new Progress({
                userId,
                professionKey,
                courseProgress
            });
        } else {
            console.log('Updating existing progress document');
            progress.courseProgress = courseProgress;
            progress.lastUpdated = new Date();
        }
        
        await progress.save();
        console.log('Progress saved successfully for userId:', userId, 'professionKey:', professionKey);
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
router.patch('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseId, scenarioId, lessonId, role, completed, professionKey } = req.body;
        
        if (courseId === undefined) {
            return res.status(400).json({ message: 'courseId is required' });
        }
        
        if (!professionKey) {
            return res.status(400).json({ message: 'professionKey is required' });
        }
        
        // Busca o documento específico para essa combinação de usuário + profissão
        let progress = await Progress.findOne({ userId, professionKey });
        
        if (!progress) {
            progress = new Progress({
                userId,
                professionKey,
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

// Resetar progresso do usuário para uma profissão específica
router.delete('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const professionKey = req.query.professionKey; // Query parameter opcional
        
        if (professionKey) {
            // Remove apenas o progresso da profissão específica
            await Progress.findOneAndDelete({ userId, professionKey });
            res.json({ message: `Progress reset successfully for profession: ${professionKey}` });
        } else {
            // Remove todos os progressos do usuário (para todas as profissões)
            await Progress.deleteMany({ userId });
            res.json({ message: 'All progress reset successfully' });
        }
    } catch (err) {
        console.error('Error resetting progress:', err);
        res.status(500).json({ message: 'Error resetting progress', error: err.message });
    }
});

module.exports = router;
