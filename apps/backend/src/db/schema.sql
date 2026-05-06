-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username        VARCHAR(50)  UNIQUE NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  avatar_url      TEXT,
  xp              INTEGER NOT NULL DEFAULT 0,
  level           INTEGER NOT NULL DEFAULT 1,
  streak_days     INTEGER NOT NULL DEFAULT 0,
  last_study_date DATE,
  role            VARCHAR(20) NOT NULL DEFAULT 'student', -- student | teacher
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Decks
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS decks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  is_public     BOOLEAN NOT NULL DEFAULT FALSE,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  card_count    INTEGER NOT NULL DEFAULT 0,
  student_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decks_owner     ON decks(owner_id);
CREATE INDEX IF NOT EXISTS idx_decks_is_public ON decks(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_decks_name      ON decks USING gin(to_tsvector('simple', name));

-- ─────────────────────────────────────────
-- Cards (flashcards inside a deck)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cards (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deck_id    UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front      TEXT NOT NULL,
  back       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id);

-- ─────────────────────────────────────────
-- User library (decks saved from public)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_decks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id    UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, deck_id)
);

CREATE INDEX IF NOT EXISTS idx_user_decks_user ON user_decks(user_id);

-- ─────────────────────────────────────────
-- SRS progress per user per card
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS card_progress (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id          UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  repetitions      INTEGER NOT NULL DEFAULT 0,
  easiness_factor  FLOAT   NOT NULL DEFAULT 2.5,
  interval_days    INTEGER NOT NULL DEFAULT 0,
  next_review_date DATE    NOT NULL DEFAULT CURRENT_DATE,
  last_quality     INTEGER,          -- 0-5 last answer quality
  status           VARCHAR(10) NOT NULL DEFAULT 'new', -- new | hard | review
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_card_progress_user        ON card_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_card_progress_review_date ON card_progress(user_id, next_review_date);

-- ─────────────────────────────────────────
-- Study sessions
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id       UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  mode          VARCHAR(20) NOT NULL, -- flip | multiple_choice | type
  cards_studied INTEGER NOT NULL DEFAULT 0,
  xp_earned     INTEGER NOT NULL DEFAULT 0,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON study_sessions(user_id);

-- ─────────────────────────────────────────
-- Daily activity (for heatmap)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_activity (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  cards_studied INTEGER NOT NULL DEFAULT 0,
  xp_earned     INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON daily_activity(user_id, activity_date);

-- ─────────────────────────────────────────
-- Teacher ↔ Student relationships
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_students (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);

-- Teacher invite tokens
CREATE TABLE IF NOT EXISTS invite_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(64) UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Teacher feedback to students
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_feedback (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Deck assignments from teacher to student
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deck_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id     UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, deck_id)
);

-- ─────────────────────────────────────────
-- Trigger: keep deck card_count in sync
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_deck_card_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE decks SET card_count = card_count + 1, updated_at = NOW() WHERE id = NEW.deck_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE decks SET card_count = card_count - 1, updated_at = NOW() WHERE id = OLD.deck_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_card_count
AFTER INSERT OR DELETE ON cards
FOR EACH ROW EXECUTE FUNCTION update_deck_card_count();

-- Trigger: keep deck student_count in sync
CREATE OR REPLACE FUNCTION update_deck_student_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE decks SET student_count = student_count + 1 WHERE id = NEW.deck_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE decks SET student_count = student_count - 1 WHERE id = OLD.deck_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_student_count
AFTER INSERT OR DELETE ON user_decks
FOR EACH ROW EXECUTE FUNCTION update_deck_student_count();
