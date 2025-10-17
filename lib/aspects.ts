export const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '3:4': { width: 960, height: 1280 },
  '4:3': { width: 1280, height: 960 },
  '9:16': { width: 960, height: 1706 },
  '16:9': { width: 1706, height: 960 },
};

export function resolveAspectDimensions(aspect: string) {
  return ASPECT_DIMENSIONS[aspect] ?? ASPECT_DIMENSIONS['1:1'];
}
