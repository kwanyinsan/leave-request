CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'pending',
    decided_by INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date)
);