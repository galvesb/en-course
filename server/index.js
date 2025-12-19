const path = require('path');
require('dotenv').config({
    path: path.resolve(__dirname, '..', '.env')
});
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const Stripe = require('stripe');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const Course = require('./models/Course');
const Progress = require('./models/Progress');
const Profession = require('./models/Profession');
const User = require('./models/User');
const authRoutes = require('./routes/authRoutes');
const progressRoutes = require('./routes/progressRoutes');
const { authMiddleware, adminMiddleware } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Diretório uploads criado:', uploadsDir);
}

// File upload config (for admin audio uploads)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure directory exists before saving
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
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
    
    // Verify file exists before trying to read it
    if (!file.path || !fs.existsSync(file.path)) {
        throw new Error(`Arquivo não encontrado: ${file.path || 'caminho não definido'}`);
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

// Stripe configuration
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
let stripe = null;

if (stripeSecretKey) {
    // Valida se é uma chave secreta (deve começar com sk_test_ ou sk_live_)
    if (!stripeSecretKey.startsWith('sk_test_') && !stripeSecretKey.startsWith('sk_live_')) {
        console.warn('⚠️  STRIPE_SECRET_KEY não parece ser uma chave secreta válida. Deve começar com "sk_test_" ou "sk_live_".');
        console.warn('⚠️  Certifique-se de usar a chave secreta (Secret key), não a chave pública (Publishable key).');
    } else {
        stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
        console.log('✅ Stripe configurado com sucesso');
    }
} else {
    console.warn('⚠️  STRIPE_SECRET_KEY não definida. Funcionalidades de verificação de assinatura Stripe estarão desabilitadas.');
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
app.use('/api/progress', progressRoutes);
console.log('✅ Progress routes mounted at /api/progress');

// Stripe Checkout Session endpoint - cria sessão de pagamento
app.post('/api/stripe/create-checkout-session', authMiddleware, async (req, res) => {
    if (!stripe) {
        return res.status(500).json({ message: 'Stripe não configurado. Defina STRIPE_SECRET_KEY.' });
    }

    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // Busca ou cria customer na Stripe
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            try {
                const searchResult = await stripe.customers.search({
                    query: `email:'${user.email}'`,
                    limit: 1
                });

                if (searchResult.data && searchResult.data.length > 0) {
                    customerId = searchResult.data[0].id;
                    user.stripeCustomerId = customerId;
                    await user.save();
                } else {
                    // Cria novo customer
                    const customer = await stripe.customers.create({
                        email: user.email,
                        name: user.name,
                        metadata: {
                            userId: user._id.toString()
                        }
                    });
                    customerId = customer.id;
                    user.stripeCustomerId = customerId;
                    await user.save();
                }
            } catch (err) {
                console.error('Erro ao buscar/criar customer:', err);
                return res.status(500).json({ message: 'Erro ao processar pagamento', error: err.message });
            }
        }

        // Cria a sessão de checkout
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: 'Plano Mensal - Fluency2Work',
                            description: 'Acesso completo a todos os dias e cenários'
                        },
                        unit_amount: 2000, // R$ 20,00 em centavos
                        recurring: {
                            interval: 'month'
                        }
                    },
                    quantity: 1
                }
            ],
            success_url: `${req.headers.origin || 'http://localhost:5173'}/?payment=success`,
            cancel_url: `${req.headers.origin || 'http://localhost:5173'}/subscribe?payment=cancelled`,
            metadata: {
                userId: user._id.toString(),
                userEmail: user.email
            }
        });

        res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
        console.error('Erro ao criar checkout session:', err);
        res.status(500).json({ message: 'Erro ao criar sessão de pagamento', error: err.message });
    }
});

// Stripe subscription check endpoint - SEMPRE consulta a Stripe para garantir status atualizado
app.get('/api/stripe/check-subscription', authMiddleware, async (req, res) => {
    if (!stripe) {
        return res.status(500).json({ message: 'Stripe não configurado. Defina STRIPE_SECRET_KEY.' });
    }

    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        let customerId = user.stripeCustomerId;
        let hasActiveSubscription = false;

        // 1. SEMPRE buscar customer por email usando search API (mesmo se já tiver customerId salvo)
        // Isso garante que sempre consultamos a Stripe para obter dados atualizados
        try {
            const searchResult = await stripe.customers.search({
                query: `email:'${user.email}'`,
                limit: 1
            });

            if (searchResult.data && searchResult.data.length > 0) {
                const foundCustomerId = searchResult.data[0].id;
                // Atualiza o customerId se mudou ou se não tinha antes
                if (customerId !== foundCustomerId) {
                    customerId = foundCustomerId;
                    user.stripeCustomerId = customerId;
                }
            }
        } catch (searchErr) {
            console.error('Erro ao buscar customer por email:', searchErr.message);
            
            // Verifica se o erro é relacionado à chave API incorreta
            if (searchErr.message && searchErr.message.includes('publishable API key')) {
                console.error('❌ ERRO: Você está usando uma chave pública (publishable key) em vez de uma chave secreta (secret key).');
                console.error('❌ A chave secreta deve começar com "sk_test_" ou "sk_live_".');
                console.error('❌ Verifique a variável STRIPE_SECRET_KEY no arquivo .env');
                return res.status(500).json({ 
                    message: 'Configuração do Stripe incorreta: está sendo usada uma chave pública em vez de uma chave secreta. Verifique a variável STRIPE_SECRET_KEY no arquivo .env' 
                });
            }
            
            // Se não encontrou por email, tenta usar o customerId salvo (se existir)
            if (!customerId) {
                console.warn('Não foi possível encontrar customer por email e não há customerId salvo.');
            }
        }

        // 2. Se temos um customerId, SEMPRE verificar subscriptions na Stripe
        if (customerId) {
            try {
                // SEMPRE buscar todas as subscriptions do customer na Stripe
                const subscriptions = await stripe.subscriptions.list({
                    customer: customerId,
                    status: 'all', // Busca todos os status (active, canceled, past_due, etc)
                    limit: 100 // Aumenta o limite para garantir que pegamos todas
                });

                // Verificar se há alguma subscription ativa
                // IMPORTANTE: Verifica APENAS subscriptions, NÃO usa payment intents
                // Status ativos: 'active', 'trialing', 'past_due'
                // Status inativos: 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'
                hasActiveSubscription = false; // Inicia como false
                
                console.log(`Consultando ${subscriptions.data.length} subscription(s) para customer ${customerId}`);
                
                for (const sub of subscriptions.data) {
                    const status = (sub.status || '').toLowerCase();
                    console.log(`Subscription encontrada: ${sub.id} com status: ${status}`);
                    
                    // Apenas considera ativo se o status for um dos ativos
                    if (['active', 'trialing', 'past_due'].includes(status)) {
                        hasActiveSubscription = true;
                        console.log(`✅ Subscription ATIVA encontrada: ${sub.id} com status ${status}`);
                        break; // Se encontrou uma ativa, não precisa continuar
                    } else {
                        console.log(`❌ Subscription INATIVA: ${sub.id} com status ${status}`);
                    }
                }

                // Log do resultado final
                if (hasActiveSubscription) {
                    console.log(`✅ RESULTADO FINAL: Usuário ${user.email} tem assinatura ATIVA`);
                } else {
                    console.log(`❌ RESULTADO FINAL: Usuário ${user.email} NÃO tem assinatura ativa (todas estão canceladas/inativas)`);
                }

            } catch (stripeErr) {
                console.error('Erro ao consultar Stripe:', stripeErr.message);
                
                // Verifica se o erro é relacionado à chave API incorreta
                if (stripeErr.message && stripeErr.message.includes('publishable API key')) {
                    console.error('❌ ERRO: Você está usando uma chave pública (publishable key) em vez de uma chave secreta (secret key).');
                    console.error('❌ A chave secreta deve começar com "sk_test_" ou "sk_live_".');
                    console.error('❌ Verifique a variável STRIPE_SECRET_KEY no arquivo .env');
                    return res.status(500).json({ 
                        message: 'Configuração do Stripe incorreta: está sendo usada uma chave pública em vez de uma chave secreta. Verifique a variável STRIPE_SECRET_KEY no arquivo .env' 
                    });
                }
                // Em caso de erro, mantém hasActiveSubscription como false
            }
        } else {
            // Se não tem customerId, não tem assinatura
            hasActiveSubscription = false;
            console.log(`❌ Usuário ${user.email} não tem customerId no Stripe`);
        }

        // 3. SEMPRE atualizar status no banco (mesmo que seja para false)
        const statusChanged = user.hasSubscription !== hasActiveSubscription;
        user.hasSubscription = hasActiveSubscription;
        
        if (customerId && customerId !== user.stripeCustomerId) {
            user.stripeCustomerId = customerId;
        }
        
        await user.save();

        if (statusChanged) {
            console.log(`📝 Status de assinatura atualizado para ${user.email}: ${hasActiveSubscription ? 'ATIVA' : 'INATIVA'}`);
        }

        res.json({
            hasSubscription: hasActiveSubscription,
            customerId: customerId || null,
            message: 'Subscription status verificado e atualizado na Stripe',
            statusChanged: statusChanged
        });
    } catch (err) {
        console.error('Erro ao verificar assinatura Stripe:', err);
        res.status(500).json({ message: 'Erro ao verificar assinatura Stripe', error: err.message });
    }
});

// Stripe cancel subscription endpoint - cancela assinatura imediatamente
app.post('/api/stripe/cancel-subscription', authMiddleware, async (req, res) => {
    if (!stripe) {
        return res.status(500).json({ message: 'Stripe não configurado. Defina STRIPE_SECRET_KEY.' });
    }

    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        let customerId = user.stripeCustomerId;

        // Se não tem customerId, tenta buscar por email
        if (!customerId) {
            try {
                const searchResult = await stripe.customers.search({
                    query: `email:'${user.email}'`,
                    limit: 1
                });

                if (searchResult.data && searchResult.data.length > 0) {
                    customerId = searchResult.data[0].id;
                    user.stripeCustomerId = customerId;
                    await user.save();
                } else {
                    // Se não tem customer e não tem assinatura ativa, já está cancelado
                    if (!user.hasSubscription) {
                        return res.json({ 
                            message: 'Usuário não possui assinatura ativa',
                            hasSubscription: false 
                        });
                    }
                    // Se tem hasSubscription mas não tem customer, só atualiza o banco
                    user.hasSubscription = false;
                    await user.save();
                    return res.json({ 
                        message: 'Assinatura cancelada (sem customer no Stripe)',
                        hasSubscription: false 
                    });
                }
            } catch (searchErr) {
                console.error('Erro ao buscar customer:', searchErr);
                return res.status(500).json({ message: 'Erro ao buscar customer no Stripe', error: searchErr.message });
            }
        }

        // Busca todas as subscriptions ativas do customer
        try {
            const subscriptions = await stripe.subscriptions.list({
                customer: customerId,
                status: 'all',
                limit: 100
            });

            let canceledCount = 0;
            const activeSubscriptions = subscriptions.data.filter(sub => 
                ['active', 'trialing', 'past_due'].includes(sub.status?.toLowerCase())
            );

            if (activeSubscriptions.length === 0) {
                // Não tem assinaturas ativas, só atualiza o banco
                user.hasSubscription = false;
                await user.save();
                return res.json({ 
                    message: 'Nenhuma assinatura ativa encontrada',
                    hasSubscription: false 
                });
            }

            // Cancela todas as assinaturas ativas
            for (const subscription of activeSubscriptions) {
                try {
                    await stripe.subscriptions.cancel(subscription.id);
                    canceledCount++;
                    console.log(`✅ Subscription ${subscription.id} cancelada`);
                } catch (cancelErr) {
                    console.error(`❌ Erro ao cancelar subscription ${subscription.id}:`, cancelErr);
                    // Continua cancelando as outras mesmo se uma falhar
                }
            }

            // Atualiza o status no banco
            user.hasSubscription = false;
            await user.save();

            console.log(`✅ ${canceledCount} subscription(s) cancelada(s) para usuário ${user.email}`);

            res.json({ 
                message: `Assinatura cancelada com sucesso. ${canceledCount} subscription(s) cancelada(s).`,
                hasSubscription: false,
                canceledCount
            });
        } catch (stripeErr) {
            console.error('Erro ao cancelar subscription no Stripe:', stripeErr);
            return res.status(500).json({ 
                message: 'Erro ao cancelar assinatura na Stripe', 
                error: stripeErr.message 
            });
        }
    } catch (err) {
        console.error('Erro ao cancelar assinatura:', err);
        res.status(500).json({ message: 'Erro ao cancelar assinatura', error: err.message });
    }
});

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

        // Verify file was saved correctly
        if (!req.file.path) {
            return res.status(500).json({ message: 'Erro: arquivo não foi salvo corretamente pelo multer' });
        }

        // Check if file exists on disk
        if (!fs.existsSync(req.file.path)) {
            console.error('Arquivo não encontrado no caminho:', req.file.path);
            console.error('Diretório uploads existe?', fs.existsSync(uploadsDir));
            return res.status(500).json({ 
                message: 'Erro: arquivo não encontrado após upload', 
                error: `Arquivo não existe em: ${req.file.path}` 
            });
        }

        console.log('✅ Arquivo recebido:', req.file.originalname);
        console.log('✅ Caminho local:', req.file.path);
        console.log('✅ Tamanho:', req.file.size, 'bytes');

        if (!magaluS3Client) {
            return res.status(500).json({ message: 'Magalu Object Storage não configurado. Defina as variáveis de ambiente MAGALU_OBJECT_KEY_ID, MAGALU_OBJECT_KEY_SECRET, MAGALU_OBJECT_BUCKET.' });
        }

        const uploaded = await uploadFileToMagaluStorage(req.file);

        // Remove o arquivo salvo localmente após subir para o storage
        fs.promises.unlink(req.file.path).catch((unlinkErr) => {
            console.warn('Aviso: não foi possível remover arquivo local:', unlinkErr.message);
        });

        console.log('✅ Upload para Magalu Storage concluído:', uploaded.url);

        res.json({
            message: 'Upload realizado com sucesso',
            path: uploaded.url,
            url: uploaded.url,
            filename: req.file.originalname,
            storageKey: uploaded.key
        });
    } catch (err) {
        console.error('❌ Error uploading audio:', err);
        
        // Try to clean up file if it exists
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.promises.unlink(req.file.path).catch(() => {});
        }
        
        res.status(500).json({ 
            message: 'Erro ao fazer upload do áudio', 
            error: err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
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
