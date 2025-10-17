import { createHmac, timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto';

function toBuffer(hexOrString: string, encoding: BufferEncoding = 'utf8'): Buffer {
  return Buffer.from(hexOrString, encoding);
}

export function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return nodeTimingSafeEqual(a, b);
}

export function verifyHmacSHA256(rawBody: string, signatureHeader: string | null, secret: string | undefined): boolean {
  if (!secret) {
    throw new Error('VIDEO_WEBHOOK_SECRET is not configured.');
  }

  if (!signatureHeader) {
    return false;
  }

  const [scheme, signatureHex] = signatureHeader.split('=');

  if (scheme !== 'sha256' || !signatureHex) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

  const expectedBuffer = toBuffer(expected, 'hex');
  const receivedBuffer = toBuffer(signatureHex, 'hex');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function urlAllowed(url: string, csvPrefixesEnv: string | undefined): boolean {
  if (!csvPrefixesEnv) {
    return true;
  }

  const prefixes = csvPrefixesEnv
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (prefixes.length === 0) {
    return true;
  }

  return prefixes.some((prefix) => url.startsWith(prefix));
}
