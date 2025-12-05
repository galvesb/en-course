const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware, adminMiddleware, JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    const { name, email, cpf, address, password } = req.body;

    try {
        // Validate required fields
        if (!name || !email || !cpf || !address || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Normalize CPF (remove formatting)
        const normalizedCpf = cpf.replace(/\D/g, '');

        // Validate CPF length
        if (normalizedCpf.length !== 11) {
            return res.status(400).json({ message: 'CPF must have 11 digits' });
        }

        // Check if user already exists by email or CPF
        let user = await User.findOne({ $or: [{ email: email.toLowerCase().trim() }, { cpf: normalizedCpf }] });
        if (user) {
            if (user.email === email.toLowerCase().trim()) {
                return res.status(400).json({ message: 'Email already registered' });
            }
            if (user.cpf === normalizedCpf) {
                return res.status(400).json({ message: 'CPF already registered' });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user (always as 'user' role for security)
        user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            cpf: normalizedCpf,
            address: address.trim(),
            password: hashedPassword,
            role: 'user'
        });

        await user.save();

        // Create token
        const payload = {
            userId: user.id,
            role: user.role
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                hasSubscription: user.hasSubscription
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        
        // Handle Mongoose validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }

        // Handle duplicate key errors (unique constraint violations)
        if (err.code === 11000) {
            console.log(`Error -------------: ${err}`);
            const field = Object.keys(err.keyPattern)[0];
            return res.status(400).json({ message: `${field} already registereds` });
        }

        // Handle other errors
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Login (using email as username)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const payload = {
            userId: user.id,
            role: user.role
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                hasSubscription: user.hasSubscription
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get All Users (Admin only)
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Delete User (Admin only)
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Toggle subscription status (Admin only)
router.patch('/users/:id/subscription', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { hasSubscription } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { hasSubscription: !!hasSubscription },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Error updating subscription:', err);
        res.status(500).json({ message: 'Error updating subscription', error: err.message });
    }
});

module.exports = router;
