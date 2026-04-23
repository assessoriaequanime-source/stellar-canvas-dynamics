-- SingulAI Database Schema (TEXT ids to match auth.js format)

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    wallet_address VARCHAR(255),
    wallet_encrypted_key TEXT,
    wallet_mnemonic TEXT,
    sgl_balance INTEGER DEFAULT 0,
    country VARCHAR(100),
    email_verification_token TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    first_bonus_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capsules (
    id VARCHAR(100) PRIMARY KEY,
    sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    sender_wallet VARCHAR(255),
    sender_name VARCHAR(255),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_wallet VARCHAR(255),
    recipient_whatsapp VARCHAR(50),
    title VARCHAR(500),
    message TEXT NOT NULL,
    delivery_type VARCHAR(50) DEFAULT 'immediate',
    delivery_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    sgl_cost INTEGER DEFAULT 100,
    tx_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capsule_attachments (
    id SERIAL PRIMARY KEY,
    capsule_id VARCHAR(100) REFERENCES capsules(id) ON DELETE CASCADE,
    file_name VARCHAR(500),
    file_type VARCHAR(100),
    mime_type VARCHAR(200),
    file_data TEXT,
    file_size INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255),
    tx_hash VARCHAR(255),
    block_number INTEGER,
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    amount VARCHAR(100),
    tx_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS avatar_memories (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    avatar_profile VARCHAR(100),
    key_insight TEXT,
    importance INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS avatar_usage (
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE DEFAULT CURRENT_DATE,
    message_count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, usage_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_capsules_sender ON capsules(sender_id);
CREATE INDEX IF NOT EXISTS idx_capsules_recipient ON capsules(recipient_email);
CREATE INDEX IF NOT EXISTS idx_capsules_status ON capsules(status, delivery_type, delivery_date);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_avatar_memories_user ON avatar_memories(user_id, avatar_profile);
CREATE INDEX IF NOT EXISTS idx_avatar_usage_user ON avatar_usage(user_id, usage_date);
