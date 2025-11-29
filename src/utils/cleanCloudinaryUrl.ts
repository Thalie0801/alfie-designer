/**
 * Nettoie les URLs Cloudinary en supprimant les transformations problématiques
 * qui causent des erreurs 404
 */

export function cleanCloudinaryUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Si ce n'est pas une URL Cloudinary, la retourner telle quelle
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  try {
    // Pattern pour détecter les transformations Cloudinary
    // Format: /upload/[transformations]/path
    const cloudinaryPattern = /^(https?:\/\/[^\/]+\/[^\/]+\/[^\/]+\/upload\/)([^\/]+\/)*(.+)$/;
    const match = url.match(cloudinaryPattern);

    if (!match) {
      return url;
    }

    const [, baseUrl, transformations, path] = match;

    // Liste des transformations problématiques à supprimer
    const problematicTransformations = [
      'e_zoompan',
      'e_loop',
      'e_reverse',
      'e_accelerate',
      'e_boomerang',
    ];

    // Si l'URL contient des transformations problématiques, les supprimer
    if (transformations && problematicTransformations.some(t => transformations.includes(t))) {
      console.log('[cleanCloudinaryUrl] Removing problematic transformations from:', url);
      // Retourner l'URL sans transformations
      return `${baseUrl}${path}`;
    }

    // Si les transformations semblent valides, garder l'URL telle quelle
    return url;
  } catch (error) {
    console.error('[cleanCloudinaryUrl] Error cleaning URL:', error);
    return url;
  }
}

/**
 * Valide si une URL est accessible (format valide)
 */
export function isValidMediaUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim();
  
  // Vérifier si c'est une URL HTTP(S) ou une data URL
  return trimmed.startsWith('http://') || 
         trimmed.startsWith('https://') || 
         trimmed.startsWith('data:');
}

/**
 * Obtient la meilleure URL disponible pour un asset
 */
export function getBestAvailableUrl(
  outputUrl: string | null | undefined,
  thumbnailUrl: string | null | undefined,
  preferThumbnail: boolean = false
): string | null {
  // Si on préfère le thumbnail et qu'il est valide
  if (preferThumbnail) {
    const cleanedThumbnail = cleanCloudinaryUrl(thumbnailUrl);
    if (isValidMediaUrl(cleanedThumbnail)) {
      return cleanedThumbnail;
    }
  }

  // Essayer l'output_url en premier
  const cleanedOutput = cleanCloudinaryUrl(outputUrl);
  if (isValidMediaUrl(cleanedOutput)) {
    return cleanedOutput;
  }

  // Fallback sur thumbnail
  const cleanedThumbnail = cleanCloudinaryUrl(thumbnailUrl);
  if (isValidMediaUrl(cleanedThumbnail)) {
    return cleanedThumbnail;
  }

  return null;
}
