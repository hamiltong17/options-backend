const express = require('express');
const Database = require('better-sqlite3')
const app = express();
const db = new Database('mydb.db');


db.prepare(`CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY,
	name TEXT
)`).run();

db.prepare(`INSERT INTO users (name) VALUES (?)`).run('Tiffany');


app.get('/users', (req, res) => {

const users = db.prepare('SELECT * FROM users').all();
res.json(users);

});

app.listen(3000, () => {
	
	console.log('Server running on https://localhost:3000');

});
