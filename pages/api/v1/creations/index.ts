import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'node:crypto';
import { q } from '../../../../lib/refonte/db';

type CreatePayload = {
  format: 'image' | 'carousel' | 'reel';
  objective?: string;
  styleChoice: 'template_canva' | 'ia';
  brandId: string;
  brandKitId?: string;
  assets?: string[];
  premiumT2VRequested?: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body: CreatePayload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { format, objective, styleChoice, brandId, premiumT2VRequested = false } = body ?? ({} as CreatePayload);
  const allowedFormats: CreatePayload['format'][] = ['image', 'carousel', 'reel'];
  const allowedStyles: CreatePayload['styleChoice'][] = ['template_canva', 'ia'];

  if (!format || !allowedFormats.includes(format)) {
    return res.status(400).json({ error: 'invalid_format' });
  }
  if (!brandId || !allowedStyles.includes(styleChoice)) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  const id = randomUUID();
  const status = premiumT2VRequested ? 'awaiting_premium_confirmation' : 'queued';

  await q(
    `INSERT INTO deliverable(id, brand_id, format, objective, style_choice, status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, brandId, format, objective ?? null, styleChoice, status]
  );

  return res.status(201).json({
    id,
    status,
    requiresPremiumConfirmation: Boolean(premiumT2VRequested)
  });
}
