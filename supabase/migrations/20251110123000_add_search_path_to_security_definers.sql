create or replace function public.create_default_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Créer l'abonnement Starter pour chaque nouvel utilisateur
  insert into user_subscriptions (user_id, plan_id, status, current_period_end)
  select
    NEW.id,
    plans.id,
    'trial',
    now() + interval '14 days'
  from plans
  where plans.slug = 'starter'
  on conflict (user_id) do nothing;

  -- Créer l'entrée d'usage pour le mois en cours
  insert into user_usage (user_id, period_start, period_end)
  values (
    NEW.id,
    date_trunc('month', now()),
    date_trunc('month', now()) + interval '1 month'
  )
  on conflict (user_id, period_start) do nothing;

  return NEW;
end;
$$;

create or replace function public.check_user_quota(
  p_user_id uuid,
  p_quota_type text,
  p_increment integer default 1
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_limits jsonb;
  v_current_usage integer;
  v_max_allowed integer;
begin
  select p.limits into v_plan_limits
  from user_subscriptions us
  join plans p on p.id = us.plan_id
  where us.user_id = p_user_id and us.status = 'active';

  if not found then
    return false;
  end if;

  v_max_allowed := (v_plan_limits->>p_quota_type)::integer;

  if v_max_allowed = -1 then
    return true;
  end if;

  if p_quota_type = 'visuals_per_month' then
    select visuals_created into v_current_usage
    from user_usage
    where user_id = p_user_id
      and period_start <= now()
      and period_end > now();
  elsif p_quota_type = 'brands' then
    select brands_count into v_current_usage
    from user_usage
    where user_id = p_user_id
      and period_start <= now()
      and period_end > now();
  end if;

  return (coalesce(v_current_usage, 0) + p_increment) <= v_max_allowed;
end;
$$;

create or replace function public.increment_brand_usage(p_brand_id uuid, p_videos int, p_woofs int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update brands
  set videos_used = coalesce(videos_used,0) + p_videos,
      woofs_used  = coalesce(woofs_used,0)  + p_woofs
  where id = p_brand_id
    and (coalesce(videos_used,0) + p_videos) <= quota_videos
    and (coalesce(woofs_used,0)  + p_woofs)  <= quota_woofs;

  if found then
    return true;
  else
    return false;
  end if;
end;
$$;

grant execute on function public.increment_brand_usage(uuid,int,int) to authenticated, service_role;

create or replace function public.increment_profile_visuals(p_profile_id uuid, p_delta int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_month text := to_char(now() at time zone 'UTC', 'YYYY-MM');
begin
  update profiles
  set visuals_month = case when coalesce(visuals_month_key,'') = current_month
                           then coalesce(visuals_month,0) + p_delta
                      else p_delta
                 end,
      visuals_month_key = current_month
  where id = p_profile_id;
end;
$$;

grant execute on function public.increment_profile_visuals(uuid,int) to authenticated, service_role;
