import type { NextApiRequest, NextApiResponse } from 'next';
import { q } from '../../../../../lib/refonte/db';
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

  const deliverable = await q<{
    brand_id: string;
    format: 'image' | 'carousel' | 'reel';
    objective: string | null;
    canva_link: string | null;
    zip_url: string | null;
    status: string;
    brand_name: string | null;
  }>(
    `SELECT d.brand_id, d.format, d.objective, d.canva_link, d.zip_url, d.status, b.name AS brand_name
       FROM deliverable d
       LEFT JOIN brand b ON b.id = d.brand_id
      WHERE d.id = $1`,
    [id]
  );

  if (!deliverable.rowCount) {
    return res.status(404).json({ error: 'not_found' });
  }

  const row = deliverable.rows[0];

  if (!row.zip_url && row.status === 'ready') {
    const { zipPath } = await buildStructuredZip({
      brandName: row.brand_name ?? 'Brand',
      format: row.format,
      title: row.objective ?? 'Livrable',
      assetFiles: [],
      exportFiles: [],
      meta: { altTexts: {}, captions: [] }
    });

    const localUrl = `file://${zipPath}`;
    await q('UPDATE deliverable SET zip_url = $2 WHERE id = $1', [id, localUrl]);
    row.zip_url = localUrl;
  }

  return res.json({
    canva_link: row.canva_link,
    zip_url: row.zip_url,
    status: row.status
  });
}
