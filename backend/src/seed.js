const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seed() {
    const memberPassword = process.env.SEED_MEMBER_PASSWORD;
    const managerPassword = process.env.SEED_MANAGER_PASSWORD;

    const memberHash = await bcrypt.hash(memberPassword, 10);
    const managerHash = await bcrypt.hash(managerPassword, 10);

    const result = await pool.query(
        `INSERT INTO users (username, password_hash, role)
         VALUES ('member', $1, 'member'),
                ('manager', $2, 'manager')
         ON CONFLICT (username) DO NOTHING
         RETURNING id, username, role`,
        [memberHash, managerHash]
    );

    console.log('Accounts inserted:', result.rowCount);
    console.log(result.rows);
}

seed()
    .catch((error) => {
        console.error('Seed failed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());