import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Trash2, PlayCircle, Image as ImageIcon, AlertCircle } from "lucide-react";
import { LibraryAsset } from "@/hooks/useLibraryAssets";
import { toDownloadUrl, toThumbUrl } from "@/lib/cloudinary/url";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface AssetCardProps {
  asset: LibraryAsset;
  selected: boolean;
  onSelect: () => void;
  onDownload: () => void;
  onDelete: () => void;
  daysUntilExpiry: number;
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} Mo`;
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function safeTimeAgo(dateISO?: string | null) {
  if (!dateISO) return "";
  const d = new Date(dateISO);
  if (isNaN(d.getTime())) return "";
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

export function AssetCard({ asset, selected, onSelect, onDownload, onDelete, daysUntilExpiry }: AssetCardProps) {
  const [imageError, setImageError] = useState(false);

  const previewSrc = useMemo(() => {
    const base = asset.thumbnail_url || asset.output_url || null;
    if (!base) return undefined;
    return (
      toThumbUrl(base, {
        type: asset.type === "video" ? "video" : "image",
        width: 960,
      }) ?? base
    );
  }, [asset.thumbnail_url, asset.output_url, asset.type]);

  const hasDirectOutput = useMemo(() => {
    if (!asset.output_url) return false;
    if (asset.thumbnail_url && asset.thumbnail_url === asset.output_url) return false;
    return asset.output_url.startsWith("http");
  }, [asset.output_url, asset.thumbnail_url]);

  const downloadHref = useMemo(() => {
    if (!hasDirectOutput) return undefined;
    return toDownloadUrl(asset.output_url);
  }, [asset.output_url, hasDirectOutput]);

  const handleDownloadClick = useCallback(() => {
    if (downloadHref) {
      const link = document.createElement("a");
      link.href = downloadHref;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    onDownload();
  }, [downloadHref, onDownload]);

  // Reset l'état d'erreur si l’URL change
  useEffect(() => {
    setImageError(false);
  }, [asset.output_url, asset.thumbnail_url, asset.type, previewSrc]);

  const expiryBadge = useMemo(() => {
    if (daysUntilExpiry < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          EXPIRÉ
        </Badge>
      );
    }
    if (daysUntilExpiry <= 3) {
      return (
        <Badge variant="destructive" className="text-xs">
          J-{daysUntilExpiry}
        </Badge>
      );
    }
    if (daysUntilExpiry <= 7) {
      return <Badge className="bg-orange-500 text-white text-xs">J-{daysUntilExpiry}</Badge>;
    }
    return (
      <Badge variant="secondary" className="text-xs">
        J-{daysUntilExpiry}
      </Badge>
    );
  }, [daysUntilExpiry]);

  const createdAgo = safeTimeAgo(asset.created_at);
  const duration = formatDuration(asset.duration_seconds as any);
  const fileSize = formatFileSize((asset as any).file_size_bytes);
  const engine = (asset.engine || "").toString();

  return (
    <Card className={`group hover:shadow-lg transition-all ${selected ? "ring-2 ring-primary" : ""}`}>
      <CardContent className="p-0 relative">
        {/* Checkbox de sélection */}
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect()}
            aria-label={selected ? "Désélectionner" : "Sélectionner"}
            className="bg-background/90 backdrop-blur border-2"
          />
        </div>

        {/* Badges en haut à droite */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
          {expiryBadge}
          {asset.is_source_upload && (
            <Badge variant="outline" className="bg-background/90 backdrop-blur text-xs">
              Source
            </Badge>
          )}
          {engine && (
            <Badge variant="outline" className="bg-background/90 backdrop-blur text-[10px] uppercase tracking-wide">
              {engine}
            </Badge>
          )}
          {asset.woofs > 0 && <Badge className="bg-purple-500 text-white text-xs">{asset.woofs} 🐕</Badge>}
        </div>

        {/* Preview */}
        <div className="relative aspect-video bg-muted overflow-hidden rounded-t-lg">
          {asset.type === "video" ? (
            <>
              {asset.output_url && !imageError && hasDirectOutput ? (
                <video
                  src={asset.output_url}
                  className="w-full h-full object-cover"
                  poster={previewSrc || asset.thumbnail_url || undefined}
                  preload="metadata"
                  controls
                  onError={() => setImageError(true)}
                  aria-label="Aperçu vidéo"
                />
              ) : previewSrc && !imageError ? (
                <img
                  src={previewSrc}
                  alt="Miniature vidéo"
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                  <PlayCircle className="h-16 w-16 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground text-center px-4">
                    {asset.status === "processing" ? "⏳ Génération en cours…" : "Aperçu indisponible"}
                  </p>
                </div>
              )}
              {duration && (
                <div className="absolute bottom-2 left-2">
                  <Badge className="bg-black/70 text-white text-xs">
                    <PlayCircle className="h-3 w-3 mr-1" />
                    {duration}
                  </Badge>
                </div>
              )}
            </>
          ) : (
            <>
              {previewSrc && !imageError ? (
                <img
                  src={previewSrc}
                  alt="Création"
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onError={() => setImageError(true)}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                  {imageError ? (
                    <>
                      <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">Erreur de chargement</p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-16 w-16 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">Génération…</p>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{createdAgo}</span>
            {fileSize && <span>{fileSize}</span>}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-0 gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={handleDownloadClick}
          disabled={asset.type === "video" && !asset.output_url}
          title={asset.type === "video" && !asset.output_url ? "Vidéo en cours de génération" : "Télécharger"}
          aria-disabled={(asset.type === "video" && !asset.output_url) || undefined}
        >
          <Download className="h-4 w-4 mr-2" />
          {asset.type === "video" && !asset.output_url ? "En génération…" : "Télécharger"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
          title="Supprimer"
          aria-label="Supprimer"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
