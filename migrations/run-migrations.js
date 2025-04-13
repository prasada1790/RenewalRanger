const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  // Create database connection
  const connection = await mysql.createConnection({
    host: '217.21.74.127',
    user: 'u856729253_renew_user',
    password: 'Coinage@1790',
    database: 'u856729253_renew',
    multipleStatements: true // Important for running multiple SQL statements
  });

  try {
    console.log('Connected to MySQL database');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'sql', 'create_tables.sql');
    const sqlQueries = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Executing SQL migrations...');
    
    // Execute the SQL statements
    const [results] = await connection.query(sqlQueries);
    
    console.log('Database tables created successfully');
    
    // Close the connection
    await connection.end();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error executing migrations:', error);
    await connection.end();
  }
}

runMigrations();