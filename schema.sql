-- ZuZu schema (PostgreSQL). Idempotent: server.js runs this on every startup.
-- Timestamps are epoch milliseconds (BIGINT) to match the frontend.
CREATE TABLE IF NOT EXISTS users(
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  avatar TEXT,
  banner TEXT,
  created_at BIGINT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower ON users(lower(username));
-- Continue with Google: Google-only accounts have no password.
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS users_email_lower ON users(lower(email));

CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS posts(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  image TEXT,
  parent_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  repost_of INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS posts_user ON posts(user_id, created_at);
CREATE INDEX IF NOT EXISTS posts_created ON posts(created_at);
CREATE INDEX IF NOT EXISTS posts_parent ON posts(parent_id);
CREATE INDEX IF NOT EXISTS posts_repost ON posts(repost_of);

CREATE TABLE IF NOT EXISTS likes(
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  PRIMARY KEY(user_id, post_id));
CREATE INDEX IF NOT EXISTS likes_post ON likes(post_id);

CREATE TABLE IF NOT EXISTS follows(
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  PRIMARY KEY(follower_id, followee_id));
CREATE INDEX IF NOT EXISTS follows_followee ON follows(followee_id);

CREATE TABLE IF NOT EXISTS notifications(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at);

-- Uploaded images (post images, avatars, banners), served by GET /media/:id.
-- Post images are tied to their post (deleted with it); avatars/banners to their user.
CREATE TABLE IF NOT EXISTS media(
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BYTEA NOT NULL,
  created_at BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS media_post ON media(post_id);

-- Direct messages. One conversation per pair of users (user_a < user_b keeps the pair unique),
-- a membership row per user carrying last_read_at (read tracking), and the messages themselves.
CREATE TABLE IF NOT EXISTS dm_conversations(
  id SERIAL PRIMARY KEY,
  user_a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at BIGINT NOT NULL,
  last_message_at BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT dm_pair_ordered CHECK (user_a < user_b),
  CONSTRAINT dm_pair_unique UNIQUE (user_a, user_b));
CREATE INDEX IF NOT EXISTS dm_conversations_b ON dm_conversations(user_b);

CREATE TABLE IF NOT EXISTS dm_members(
  conversation_id INTEGER NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY(conversation_id, user_id));
CREATE INDEX IF NOT EXISTS dm_members_user ON dm_members(user_id);

-- DM images live in media with conversation_id set; /media/:id only serves them to members.
ALTER TABLE media ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES dm_conversations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS media_conversation ON media(conversation_id);

CREATE TABLE IF NOT EXISTS dm_messages(
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  media_id TEXT REFERENCES media(id) ON DELETE SET NULL,
  created_at BIGINT NOT NULL,
  CONSTRAINT dm_text_len CHECK (char_length(text) <= 1000));
CREATE INDEX IF NOT EXISTS dm_messages_conv_id ON dm_messages(conversation_id, id);
CREATE INDEX IF NOT EXISTS dm_messages_conv_created ON dm_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS dm_messages_sender ON dm_messages(sender_id);

-- Admin dashboard: demo/seeded accounts are flagged so they don't count as real sign-ups.
-- The first time the column is added, existing seed accounts (same usernames as seed.js, password
-- accounts only) are backfilled; seed.js sets the flag itself for new seeds. Idempotent.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'is_demo') THEN
    ALTER TABLE users ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE;
    UPDATE users SET is_demo = TRUE WHERE google_id IS NULL AND lower(username) IN
      ('demo', 'akhil', 'priya_codes', 'rahul_cricket', 'spacenerd', 'foodie_arjun', 'newsbot', 'design_ananya');
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS users_created ON users(created_at);
CREATE INDEX IF NOT EXISTS likes_created ON likes(created_at);
CREATE INDEX IF NOT EXISTS dm_messages_created ON dm_messages(created_at);

-- "Choose your ideal" (a role model the user looks up to). All nullable; presets live in public/ideals.js.
-- ideal_preset_id is set for presets (NULL for "make your own"); ideal_qualities holds 1-3 quality keys,
-- the first being the primary quality that sets the colour.
ALTER TABLE users ADD COLUMN IF NOT EXISTS ideal_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ideal_preset_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ideal_qualities TEXT[];
