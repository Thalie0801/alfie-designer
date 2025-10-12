import type { NextApiRequest, NextApiResponse } from 'next';
import { getSb } from '../../../../../lib/refonte/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'invalid_id' });
  }

  const supabase = getSb();
  const deliverable = await supabase
    .from('deliverable')
    .select<{ status: string }>('status')
    .eq('id', id)
    .maybeSingle();
  if (deliverable.error || !deliverable.data) {
    return res.status(404).json({ error: 'not_found' });
  }

  const { status } = deliverable.data;
  if (status !== 'awaiting_premium_confirmation') {
    return res.status(409).json({ error: 'not_awaiting_confirmation' });
  }

  const confirmResult = await supabase.rpc('confirm_premium_deliverable', {
    p_deliverable: id
  });

  if (confirmResult.error) {
    return res.status(500).json({ error: 'confirmation_failed' });
  }

  const payload = confirmResult.data as
    | { status: string }
    | { error: string; status?: string }
    | null;

  if (!payload) {
    return res.status(500).json({ error: 'confirmation_failed' });
  }

  if ('error' in payload) {
    if (payload.error === 'not_found') {
      return res.status(404).json({ error: 'not_found' });
    }
    if (payload.error === 'not_awaiting_confirmation') {
      return res
        .status(409)
        .json({ error: 'not_awaiting_confirmation', status: payload.status });
    }

    return res.status(500).json({ error: 'confirmation_failed' });
  }

  return res.json({ ok: true, status: payload.status });
}
