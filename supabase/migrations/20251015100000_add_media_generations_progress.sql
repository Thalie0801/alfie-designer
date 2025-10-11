-- Ensure media_generations has a progress column to track video completion status
alter table public.media_generations
  add column if not exists progress integer not null default 0;
