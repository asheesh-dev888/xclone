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
