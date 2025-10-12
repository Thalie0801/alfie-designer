import type { NextApiRequest, NextApiResponse } from 'next';
import { getSb } from '../../../../../lib/refonte/db';
import { buildStructuredZip } from '../../../../../lib/refonte/zip';
import { multiSlideOk, type CarouselMeta } from '../../../../../lib/refonte/carousel_guard';

type DeliverableRow = {
  brand_id: string;
  format: 'image' | 'carousel' | 'reel';
  objective: string | null;
  canva_link: string | null;
  zip_url: string | null;
  status: string;
  meta: Record<string, unknown> | null;
  brand: { name: string | null } | null;
};

function asCarouselMeta(meta: DeliverableRow['meta']): CarouselMeta {
  if (meta && typeof meta === 'object') {
    const candidate = meta as CarouselMeta;
    return {
      ...candidate,
      slides: Array.isArray(candidate.slides) ? [...candidate.slides] : []
    };
  }
  return {};
}

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
  const deliverable = await supabase
    .from('deliverable')
    .select<DeliverableRow>(
      'brand_id, format, objective, canva_link, zip_url, status, meta, brand:brand_id(name)'
    )
    .eq('id', id)
    .maybeSingle();

  if (deliverable.error || !deliverable.data) {
    return res.status(404).json({ error: 'not_found' });
  }

  const row = deliverable.data;
  const meta = asCarouselMeta(row.meta);

  if (row.format === 'carousel') {
    const check = multiSlideOk(meta);
    if (!check.ok) {
      return res
        .status(409)
        .json({ error: 'not_multislide', expected: check.expected, actual: check.actual });
    }
  }

  if (!row.zip_url && row.status === 'ready') {
    const { zipPath } = await buildStructuredZip({
      brandName: row.brand?.name ?? 'Brand',
      format: row.format,
      title: row.objective ?? 'Livrable',
      assetFiles: [],
      exportFiles: meta.slides ?? [],
      meta: { altTexts: {}, captions: [] }
    });

    const localUrl = `file://${zipPath}`;
    await supabase.from('deliverable').update({ zip_url: localUrl }).eq('id', id);
    row.zip_url = localUrl;
  }

  return res.json({
    canva_link: row.canva_link,
    zip_url: row.zip_url,
    status: row.status
  });
}
