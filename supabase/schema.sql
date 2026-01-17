create extension if not exists pgcrypto;

create table if not exists usernames (
  id uuid primary key default gen_random_uuid(),
  chain_id text not null,
  username text not null,
  address text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists usernames_chain_username_idx
  on usernames (chain_id, username);
create unique index if not exists usernames_chain_address_idx
  on usernames (chain_id, address);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  chain_id text not null,
  timestamp bigint not null,
  referrer text not null,
  user_address text not null,
  tx_hash text not null,
  market_id bigint not null,
  amount text not null,
  type text not null,
  created_at timestamptz not null default now()
);

create index if not exists referrals_chain_referrer_idx
  on referrals (chain_id, referrer);
create index if not exists referrals_chain_user_idx
  on referrals (chain_id, user_address);
create index if not exists referrals_chain_timestamp_idx
  on referrals (chain_id, timestamp desc);

