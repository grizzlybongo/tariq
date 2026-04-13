const express = require('express');

const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

const tripsSelectSql = `
	SELECT
		trips.id,
		trips.departure,
		trips.destination,
		trips.date,
		trips.time,
		trips.seats,
		trips.price,
		trips.created_at,
		users.name AS driver_name,
		users.id AS driver_id,
		(trips.seats - COALESCE(
			(SELECT SUM(seats_booked)
			 FROM bookings
			 WHERE bookings.trip_id = trips.id
			 AND bookings.status = 'confirmed'),
			0
		)) AS seats_available
	FROM trips
	JOIN users ON trips.driver_id = users.id
`;

function formatTrip(trip) {
	return {
		id: trip.id,
		departure: trip.departure,
		destination: trip.destination,
		date: trip.date,
		time: trip.time,
		seats: trip.seats,
		seats_available: trip.seats_available,
		price: trip.price,
		driver: {
			id: trip.driver_id,
			name: trip.driver_name
		},
		created_at: trip.created_at ? trip.created_at.replace(' ', 'T') : trip.created_at
	};
}

function isValidTimeFormat(value) {
	return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isTodayOrFuture(dateString) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
		return false;
	}

	const parsed = new Date(`${dateString}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) {
		return false;
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	return parsed >= today;
}

router.get('/', (req, res) => {
	try {
		const from = typeof req.query.from === 'string' ? req.query.from.trim() : '';
		const to = typeof req.query.to === 'string' ? req.query.to.trim() : '';
		const date = typeof req.query.date === 'string' ? req.query.date.trim() : '';

		let query = `${tripsSelectSql}
			WHERE trips.date >= date('now')`;
		const params = [];

		if (from) {
			query += "\n\t\t\tAND LOWER(trips.departure) LIKE LOWER('%' || ? || '%')";
			params.push(from);
		}

		if (to) {
			query += "\n\t\t\tAND LOWER(trips.destination) LIKE LOWER('%' || ? || '%')";
			params.push(to);
		}

		if (date) {
			query += '\n\t\t\tAND trips.date = ?';
			params.push(date);
		}

		query += '\n\t\t\tORDER BY trips.date ASC, trips.time ASC';

		const rows = db.prepare(query).all(...params);
		const trips = rows
			.filter((trip) => trip.seats_available > 0)
			.map(formatTrip);

		return res.json(trips);
	} catch (error) {
		console.error('Error while searching trips:', error);
		return res.status(500).json({ error: 'Erreur lors de la recherche des trajets' });
	}
});

router.get('/:id', (req, res) => {
	try {
		const trip = db
			.prepare(`${tripsSelectSql}\n\t\tWHERE trips.id = ?`)
			.get(req.params.id);

		if (!trip) {
			return res.status(404).json({ error: 'Trajet introuvable' });
		}

		return res.json(formatTrip(trip));
	} catch (error) {
		console.error('Error while fetching trip:', error);
		return res.status(500).json({ error: 'Erreur lors de la récupération du trajet' });
	}
});

router.post('/', authenticateToken, (req, res) => {
	try {
		if (!req.user || req.user.role !== 'driver') {
			return res.status(403).json({ error: 'Réservé aux conducteurs' });
		}

		const { departure, destination, date, time, seats, price } = req.body;

		const normalizedDeparture = typeof departure === 'string' ? departure.trim() : '';
		const normalizedDestination = typeof destination === 'string' ? destination.trim() : '';

		if (!normalizedDeparture) {
			return res.status(400).json({ error: 'Le départ est obligatoire' });
		}

		if (!normalizedDestination) {
			return res.status(400).json({ error: 'La destination est obligatoire' });
		}

		if (normalizedDeparture.toLowerCase() === normalizedDestination.toLowerCase()) {
			return res
				.status(400)
				.json({ error: 'Le départ et la destination doivent être différents' });
		}

		if (!date || !isTodayOrFuture(date)) {
			return res
				.status(400)
				.json({ error: "La date doit être aujourd'hui ou dans le futur" });
		}

		if (typeof time !== 'string' || !isValidTimeFormat(time.trim())) {
			return res.status(400).json({ error: "L'heure doit être au format HH:MM" });
		}

		const seatsNumber = Number(seats);
		if (!Number.isInteger(seatsNumber) || seatsNumber < 1 || seatsNumber > 8) {
			return res
				.status(400)
				.json({ error: 'Le nombre de places doit être entre 1 et 8' });
		}

		const priceNumber = Number(price);
		if (price === undefined || price === null || price === '' || Number.isNaN(priceNumber) || priceNumber < 0) {
			return res
				.status(400)
				.json({ error: 'Le prix doit être un nombre supérieur ou égal à 0' });
		}

		const stmt = db.prepare(`
			INSERT INTO trips
				(driver_id, departure, destination, date, time, seats, price)
			VALUES
				(?, ?, ?, ?, ?, ?, ?)
		`);

		const result = stmt.run(
			req.user.id,
			normalizedDeparture,
			normalizedDestination,
			date,
			time.trim(),
			parseInt(seats, 10),
			parseFloat(price)
		);

		return res.status(201).json({
			message: 'Trajet créé avec succès',
			trip_id: result.lastInsertRowid
		});
	} catch (error) {
		console.error('Error while creating trip:', error);
		return res.status(500).json({ error: 'Erreur lors de la création du trajet' });
	}
});

router.delete('/:id', authenticateToken, (req, res) => {
	try {
		const tripId = parseInt(req.params.id, 10);
		if (Number.isNaN(tripId)) {
			return res.status(404).json({ error: 'Trajet introuvable' });
		}

		const trip = db.prepare('SELECT id, driver_id FROM trips WHERE id = ?').get(tripId);
		if (!trip) {
			return res.status(404).json({ error: 'Trajet introuvable' });
		}

		if (!req.user || trip.driver_id !== req.user.id) {
			return res.status(403).json({ error: 'Non autorisé' });
		}

		const bookingCount = db
			.prepare(`
				SELECT COUNT(*) as count FROM bookings
				WHERE trip_id = ? AND status = 'confirmed'
			`)
			.get(tripId);

		if (bookingCount.count > 0) {
			return res.status(409).json({
				error: 'Impossible de supprimer un trajet avec des réservations actives'
			});
		}

		db.prepare('DELETE FROM trips WHERE id = ?').run(tripId);

		return res.json({ message: 'Trajet supprimé' });
	} catch (error) {
		console.error('Error while deleting trip:', error);
		return res.status(500).json({ error: 'Erreur lors de la suppression du trajet' });
	}
});

function seedTrips() {
	const count = db.prepare('SELECT COUNT(*) as n FROM trips').get();

	if (count.n > 0) {
		return;
	}

	const existingDriver = db
		.prepare("SELECT id FROM users WHERE email = 'driver@tariqi.tn'")
		.get();

	let driverId;

	if (!existingDriver) {
		const bcrypt = require('bcrypt');
		const hash = bcrypt.hashSync('password123', 10);
		const newDriver = db
			.prepare(`
				INSERT INTO users (name, phone, email, password_hash, role)
				VALUES (?, ?, ?, ?, 'driver')
			`)
			.run('Ahmed Ben Ali', '+21698000001', 'driver@tariqi.tn', hash);
		driverId = newDriver.lastInsertRowid;
	} else {
		driverId = existingDriver.id;
	}

	const future = (daysAhead) => {
		const d = new Date();
		d.setDate(d.getDate() + daysAhead);
		return d.toISOString().split('T')[0];
	};

	const trips = [
		{ dep: 'Tunis', dst: 'Sousse', date: future(1), time: '08:00', seats: 3, price: 8 },
		{ dep: 'Tunis', dst: 'Sfax', date: future(2), time: '07:30', seats: 4, price: 12 },
		{ dep: 'Sousse', dst: 'Sfax', date: future(2), time: '09:00', seats: 2, price: 7 },
		{ dep: 'Tunis', dst: 'Bizerte', date: future(3), time: '10:00', seats: 3, price: 7 },
		{ dep: 'Sfax', dst: 'Gabès', date: future(3), time: '11:00', seats: 4, price: 9 },
		{ dep: 'Tunis', dst: 'Hammamet', date: future(4), time: '08:30', seats: 3, price: 6 },
		{ dep: 'Sousse', dst: 'Tunis', date: future(5), time: '07:00', seats: 2, price: 8 },
		{ dep: 'Tunis', dst: 'Djerba', date: future(6), time: '06:00', seats: 4, price: 22 }
	];

	const insert = db.prepare(`
		INSERT INTO trips
			(driver_id, departure, destination, date, time, seats, price)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`);

	trips.forEach((t) => {
		insert.run(driverId, t.dep, t.dst, t.date, t.time, t.seats, t.price);
	});

	console.log('Seed: inserted sample trips');
}

seedTrips();

module.exports = router;
