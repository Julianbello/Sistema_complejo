// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { users } = require('../models/dataStore');

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro';

exports.register = async (req, res) => {
    try {
        const { nombre, email, password, telefono } = req.body;
        if (!nombre || !email || !password || !telefono) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = { id: `usr_${Date.now()}`, nombre, email, passwordHash, telefono };
        users.push(newUser);

        const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ message: 'Usuario registrado con éxito', token });
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};