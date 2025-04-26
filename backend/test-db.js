require('dotenv').config();
const mysql = require('mysql2');

console.log("Connection string:", process.env.DATABASE_URL);
const connection = mysql.createConnection(process.env.DATABASE_URL);

connection.connect(function(err) {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to MySQL successfully!');
  connection.end();
});
