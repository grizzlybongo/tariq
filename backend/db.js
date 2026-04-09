require('dotenv').config();

const Database = require('better-sqlite3');

const db = new Database(process.env.DB_PATH);

db.pragma('foreign_keys = ON');

db.exec(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		phone TEXT,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'passenger',
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS trips (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		driver_id INTEGER NOT NULL REFERENCES users(id),
		departure TEXT NOT NULL,
		destination TEXT NOT NULL,
		date TEXT NOT NULL,
		time TEXT NOT NULL,
		seats INTEGER NOT NULL,
		price REAL NOT NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS bookings (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		trip_id INTEGER NOT NULL REFERENCES trips(id),
		passenger_id INTEGER NOT NULL REFERENCES users(id),
		seats_booked INTEGER NOT NULL DEFAULT 1,
		status TEXT NOT NULL DEFAULT 'confirmed',
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS driver_applications (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		phone TEXT NOT NULL,
		city TEXT NOT NULL,
		car_model TEXT NOT NULL,
		message TEXT,
		status TEXT NOT NULL DEFAULT 'pending',
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
`);

console.log('Database initialized');

module.exports = db;
