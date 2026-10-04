-- Run this migration against PostgreSQL before enabling real users or payments.
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  display_name TEXT NOT NULL,
  fish_balance BIGINT NOT NULL DEFAULT 0 CHECK (fish_balance >= 0),
  cash_balance NUMERIC(20, 6) NOT NULL DEFAULT 0 CHECK (cash_balance >= 0),
  reserved_cash NUMERIC(20, 6) NOT NULL DEFAULT 0 CHECK (reserved_cash >= 0),
  pending_cash NUMERIC(20, 6) NOT NULL DEFAULT 0 CHECK (pending_cash >= 0),
  bait_count INTEGER NOT NULL DEFAULT 0 CHECK (bait_count >= 0),
  cylinder_count INTEGER NOT NULL DEFAULT 0 CHECK (cylinder_count >= 0),
  casts INTEGER NOT NULL DEFAULT 0 CHECK (casts >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE caught_fish (
  id UUID PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('Comum','Raro','Épico','Lendário')),
  daily_cash NUMERIC(20, 6) NOT NULL CHECK (daily_cash > 0),
  caught_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX caught_fish_player_caught_at ON caught_fish(player_id, caught_at DESC);
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  kind TEXT NOT NULL,
  fish_delta BIGINT NOT NULL DEFAULT 0,
  cash_delta NUMERIC(20, 6) NOT NULL DEFAULT 0,
  reference_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  cash_amount NUMERIC(20, 6) NOT NULL CHECK (cash_amount > 0),
  destination_address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_manual','confirmed_manual','rejected')),
  transaction_hash TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
