const express = require('express');

const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

function getTodayDateString() {
	return new Date().toISOString().split('T')[0];
}

function isPositiveInteger(value) {
	return Number.isInteger(value) && value > 0;
}

router.get('/mine', authenticateToken, (req, res) => {
	try {
		const rows = db
			.prepare(
				`
				SELECT
					bookings.id,
					bookings.seats_booked,
					bookings.status,
					bookings.created_at,
					trips.id          AS trip_id,
					trips.departure,
					trips.destination,
					trips.date,
					trips.time,
					trips.price,
					users.name        AS driver_name
				FROM bookings
				JOIN trips ON bookings.trip_id = trips.id
				JOIN users ON trips.driver_id  = users.id
				WHERE bookings.passenger_id = ?
				ORDER BY trips.date ASC
			`
			)
			.all(req.user.id);

		const today = getTodayDateString();
		const upcoming = [];
		const past = [];

		rows.forEach((row) => {
			const booking = {
				id: row.id,
				seats_booked: row.seats_booked,
				status: row.status,
				created_at: row.created_at,
				trip: {
					id: row.trip_id,
					departure: row.departure,
					destination: row.destination,
					date: row.date,
					time: row.time,
					price: row.price,
					driver_name: row.driver_name
				}
			};

			if (row.date >= today) {
				upcoming.push(booking);
			} else {
				past.push(booking);
			}
		});

		return res.status(200).json({ upcoming, past });
	} catch (err) {
		console.error('Booking mine error:', err);
		return res.status(500).json({ error: 'Erreur serveur interne' });
	}
});

router.get('/trip/:tripId', authenticateToken, (req, res) => {
	try {
		const tripId = Number(req.params.tripId);
		if (!isPositiveInteger(tripId)) {
			return res.status(404).json({ error: 'Trajet introuvable' });
		}

		const trip = db
			.prepare('SELECT id, driver_id FROM trips WHERE id = ?')
			.get(tripId);

		if (!trip) {
			return res.status(404).json({ error: 'Trajet introuvable' });
		}

		if (trip.driver_id !== req.user.id) {
			return res.status(403).json({ error: 'Non autorisé' });
		}

		const passengers = db
			.prepare(
				`
				SELECT
					bookings.id,
					bookings.seats_booked,
					bookings.status,
					bookings.created_at,
					users.name   AS passenger_name,
					users.phone  AS passenger_phone
				FROM bookings
				JOIN users ON bookings.passenger_id = users.id
				WHERE bookings.trip_id = ?
				AND bookings.status = 'confirmed'
				ORDER BY bookings.created_at ASC
			`
			)
			.all(tripId);

		const totalSeatsBooked = passengers.reduce(
			(sum, booking) => sum + booking.seats_booked,
			0
		);

		return res.status(200).json({
			trip_id: tripId,
			passengers,
			total_seats_booked: totalSeatsBooked
		});
	} catch (err) {
		console.error('Booking trip passengers error:', err);
		return res.status(500).json({ error: 'Erreur serveur interne' });
	}
});

router.post('/', authenticateToken, (req, res) => {
	try {
		const tripId = Number(req.body.trip_id);
		if (!isPositiveInteger(tripId)) {
			return res.status(400).json({ error: 'Identifiant de trajet invalide' });
		}

		let seatsBooked = 1;
		if (req.body.seats_booked !== undefined) {
			const parsedSeats = Number(req.body.seats_booked);
			if (!Number.isInteger(parsedSeats) || parsedSeats < 1 || parsedSeats > 4) {
				return res
					.status(400)
					.json({ error: 'Vous pouvez réserver entre 1 et 4 places' });
			}

			seatsBooked = parsedSeats;
		}

		const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
		if (!trip) {
			return res.status(404).json({ error: 'Trajet introuvable' });
		}

		if (trip.driver_id === req.user.id) {
			return res
				.status(403)
				.json({ error: 'Vous ne pouvez pas réserver votre propre trajet' });
		}

		const today = getTodayDateString();
		if (trip.date < today) {
			return res.status(400).json({ error: 'Ce trajet est déjà passé' });
		}

		const existingBooking = db
			.prepare(
				`SELECT id FROM bookings
				 WHERE trip_id = ? AND passenger_id = ? AND status = 'confirmed'`
			)
			.get(tripId, req.user.id);

		if (existingBooking) {
			return res.status(409).json({ error: 'Vous avez déjà réservé ce trajet' });
		}

		const bookTrip = db.transaction((selectedTripId, passengerId, selectedSeats) => {
			const tripInTransaction = db
				.prepare('SELECT seats FROM trips WHERE id = ?')
				.get(selectedTripId);

			if (!tripInTransaction) {
				return { error: 'trip_not_found' };
			}

			const duplicateInTransaction = db
				.prepare(
					`SELECT id FROM bookings
					 WHERE trip_id = ? AND passenger_id = ? AND status = 'confirmed'`
				)
				.get(selectedTripId, passengerId);

			if (duplicateInTransaction) {
				return { error: 'already_booked' };
			}

			const booked = db
				.prepare(
					`SELECT COALESCE(SUM(seats_booked), 0) AS total
					 FROM bookings
					 WHERE trip_id = ? AND status = 'confirmed'`
				)
				.get(selectedTripId);

			const available = tripInTransaction.seats - booked.total;

			if (available < selectedSeats) {
				return { error: 'insufficient_seats', available };
			}

			const result = db
				.prepare(
					`INSERT INTO bookings (trip_id, passenger_id, seats_booked)
					 VALUES (?, ?, ?)`
				)
				.run(selectedTripId, passengerId, selectedSeats);

			return { booking_id: result.lastInsertRowid };
		});

		const outcome = bookTrip(tripId, req.user.id, seatsBooked);

		if (outcome.error === 'trip_not_found') {
			return res.status(404).json({ error: 'Trajet introuvable' });
		}

		if (outcome.error === 'already_booked') {
			return res.status(409).json({ error: 'Vous avez déjà réservé ce trajet' });
		}

		if (outcome.error === 'insufficient_seats') {
			return res.status(409).json({
				error: `Places insuffisantes. ${outcome.available} place(s) disponible(s).`
			});
		}

		const tripDetails = db
			.prepare(
				`SELECT departure, destination, date, time, price
				 FROM trips
				 WHERE id = ?`
			)
			.get(tripId);

		return res.status(201).json({
			message: 'Réservation confirmée',
			booking_id: outcome.booking_id,
			trip: {
				departure: tripDetails.departure,
				destination: tripDetails.destination,
				date: tripDetails.date,
				time: tripDetails.time,
				price: tripDetails.price
			}
		});
	} catch (err) {
		console.error('Booking creation error:', err);
		return res.status(500).json({ error: 'Erreur serveur interne' });
	}
});

router.delete('/:id', authenticateToken, (req, res) => {
	try {
		const bookingId = Number(req.params.id);
		if (!isPositiveInteger(bookingId)) {
			return res.status(404).json({ error: 'Réservation introuvable' });
		}

		const booking = db
			.prepare('SELECT * FROM bookings WHERE id = ?')
			.get(bookingId);

		if (!booking) {
			return res.status(404).json({ error: 'Réservation introuvable' });
		}

		if (booking.passenger_id !== req.user.id) {
			return res.status(403).json({ error: 'Non autorisé' });
		}

		if (booking.status === 'cancelled') {
			return res
				.status(400)
				.json({ error: 'Cette réservation est déjà annulée' });
		}

		const trip = db
			.prepare('SELECT date FROM trips WHERE id = ?')
			.get(booking.trip_id);

		if (!trip) {
			return res.status(404).json({ error: 'Trajet introuvable' });
		}

		const today = getTodayDateString();
		if (trip.date < today) {
			return res
				.status(400)
				.json({ error: "Impossible d'annuler un trajet déjà effectué" });
		}

		db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(
			booking.id
		);

		return res.status(200).json({ message: 'Réservation annulée' });
	} catch (err) {
		console.error('Booking cancel error:', err);
		return res.status(500).json({ error: 'Erreur serveur interne' });
	}
});

module.exports = router;
