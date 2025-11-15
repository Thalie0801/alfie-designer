-- Track per-endpoint request quotas for unauthenticated edge functions
create table if not exists public.http_rate_limits (
  id bigserial primary key,
  ip_address text not null,
  endpoint text not null,
  window_start timestamptz not null,
  count int not null default 0
);

create index if not exists http_rate_limits_ip_endpoint_idx
  on public.http_rate_limits (ip_address, endpoint, window_start);
