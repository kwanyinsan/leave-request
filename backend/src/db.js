require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool();

pool.on('error', (error) => {
    console.error('PostgreSQL pool error:', error.message);
});

module.exports = pool;