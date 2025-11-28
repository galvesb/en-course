const mongoose = require('mongoose');

const ProfessionSchema = new mongoose.Schema({
    id: Number,              // ordem / código interno
    key: {                   // chave em inglês (slug), usada para vincular aos dias
        type: String,
        unique: true,
        required: true
    },
    name: {                  // nome legível em inglês, mostrado para o usuário
        type: String,
        required: true
    },
    icon: {                  // ícone (emoji ou texto curto) exibido na UI
        type: String,
        default: '🧑‍💼'
    }
});

module.exports = mongoose.model('Profession', ProfessionSchema);


