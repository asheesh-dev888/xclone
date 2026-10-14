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
      ('demo', 'zuzu_builder', 'priya_codes', 'rahul_cricket', 'spacenerd', 'foodie_arjun', 'newsbot', 'design_ananya');
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

-- Momo the monkey: one short cached reflection per post (generated once by Groq, NULL until then).
ALTER TABLE posts ADD COLUMN IF NOT EXISTS monkey_thought TEXT;

-- Video posts + Reels. The video itself lives on Cloudinary (never in Postgres): one row per post with the asset id,
-- Cloudinary's own metadata (checked on post) and a poster URL. Deleted with the post; the asset goes into
-- video_deletions first so the server can destroy it on Cloudinary (best effort, retried).
CREATE TABLE IF NOT EXISTS post_videos(
  post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  public_id TEXT NOT NULL,
  cloud_name TEXT NOT NULL,
  version BIGINT,
  format TEXT,
  duration REAL NOT NULL,
  width INTEGER,
  height INTEGER,
  bytes BIGINT,
  poster TEXT,
  is_reel BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS post_videos_public_id ON post_videos(public_id);
CREATE INDEX IF NOT EXISTS post_videos_reels ON post_videos(post_id DESC) WHERE is_reel;
CREATE INDEX IF NOT EXISTS post_videos_created ON post_videos(created_at);

CREATE TABLE IF NOT EXISTS video_deletions(
  public_id TEXT PRIMARY KEY,
  cloud_name TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at BIGINT NOT NULL);

-- Reports (posts, profiles, DM messages) for moderation on /admin.
CREATE TABLE IF NOT EXISTS reports(
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  snapshot TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at BIGINT NOT NULL,
  resolved_at BIGINT,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_reporter_idx ON reports(reporter_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS reports_open_unique ON reports(reporter_id, target_type, target_id) WHERE status = 'open';

-- Web Push subscriptions (VAPID) + per-user language preferences.
CREATE TABLE IF NOT EXISTS push_subscriptions(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at BIGINT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS push_subscriptions_user ON push_subscriptions(user_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ui_lang TEXT NOT NULL DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_lang TEXT NOT NULL DEFAULT 'auto';
-- Momo thoughts in a chosen language style (hi / hinglish / en); 'auto' keeps using posts.monkey_thought.
CREATE TABLE IF NOT EXISTS monkey_thoughts(
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  thought TEXT NOT NULL,
  PRIMARY KEY(post_id, lang));

-- Momo moods (classified with the thought) + outfits unlocked by milestones.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS monkey_mood TEXT;
ALTER TABLE monkey_thoughts ADD COLUMN IF NOT EXISTS mood TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS momo_outfit TEXT;
-- Polls: 2–4 options, 1 hour – 7 days, one vote per user.
CREATE TABLE IF NOT EXISTS polls(
  post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  options JSONB NOT NULL,
  ends_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS poll_votes(
  post_id INTEGER NOT NULL REFERENCES polls(post_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_idx INTEGER NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY(post_id, user_id));
-- Voice posts: audio-only Cloudinary assets in post_videos.
ALTER TABLE post_videos ADD COLUMN IF NOT EXISTS is_audio BOOLEAN NOT NULL DEFAULT FALSE;

-- Batch D: daily thought challenge (answers are posts tagged with the IST day), ideal circles, 24h stories.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS challenge_day TEXT;
CREATE INDEX IF NOT EXISTS posts_challenge_day ON posts(challenge_day) WHERE challenge_day IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS posts_challenge_once ON posts(user_id, challenge_day) WHERE challenge_day IS NOT NULL AND parent_id IS NULL AND repost_of IS NULL;
CREATE TABLE IF NOT EXISTS circle_members(
  circle TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at BIGINT NOT NULL,
  PRIMARY KEY (circle, user_id));
CREATE INDEX IF NOT EXISTS circle_members_user ON circle_members(user_id);
CREATE TABLE IF NOT EXISTS stories(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  media_id TEXT,
  public_id TEXT,
  cloud_name TEXT,
  version BIGINT,
  duration REAL,
  width INTEGER,
  height INTEGER,
  sticker TEXT,
  caption TEXT,
  caption_pos REAL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS stories_user_exp ON stories(user_id, expires_at);
CREATE INDEX IF NOT EXISTS stories_exp ON stories(expires_at);
CREATE TABLE IF NOT EXISTS story_views(
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at BIGINT NOT NULL,
  PRIMARY KEY (story_id, user_id));

-- Rename the old demo account to a neutral one (idempotent; only the seeded demo row, never a real account).
UPDATE users SET username = 'zuzu_builder', name = 'ZuZu Builder',
  bio = CASE WHEN bio = 'Builder. Curious about everything.' THEN 'Building ZuZu in public. Say hi!' ELSE bio END
WHERE lower(username) = 'akhil' AND is_demo AND google_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM users WHERE lower(username) = 'zuzu_builder');
