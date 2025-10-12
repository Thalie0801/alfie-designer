import type { NextApiRequest, NextApiResponse } from 'next';
import { q } from '../../../../../lib/refonte/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'invalid_id' });
  }

  const record = await q('SELECT status, preview_url FROM deliverable WHERE id = $1', [id]);
  if (!record.rowCount) {
    return res.status(404).json({ error: 'not_found' });
  }

  return res.json(record.rows[0]);
}
