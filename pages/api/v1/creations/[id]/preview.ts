import type { NextApiRequest, NextApiResponse } from 'next';
import { getSb } from '../../../../../lib/refonte/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'invalid_id' });
  }

  const supabase = getSb();
  const { data, error } = await supabase
    .from('deliverable')
    .select<{ status: string; preview_url: string | null }>('status, preview_url')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) {
    return res.status(404).json({ error: 'not_found' });
  }

  return res.json(data);
}
