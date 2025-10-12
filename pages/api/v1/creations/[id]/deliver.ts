import type { NextApiRequest, NextApiResponse } from 'next';
import { getSb } from '../../../../../lib/refonte/db';
import { buildStructuredZip } from '../../../../../lib/refonte/zip';

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
  type DeliverableRow = {
    brand_id: string;
    format: 'image' | 'carousel' | 'reel';
    objective: string | null;
    canva_link: string | null;
    zip_url: string | null;
    status: string;
    brand: { name: string | null } | null;
  };
  const deliverable = await supabase
    .from('deliverable')
    .select<DeliverableRow>('brand_id, format, objective, canva_link, zip_url, status, brand:brand_id(name)')
    .eq('id', id)
    .maybeSingle();

  if (deliverable.error || !deliverable.data) {
    return res.status(404).json({ error: 'not_found' });
  }

  const row = deliverable.data;

  if (!row.zip_url && row.status === 'ready') {
    const { zipPath } = await buildStructuredZip({
      brandName: row.brand?.name ?? 'Brand',
      format: row.format,
      title: row.objective ?? 'Livrable',
      assetFiles: [],
      exportFiles: [],
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
