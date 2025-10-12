CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Confirm premium deliverable in a single transaction to avoid double usage
CREATE OR REPLACE FUNCTION confirm_premium_deliverable(p_deliverable UUID)
RETURNS JSONB AS $$
DECLARE
  rec deliverable%ROWTYPE;
  period INT;
BEGIN
  SELECT * INTO rec
  FROM deliverable
  WHERE id = p_deliverable
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF rec.status <> 'awaiting_premium_confirmation' THEN
    RETURN jsonb_build_object(
      'error', 'not_awaiting_confirmation',
      'status', rec.status
    );
  END IF;

  period := yyyymm(now());

  PERFORM increment_counters(rec.brand_id, 0, 0, 1);

  INSERT INTO usage_event (id, brand_id, deliverable_id, kind, meta)
  VALUES (
    gen_random_uuid(),
    rec.brand_id,
    rec.id,
    'premium_t2v',
    jsonb_build_object('period', period)
  );

  UPDATE deliverable
  SET status = 'queued'
  WHERE id = rec.id;

  RETURN jsonb_build_object('status', 'queued');
END;
$$ LANGUAGE plpgsql;
