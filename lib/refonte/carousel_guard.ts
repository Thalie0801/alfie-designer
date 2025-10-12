export type CarouselMeta = {
  slidesWanted?: number;
  slides?: string[];
  locale?: 'fr-FR' | 'en-US';
  banCollageGrids?: boolean;
  suppressTextInImages?: boolean;
  templateFirst?: boolean;
  minSlides?: number;
  maxSlides?: number;
};

export function multiSlideOk(meta?: CarouselMeta) {
  const expected = meta?.slidesWanted ?? 5;
  const slides = Array.isArray(meta?.slides) ? meta.slides ?? [] : [];
  const minSlides = meta?.minSlides ?? 4;
  const actual = slides.length;
  const ok = actual >= Math.min(minSlides, expected);
  return { ok, expected, actual };
}

export function normalizedSlideNames(count: number) {
  return Array.from({ length: count }).map((_, index) =>
    `slide-${String(index + 1).padStart(2, '0')}.png`
  );
}
