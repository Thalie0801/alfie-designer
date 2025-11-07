export const WOOF_SECONDS = 12;

export function woofsForVideo(durationSec: number) {
  const seconds = Number.isFinite(durationSec) ? Number(durationSec) : 0;
  return Math.max(1, Math.ceil(seconds / WOOF_SECONDS));
}
