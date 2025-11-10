-- Ensure admin RPC to reset stuck jobs in queue
create or replace function public.admin_reset_stuck_jobs(age_minutes integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reset_count integer := 0;
  v_requeued_count integer := 0;
  v_interval interval := greatest(coalesce(age_minutes, 10), 1) * interval '1 minute';
begin
  update public.job_queue
  set
    status = 'pending',
    error = null,
    updated_at = now(),
    retry_count = greatest(coalesce(retry_count, 0) + 1, 0)
  where status in ('processing', 'running')
    and updated_at < now() - v_interval;
  get diagnostics v_reset_count = row_count;

  update public.job_queue
  set
    status = 'pending',
    updated_at = now()
  where status = 'queued'
    and updated_at < now() - v_interval;
  get diagnostics v_requeued_count = row_count;

  return jsonb_build_object(
    'reset_count', coalesce(v_reset_count, 0),
    'requeued_count', coalesce(v_requeued_count, 0)
  );
end;
$$;

grant execute on function public.admin_reset_stuck_jobs(integer) to service_role;
