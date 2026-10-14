const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const expressSession = require('express-session');
const pgSession = require('connect-pg-simple')(expressSession);

const app = express();
const port = Number(process.env.PORT);

app.use(express.json());

// Session configuration
app.use(expressSession({
    store: new pgSession({
        pool: pool,
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 8 * 60 * 60 * 1000}
}));

// Authentication middleware
async function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            message: 'Please log in.'
        });
    }

    try {
        const result = await pool.query(
            `SELECT id, username, role, is_deleted
             FROM users
             WHERE id = $1`,
            [req.session.userId]
        );

        const user = result.rows[0];

        if (!user || user.is_deleted || !['member', 'manager'].includes(user.role)) {
            return req.session.destroy((error) => {
                res.clearCookie('connect.sid');

                if (error) {
                    console.error('Session removal failed:', error.message);
                    return res.status(500).json({
                        message: 'Unable to clear session.'
                    });
                }

                res.status(401).json({
                    message: 'Please log in.'
                });
            });
        }

        req.user = user;

        next();
    } catch (error) {
        console.error('Authentication failed:', error.message);

        res.status(500).json({
            message: 'Unable to verify account.'
        });
    }
}

// Manager-role middleware
function requireManager(req, res, next) {
    if (req.user.role !== 'manager') {
        return res.status(403).json({
            message: 'Manager access required.'
        });
    }

    next();
}

// Temporary health check route
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        console.error('Health check failed:', error.message);
        res.status(503).json({ status: 'error', database: 'unavailable' });
    }
});

// Register route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({
            message: 'Username and password must be strings.'
        });
    }

    if (username.length < 1 || username.length > 50) {
        return res.status(400).json({
            message: 'Username must contain 1 to 50 characters.'
        });
    }

    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
        return res.status(400).json({
            message: 'Password must contain at least 8 characters and fit within 72 UTF-8 bytes.'
        });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (username, password_hash, role)
             VALUES ($1, $2, 'member')
             ON CONFLICT (username) DO NOTHING
             RETURNING id, username, role`,
            [username, passwordHash]
        );

        if (result.rowCount === 0) {
            return res.status(409).json({
                message: 'Username is already in use.'
            });
        }

        res.status(201).json({
            message: 'Registration successful.',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Registration failed:', error.message);

        res.status(500).json({
            message: 'Unable to register account.'
        });
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({
            message: 'Username and password must be strings.'
        });
    }

    if (username.length < 1 || username.length > 50 || password.length === 0 || Buffer.byteLength(password, 'utf8') > 72) {
        return res.status(400).json({
            message: 'Invalid username or password format.'
        });
    }

    try {
        const result = await pool.query(
            `SELECT id, username, password_hash, role, is_deleted
             FROM users
             WHERE username = $1`,
            [username]
        );

        const user = result.rows[0];

        if (!user || user.is_deleted || !['member', 'manager'].includes(user.role)) {
            return res.status(401).json({
                message: 'Invalid username or password.'
            });
        }

        const passwordMatches = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatches) {
            return res.status(401).json({
                message: 'Invalid username or password.'
            });
        }

        req.session.regenerate((error) => {
            if (error) {
                console.error('Session regeneration failed:', error.message);
                return res.status(500).json({
                    message: 'Unable to log in.'
                });
            }

            req.session.userId = user.id;

            req.session.save((error) => {
                if (error) {
                    console.error('Session save failed:', error.message);
                    return res.status(500).json({
                        message: 'Unable to log in.'
                    });
                }
                
                res.json({
                    message: 'Login successful.',
                    user: {
                        id: user.id,
                        username: user.username,
                        role: user.role
                    }
                });
            });
        });
    } catch (error) {
        console.error('Login failed:', error.message);

        res.status(500).json({
            message: 'Unable to log in.'
        });
    }
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy((error) => {
        res.clearCookie('connect.sid');

        if (error) {
            console.error('Logout failed:', error.message);
            return res.status(500).json({
                message: 'Unable to log out.'
            });
        }

        res.json({
            message: 'Logout successful.'
        });
    });
});

// Current account route
app.get('/current', requireAuth, (req, res) => {
    res.json({
        user: req.user
    });
});

// Submit leave request route
app.post('/request', requireAuth, async (req, res) => {
    const { start_date, end_date, reason } = req.body;

    if (typeof start_date !== 'string' || typeof end_date !== 'string' || typeof reason !== 'string') {
        return res.status(400).json({
            message: 'Start date, end date and reason must be strings.'
        });
    }

    if (start_date.length === 0 || end_date.length === 0 || reason.length === 0) {
        return res.status(400).json({
            message: 'Start date, end date and reason are required.'
        });
    }

    const dateFormat = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateFormat.test(start_date) || !dateFormat.test(end_date)) {
        return res.status(400).json({
            message: 'Dates must use YYYY-MM-DD format.'
        });
    }

    if (end_date < start_date) {
        return res.status(400).json({
            message: 'End date must be on or after start date.'
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO leave_requests (user_id, start_date, end_date, reason)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [req.user.id, start_date, end_date, reason]
        );

        res.status(201).json({
            message: 'Leave request submitted successfully.',
            leaveRequest: result.rows[0]
        });
    } catch (error) {
        console.error('Failed to submit leave request:', error.message);
        res.status(500).json({
            message: 'Failed to submit leave request.'
        });
    }
});

app.listen(port, '127.0.0.1', () => {
    console.log(`Server running at http://127.0.0.1:${port}`);
});