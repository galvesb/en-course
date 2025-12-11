const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    professionKey: {
        type: String,
        required: true
    },
    // Armazena o progresso completo no formato da estrutura de curso
    // Estrutura: [{ id, title, scenarios: [{ id, completed, lessons: { A: [...], B: [...], C: [...] } }] }]
    courseProgress: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    // Última atualização
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Índice único para garantir um documento de progresso por usuário + profissão
ProgressSchema.index({ userId: 1, professionKey: 1 }, { unique: true });

module.exports = mongoose.model('Progress', ProgressSchema);
