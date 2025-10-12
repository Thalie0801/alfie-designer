import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'node:crypto';
import { q, yyyymm } from '../../../../../lib/refonte/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'invalid_id' });
  }

  const deliverable = await q<{ brand_id: string; status: string }>(
    'SELECT brand_id, status FROM deliverable WHERE id = $1',
    [id]
  );
  if (!deliverable.rowCount) {
    return res.status(404).json({ error: 'not_found' });
  }

  const { brand_id: brandId, status } = deliverable.rows[0];
  if (status !== 'awaiting_premium_confirmation') {
    return res.status(409).json({ error: 'not_awaiting_confirmation' });
  }

  await q('SELECT increment_counters($1, $2, $3, $4)', [brandId, 0, 0, 1]);
  await q(
    'INSERT INTO usage_event(id, brand_id, deliverable_id, kind, meta) VALUES ($1, $2, $3, $4, $5)',
    [randomUUID(), brandId, id, 'premium_t2v', JSON.stringify({ period: yyyymm() })]
  );
  await q("UPDATE deliverable SET status = 'queued' WHERE id = $1", [id]);

  return res.json({ ok: true, status: 'queued' });
}
