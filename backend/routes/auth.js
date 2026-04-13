const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 12;

function buildTokenPayload(user) {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role
	};
}

function signToken(payload) {
	return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', (req, res) => {
	try {
		const { name, email, phone, password, role } = req.body;

		if (!name || String(name).trim().length < 2) {
			return res
				.status(400)
				.json({ error: 'Le nom doit contenir au moins 2 caractères' });
		}

		const normalizedEmail = email ? String(email).toLowerCase().trim() : '';
		if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
			return res.status(400).json({ error: 'Adresse email invalide' });
		}

		if (!password || String(password).length < 6) {
			return res
				.status(400)
				.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
		}

		let normalizedRole = 'passenger';
		if (role !== undefined) {
			normalizedRole = String(role).toLowerCase().trim();
			if (normalizedRole !== 'passenger' && normalizedRole !== 'driver') {
				return res.status(400).json({ error: 'Rôle invalide' });
			}
		}

		const existing = db
			.prepare('SELECT id FROM users WHERE email = ?')
			.get(normalizedEmail);

		if (existing) {
			return res
				.status(409)
				.json({ error: 'Cette adresse email est déjà utilisée' });
		}

		const hash = bcrypt.hashSync(String(password), SALT_ROUNDS);

		const result = db
			.prepare(
				`
				INSERT INTO users (name, phone, email, password_hash, role)
				VALUES (?, ?, ?, ?, ?)
			`
			)
			.run(
				String(name).trim(),
				phone ? String(phone).trim() : null,
				normalizedEmail,
				hash,
				normalizedRole
			);

		const user = {
			id: result.lastInsertRowid,
			name: String(name).trim(),
			email: normalizedEmail,
			role: normalizedRole
		};

		const token = signToken(buildTokenPayload(user));

		return res.status(201).json({
			message: 'Inscription réussie',
			token,
			user
		});
	} catch (err) {
		console.error('Auth error:', err);
		return res.status(500).json({ error: 'Erreur serveur interne' });
	}
});

router.post('/login', (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !String(email).trim()) {
			return res.status(400).json({ error: 'Email requis' });
		}

		if (!password || !String(password)) {
			return res.status(400).json({ error: 'Mot de passe requis' });
		}

		const normalizedEmail = String(email).toLowerCase().trim();

		const user = db
			.prepare('SELECT * FROM users WHERE email = ?')
			.get(normalizedEmail);

		const valid = user
			? bcrypt.compareSync(String(password), user.password_hash)
			: false;

		if (!user || !valid) {
			return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
		}

		const userResponse = {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role
		};

		const token = signToken(buildTokenPayload(userResponse));

		return res.status(200).json({
			message: 'Connexion réussie',
			token,
			user: userResponse
		});
	} catch (err) {
		console.error('Auth error:', err);
		return res.status(500).json({ error: 'Erreur serveur interne' });
	}
});

router.get('/me', authenticateToken, (req, res) => {
	try {
		const user = db
			.prepare(
				'SELECT id, name, phone, email, role, created_at FROM users WHERE id = ?'
			)
			.get(req.user.id);

		if (!user) {
			return res.status(404).json({ error: 'Utilisateur introuvable' });
		}

		return res.json({ user });
	} catch (err) {
		console.error('Auth error:', err);
		return res.status(500).json({ error: 'Erreur serveur interne' });
	}
});

module.exports = router;
