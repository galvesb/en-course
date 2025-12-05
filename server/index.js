const path = require('path');
require('dotenv').config({
    path: path.resolve(__dirname, '..', '.env')
});
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const Course = require('./models/Course');
const Progress = require('./models/Progress');
const Profession = require('./models/Profession');
const User = require('./models/User');
const authRoutes = require('./routes/authRoutes');
const { authMiddleware, adminMiddleware } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// File upload config (for admin audio uploads)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-z0-9\-]/gi, '_');
        cb(null, `${base}-${Date.now()}${ext}`);
    }
});

const upload = multer({ storage });

const MAGALU_BUCKET = process.env.MAGALU_OBJECT_BUCKET;
const MAGALU_ENDPOINT = (process.env.MAGALU_OBJECT_ENDPOINT || 'https://br-se1.magaluobjects.com').trim();
const MAGALU_REGION = process.env.MAGALU_OBJECT_REGION || 'br-se1';

let magaluS3Client = null;
if (process.env.MAGALU_OBJECT_KEY_ID && process.env.MAGALU_OBJECT_KEY_SECRET && MAGALU_BUCKET) {
    magaluS3Client = new S3Client({
        region: MAGALU_REGION,
        endpoint: MAGALU_ENDPOINT,
        credentials: {
            accessKeyId: process.env.MAGALU_OBJECT_KEY_ID,
            secretAccessKey: process.env.MAGALU_OBJECT_KEY_SECRET
        },
        forcePathStyle: true
    });
} else {
    console.warn('⚠️  Magalu Object Storage credentials not fully configured. Audio uploads will fail until MAGALU_OBJECT_* env vars are set.');
}

const buildObjectPublicUrl = (bucket, key) => {
    if (process.env.MAGALU_OBJECT_PUBLIC_BASE) {
        const customBase = process.env.MAGALU_OBJECT_PUBLIC_BASE.replace(/\/$/, '');
        return `${customBase}/${key}`;
    }
    const base = MAGALU_ENDPOINT.replace(/\/$/, '');
    return `${base}/${bucket}/${key}`;
};

const sanitizeName = (name) => name.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();

async function uploadFileToMagaluStorage(file) {
    if (!magaluS3Client) {
        throw new Error('Magalu Object Storage client is not configured');
    }
    const ext = path.extname(file.originalname) || '.bin';
    const base = sanitizeName(path.basename(file.originalname, ext)) || 'audio';
    const key = `audio/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}${ext}`;

    const command = new PutObjectCommand({
        Bucket: MAGALU_BUCKET,
        Key: key,
        Body: fs.createReadStream(file.path),
        ContentType: file.mimetype || 'application/octet-stream',
        ACL: 'public-read'
    });

    await magaluS3Client.send(command);

    return {
        key,
        url: buildObjectPublicUrl(MAGALU_BUCKET, key)
    };
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fluency';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
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

// Course routes (requires authentication to apply subscription rules)
app.get('/api/courses', authMiddleware, async (req, res) => {
    try {
        const filter = {};
        if (req.query.professionKey) {
            filter.professionKey = req.query.professionKey;
        }

        const courseDocs = await Course.find(filter).sort({ id: 1 });
        const user = await User.findById(req.user.userId).select('hasSubscription');
        const hasSubscription = !!user?.hasSubscription;

        const fallbackFreeDayId = courseDocs.length > 0
            ? Math.min(...courseDocs.map(course => course.id || 1))
            : null;

        const payload = courseDocs.map(course => {
            const obj = course.toObject();
            const allowFree = obj.allowFreeAccess === true ||
                (obj.allowFreeAccess === undefined && obj.id === fallbackFreeDayId);
            obj.locked = hasSubscription ? false : !allowFree;
            return obj;
        });

        res.json(payload);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Professions
app.get('/api/professions', async (req, res) => {
    try {
        const professions = await Profession.find().sort({ id: 1 });
        res.json(professions);
    } catch (err) {
        console.error('Error fetching professions:', err);
        res.status(500).json({ message: 'Error fetching professions', error: err.message });
    }
});

// Audio upload for admin (returns path to use in JSON)
app.post('/api/upload-audio', authMiddleware, adminMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo enviado' });
        }

        if (!magaluS3Client) {
            return res.status(500).json({ message: 'Magalu Object Storage não configurado. Defina as variáveis de ambiente MAGALU_OBJECT_KEY_ID, MAGALU_OBJECT_KEY_SECRET, MAGALU_OBJECT_BUCKET.' });
        }

        const uploaded = await uploadFileToMagaluStorage(req.file);

        // Remove o arquivo salvo localmente após subir para o storage
        fs.promises.unlink(req.file.path).catch(() => {});

        res.json({
            message: 'Upload realizado com sucesso',
            path: uploaded.url,
            url: uploaded.url,
            filename: req.file.originalname,
            storageKey: uploaded.key
        });
    } catch (err) {
        console.error('Error uploading audio:', err);
        res.status(500).json({ message: 'Erro ao fazer upload do áudio', error: err.message });
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
