import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'node:crypto';
import { getSb } from '../../../../lib/refonte/db';
import flags from '../../../../config/feature_flags.json';
import carouselPolicy from '../../../../config/carousel_policy.json';

type CreatePayload = {
  format: 'image' | 'carousel' | 'reel';
  objective?: string;
  styleChoice: 'template_canva' | 'ia';
  brandId: string;
  brandKitId?: string;
  assets?: string[];
  premiumT2VRequested?: boolean;
};

type DeliverableInsert = {
  id: string;
  brand_id: string;
  format: CreatePayload['format'];
  objective: string | null;
  style_choice: CreatePayload['styleChoice'];
  status: string;
  meta: Record<string, unknown>;
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

  const meta: Record<string, unknown> = {};
  if (format === 'carousel') {
    meta.locale = (flags.default_locale as string | undefined) ?? carouselPolicy.locale ?? 'fr-FR';
    meta.slidesWanted = carouselPolicy.slides_default ?? 5;
    meta.minSlides = carouselPolicy.min_slides ?? 4;
    meta.maxSlides = carouselPolicy.max_slides ?? 6;
    meta.banCollageGrids = Boolean(
      (flags.ban_collage_grids as boolean | undefined) ?? carouselPolicy.forbid_grids
    );
    meta.suppressTextInImages = Boolean(
      (flags.suppress_text_in_images as boolean | undefined) ?? carouselPolicy.text_overlay_only
    );
    meta.templateFirst = Boolean(
      (flags.carousel_template_first as boolean | undefined) ?? carouselPolicy.template_first
    );
  }

  const id = randomUUID();
  const status = premiumT2VRequested ? 'awaiting_premium_confirmation' : 'queued';

  const supabase = getSb();
  const payload: DeliverableInsert = {
    id,
    brand_id: brandId,
    format,
    objective: objective ?? null,
    style_choice: styleChoice,
    status,
    meta
  };
  const { error } = await supabase.from('deliverable').insert(payload);
  if (error) {
    return res.status(500).json({ error: 'db_error', details: error.message });
  }

  return res.status(201).json({
    id,
    status,
    requiresPremiumConfirmation: Boolean(premiumT2VRequested)
  });
}
