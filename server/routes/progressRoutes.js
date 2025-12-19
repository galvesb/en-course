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
            lastUpdated: progress.lastUpdated,
            reviews: progress.reviews || []
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
        
        // Garante que reviews é um array
        if (!progress) {
            console.log('Creating new progress document for userId:', userId, 'professionKey:', professionKey);
            progress = new Progress({
                userId,
                professionKey,
                courseProgress,
                reviews: []
            });
        } else {
            console.log('Updating existing progress document');
            
            // Garante que reviews é um array
            if (!Array.isArray(progress.reviews)) {
                progress.reviews = [];
            }
        }
        
        // Verifica se algum cenário foi concluído pela primeira vez e agenda revisão
        const oldProgress = progress.courseProgress || [];
        const newProgress = courseProgress || [];
        
        // Compara cenários concluídos para agendar revisões
        console.log('🔍 Verificando cenários para agendar revisões...');
        console.log('Progresso antigo:', JSON.stringify(oldProgress, null, 2));
        console.log('Progresso novo:', JSON.stringify(newProgress, null, 2));
        
        for (const newCourse of newProgress) {
            const oldCourse = oldProgress.find(c => c.id === newCourse.id);
            console.log(`📚 Verificando curso ${newCourse.id} (${newCourse.title}) - curso antigo existe: ${!!oldCourse}`);
            
            for (const newScenario of (newCourse.scenarios || [])) {
                if (!newScenario.completed) {
                    console.log(`  ⏭️  Cenário ${newScenario.id} não está completo, pulando...`);
                    continue;
                }
                
                // Se não há curso antigo, significa que é novo, então se está completo, agenda revisão
                const oldScenario = oldCourse?.scenarios?.find(s => s.id === newScenario.id);
                const wasCompleted = oldScenario?.completed || false;
                const isNowCompleted = newScenario.completed;
                
                console.log(`  📋 Cenário ${newScenario.id}: estava completo: ${wasCompleted}, está completo agora: ${isNowCompleted}`);
                
                // Se acabou de ser concluído pela primeira vez, agenda revisão
                // Isso inclui casos onde não havia progresso anterior (oldCourse é undefined)
                if (isNowCompleted && !wasCompleted) {
                    const existingReview = progress.reviews.find(
                        r => r.courseId === newCourse.id && r.scenarioId === newScenario.id
                    );
                    
                    if (!existingReview) {
                        // Agenda primeira revisão para 1 dia depois
                        // Usa UTC para evitar problemas de timezone
                        const nextReviewDate = new Date();
                        nextReviewDate.setUTCHours(0, 0, 0, 0); // Zera para meia-noite UTC
                        nextReviewDate.setUTCDate(nextReviewDate.getUTCDate() + 1); // Adiciona 1 dia
                        
                        progress.reviews.push({
                            courseId: newCourse.id,
                            scenarioId: newScenario.id,
                            nextReviewDate,
                            reviewCount: 0
                        });
                        
                        console.log(`✅ Revisão agendada: Curso ${newCourse.id}, Cenário ${newScenario.id} para ${nextReviewDate.toISOString()} (${nextReviewDate.toLocaleDateString('pt-BR')})`);
                    } else {
                        console.log(`⚠️  Revisão já existe para Curso ${newCourse.id}, Cenário ${newScenario.id}`);
                    }
                } else {
                    console.log(`ℹ️  Cenário ${newScenario.id} não precisa de nova revisão (já estava completo ou não está completo agora)`);
                }
            }
        }
        
        console.log(`📊 Total de revisões agendadas: ${progress.reviews.length}`);
        
        progress.courseProgress = courseProgress;
        progress.lastUpdated = new Date();
        
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

// Buscar cenários que precisam ser revisados
router.get('/reviews', async (req, res) => {
    try {
        const userId = req.user.userId;
        const professionKey = req.query.professionKey;
        
        if (!professionKey) {
            return res.status(400).json({ message: 'professionKey is required' });
        }
        
        const progress = await Progress.findOne({ userId, professionKey });
        
        if (!progress || !Array.isArray(progress.reviews)) {
            return res.json({ reviews: [] });
        }
        
        const now = new Date();
        // Zera horas para comparar apenas as datas (ignora hora)
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        
        // Busca revisões que estão prontas (nextReviewDate <= hoje)
        const readyReviews = progress.reviews.filter(review => {
            const reviewDate = new Date(review.nextReviewDate);
            reviewDate.setUTCHours(0, 0, 0, 0); // Zera horas para comparar apenas a data
            return reviewDate <= today;
        });
        
        res.json({ reviews: readyReviews });
    } catch (err) {
        console.error('Error fetching reviews:', err);
        res.status(500).json({ message: 'Error fetching reviews', error: err.message });
    }
});

// Marcar revisão como concluída
router.post('/reviews/:reviewId/complete', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { reviewId } = req.params;
        const { professionKey, courseId, scenarioId } = req.body;
        
        if (!professionKey) {
            return res.status(400).json({ message: 'professionKey is required' });
        }
        
        const progress = await Progress.findOne({ userId, professionKey });
        
        if (!progress || !Array.isArray(progress.reviews)) {
            return res.status(404).json({ message: 'Review not found' });
        }
        
        let reviewIndex;
        
        // Se courseId e scenarioId foram fornecidos, usa eles para encontrar a revisão
        if (courseId !== undefined && scenarioId !== undefined) {
            reviewIndex = progress.reviews.findIndex(r => 
                r.courseId === courseId && r.scenarioId === scenarioId
            );
            if (reviewIndex === -1) {
                return res.status(404).json({ message: 'Review not found' });
            }
        } else {
            // Caso contrário, usa o índice fornecido (compatibilidade com código antigo)
            reviewIndex = parseInt(reviewId);
            if (isNaN(reviewIndex) || reviewIndex < 0 || reviewIndex >= progress.reviews.length) {
                return res.status(404).json({ message: 'Review not found' });
            }
        }
        
        const review = progress.reviews[reviewIndex];
        const now = new Date();
        
        // Atualiza a revisão conforme a lógica de repetição espaçada
        review.lastReviewDate = now;
        
        // Usa UTC para evitar problemas de timezone
        const nextReviewDate = new Date();
        nextReviewDate.setUTCHours(0, 0, 0, 0); // Zera para meia-noite UTC
        
        if (review.reviewCount === 0) {
            // Primeira revisão: próxima em 2 dias
            nextReviewDate.setUTCDate(nextReviewDate.getUTCDate() + 2);
            review.reviewCount = 1;
        } else if (review.reviewCount === 1) {
            // Segunda revisão: próxima em 3 dias
            nextReviewDate.setUTCDate(nextReviewDate.getUTCDate() + 3);
            review.reviewCount = 2;
        } else if (review.reviewCount === 2) {
            // Terceira revisão: reseta para 1 dia
            nextReviewDate.setUTCDate(nextReviewDate.getUTCDate() + 1);
            review.reviewCount = 0;
        }
        
        review.nextReviewDate = nextReviewDate;
        
        console.log(`✅ Revisão ${review.reviewCount === 0 ? 'resetada' : 'atualizada'}: próxima revisão em ${review.reviewCount === 0 ? 1 : review.reviewCount === 1 ? 2 : 3} dia(s) - ${nextReviewDate.toISOString()} (${nextReviewDate.toLocaleDateString('pt-BR')})`);
        
        progress.reviews[reviewIndex] = review;
        await progress.save();
        
        res.json({
            message: 'Review completed successfully',
            review: review,
            nextReviewDate: review.nextReviewDate
        });
    } catch (err) {
        console.error('Error completing review:', err);
        res.status(500).json({ message: 'Error completing review', error: err.message });
    }
});

module.exports = router;
