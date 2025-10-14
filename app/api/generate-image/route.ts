import 'server-only';
import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type AR = '1:1' | '9:16' | '16:9' | '3:4';

const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
const LOVABLE_API_BASE = process.env.LOVABLE_API_BASE || 'https://api.lovable.ai';
const LOVABLE_NANO_ENDPOINT =
  process.env.LOVABLE_NANO_ENDPOINT || '/v1/gemini/nano-banana:generate';

const need = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`${name} manquant dans l'env`);
  }
  return value;
};

const b64ToDataUrl = (b64: string, mime = 'image/png') => `data:${mime};base64,${b64}`;

function mapAR(ar?: AR) {
  switch (ar) {
    case '9:16':
      return { w: 1024, h: 1820 };
    case '16:9':
      return { w: 1820, h: 1024 };
    case '3:4':
      return { w: 1152, h: 1536 };
    case '1:1':
    default:
      return { w: 1024, h: 1024 };
  }
}

export async function POST(req: NextRequest) {
  try {
    need(LOVABLE_API_KEY, 'LOVABLE_API_KEY');

    const { prompt, aspectRatio = '1:1', count = 1, seed } = (await req.json()) as {
      prompt?: string;
      aspectRatio?: AR;
      count?: number;
      seed?: number;
    };

    if (!prompt) {
      return Response.json({ error: 'prompt requis' }, { status: 400 });
    }

    const { w, h } = mapAR(aspectRatio);
    const n = Math.max(1, Math.min(count || 1, 4));

    const res = await fetch(`${LOVABLE_API_BASE}${LOVABLE_NANO_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        count: n,
        width: w,
        height: h,
        seed,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return Response.json({ error: `Lovable ${res.status}: ${t}` }, { status: 502 });
    }

    const data = await res.json();

    let urls: string[] = [];

    if (Array.isArray(data?.urls) && data.urls.length) {
      urls = data.urls;
    } else {
      const base64s: string[] =
        data?.images?.map((x: any) => x?.base64) ??
        data?.candidates?.flatMap((c: any) =>
          (c?.data ?? []).map((p: any) => p?.base64).filter(Boolean)
        ) ??
        [];

      if (!base64s.length) {
        return Response.json({ error: 'Aucune image renvoyée par Lovable' }, { status: 502 });
      }

      urls = base64s.map((b64) => b64ToDataUrl(b64));
    }

    return Response.json({
      ok: true,
      provider: 'lovable-nano-banana',
      count: urls.length,
      width: w,
      height: h,
      urls,
    });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Erreur inconnue' }, { status: 500 });
  }
}
