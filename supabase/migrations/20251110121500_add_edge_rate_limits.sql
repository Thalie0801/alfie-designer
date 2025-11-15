create table if not exists public.edge_rate_limits (
  id bigserial primary key,
  endpoint text not null,
  client_id text not null,
  window_start timestamptz not null,
  count int not null default 0
);

create index if not exists edge_rate_limits_idx
  on public.edge_rate_limits (endpoint, client_id, window_start);
