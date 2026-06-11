-- Discord notifications: DB trigger (submit/approve) + daily reminder cron
-- Run this in Supabase Dashboard → SQL Editor (after deploying the two
-- edge functions and setting secrets — see README / project notes).
--
-- QUEST_HOOK_SECRET below must match the value set via
-- `supabase secrets set QUEST_HOOK_SECRET=...`

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ── 1. submit/approve → discord-notify ─────────────────────
create or replace function public.notify_discord()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'https://ivxbpxmwvmjdtqreyizd.supabase.co/functions/v1/discord-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-quest-secret', '<QUEST_HOOK_SECRET>'
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'record', to_jsonb(new),
      'old_record', case when TG_OP = 'UPDATE' then to_jsonb(old) else null end
    )
  );
  return new;
end;
$$;

drop trigger if exists discord_notify on public.submissions;
create trigger discord_notify
  after insert or update on public.submissions
  for each row execute function public.notify_discord();

-- ── 2. daily reminder cron (11:00 UTC = 20:00 KST) ─────────
select cron.unschedule('discord-reminder-daily')
where exists (select 1 from cron.job where jobname = 'discord-reminder-daily');

select cron.schedule(
  'discord-reminder-daily',
  '0 11 * * *',
  $$
  select net.http_post(
    url := 'https://ivxbpxmwvmjdtqreyizd.supabase.co/functions/v1/discord-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-quest-secret', '<QUEST_HOOK_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
