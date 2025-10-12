import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'node:crypto';
import { getSb, yyyymm } from '../../../../../lib/refonte/db';

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
    .select<{ brand_id: string; status: string }>('brand_id, status')
    .eq('id', id)
    .maybeSingle();
  if (deliverable.error || !deliverable.data) {
    return res.status(404).json({ error: 'not_found' });
  }

  const { brand_id: brandId, status } = deliverable.data;
  if (status !== 'awaiting_premium_confirmation') {
    return res.status(409).json({ error: 'not_awaiting_confirmation' });
  }

  await supabase.rpc('increment_counters', {
    p_brand: brandId,
    d_images: 0,
    d_reels: 0,
    d_woofs: 1
  });
  await supabase.from('usage_event').insert({
    id: randomUUID(),
    brand_id: brandId,
    deliverable_id: id,
    kind: 'premium_t2v',
    meta: { period: yyyymm() }
  });
  await supabase.from('deliverable').update({ status: 'queued' }).eq('id', id);

  return res.json({ ok: true, status: 'queued' });
}
