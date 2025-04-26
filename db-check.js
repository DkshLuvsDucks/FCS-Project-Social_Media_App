const mysql = require('mysql2');
const fs = require('fs');

// Read database connection from .env file manually
const envFile = fs.readFileSync('./backend/.env', 'utf8');
const dbUrlMatch = envFile.match(/DATABASE_URL="([^"]+)"/);

if (!dbUrlMatch) {
  console.error('Could not find DATABASE_URL in .env file');
  process.exit(1);
}

// Parse the connection string
const dbUrl = dbUrlMatch[1];
const dbParts = dbUrl.replace('mysql://', '').split('@');
const authParts = dbParts[0].split(':');
const hostParts = dbParts[1].split('/');
const dbNameParts = hostParts[1].split('?');

const config = {
  host: hostParts[0].split(':')[0],
  port: hostParts[0].includes(':') ? hostParts[0].split(':')[1] : 3306,
  user: authParts[0],
  password: authParts[1],
  database: dbNameParts[0]
};

console.log(`Connecting to MySQL: ${config.host}:${config.port} as ${config.user}`);

// Create a connection
const connection = mysql.createConnection(config);

// Connect to the database
connection.connect(function(err) {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  
  console.log('Connected to MySQL successfully!');
  
  // Try to query the User table
  connection.query('SELECT COUNT(*) as count FROM User', function(err, results) {
    if (err) {
      console.error('Error querying User table:', err.message);
      connection.end();
      process.exit(1);
    }
    
    console.log(`Found ${results[0].count} users in the database.`);
    connection.end();
    process.exit(0);
  });
});
