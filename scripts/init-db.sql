-- Create the 'users' table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL, -- Ethereum address
    farcaster_id VARCHAR(255) UNIQUE, -- Farcaster ID (e.g., FID)
    farcaster_username VARCHAR(255) UNIQUE, -- Farcaster username
    farcaster_pfp_url TEXT, -- Farcaster profile picture URL
    spotify_user_id VARCHAR(255) UNIQUE, -- Spotify user ID
    spotify_display_name VARCHAR(255), -- Spotify display name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the 'communities' table
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL, -- e.g., 'OK COMPUTERS', 'MFERS'
    slug VARCHAR(255) UNIQUE NOT NULL, -- e.g., 'okcomputers', 'mfers' (for URL routing)
    contract_address VARCHAR(42), -- NFT contract address
    blockchain VARCHAR(255), -- e.g., 'Base', 'Ethereum'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a join table for 'users' and 'communities' (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_communities (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, community_id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the 'onchain_playlists' table
CREATE TABLE IF NOT EXISTS onchain_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    playlist_name VARCHAR(255) NOT NULL,
    spotify_url TEXT NOT NULL,
    farcaster_cast_url TEXT UNIQUE, -- Link to the Farcaster cast
    cover_image_url TEXT,
    description TEXT,
    total_tracks INTEGER,
    total_duration VARCHAR(255),
    owner_display_name VARCHAR(255), -- Spotify owner display name
    communities TEXT[], -- Array of community names (e.g., ['OK COMPUTERS', 'MFERS'])
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the 'linked_accounts' table for external services (Spotify, Farcaster)
CREATE TABLE IF NOT EXISTS linked_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'spotify', 'farcaster'
    provider_id VARCHAR(255) UNIQUE NOT NULL, -- Spotify user ID, Farcaster FID
    access_token TEXT, -- Encrypted if sensitive
    refresh_token TEXT, -- Encrypted if sensitive
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, provider) -- A user can only link one account per provider
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_farcaster_id ON users(farcaster_id);
CREATE INDEX IF NOT EXISTS idx_users_spotify_user_id ON users(spotify_user_id);
CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_user_communities_user_id ON user_communities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_communities_community_id ON user_communities(community_id);
CREATE INDEX IF NOT EXISTS idx_onchain_playlists_user_id ON onchain_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_onchain_playlists_farcaster_cast_url ON onchain_playlists(farcaster_cast_url);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_user_id ON linked_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_provider_id ON linked_accounts(provider_id);

-- Seed initial communities (optional, but good for testing)
INSERT INTO communities (name, slug, contract_address, blockchain, description) VALUES
('OK COMPUTERS', 'okcomputers', '0xce2830932889c7fb5e5206287c43554e673dcc88', 'Base', 'The official community for OK COMPUTERS NFT holders.'),
('MFERS', 'mfers', '0x79FCDEF22feeD20eDDacbB2587640e45491b757f', 'Ethereum', 'The official community for MFERS NFT holders.')
ON CONFLICT (name) DO NOTHING;
