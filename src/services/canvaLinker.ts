import { BrandKit } from '@/hooks/useBrandKit';

export interface CanvaLinkParams {
  templateUrl: string;
  brandKit?: BrandKit;
  customText?: string;
}

export function generateCanvaLink(params: CanvaLinkParams): string {
  const { templateUrl } = params;
  
  // Pour l'instant, on retourne simplement l'URL du template
  // Canva n'expose pas d'API publique pour pré-remplir les templates
  // mais on peut ouvrir le template directement
  
  return templateUrl;
}

export function openInCanva(params: CanvaLinkParams) {
  const link = generateCanvaLink(params);
  window.open(link, '_blank');
}
