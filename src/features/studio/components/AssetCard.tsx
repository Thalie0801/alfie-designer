import { useMemo } from "react";
import { Download, ExternalLink, Film } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toDownloadUrl, toThumbUrl } from "@/lib/cloudinary/url";
import { toThumbUrl, toDownloadUrl, toOriginalUrl } from "@/lib/cloudinary/url";
import { cn } from "@/lib/utils";

export type StudioAsset = {
  id: string;
  type: "image" | "video" | "carousel" | string;
  status?: string | null;
  createdAt?: string | null;
  previewUrl?: string | null;
  assetUrl?: string | null;
  downloadUrl?: string | null;
  videoUrl?: string | null;
  woofs?: number | null;
  engine?: string | null;
  carouselId?: string | null;
  orderId?: string | null;
  jobSetId?: string | null;
  aspectRatio?: string | null;
  title?: string | null;
};

export type AssetCardProps = {
  asset: StudioAsset;
  className?: string;
  onMissingUrl?: () => void;
  onCreateVideo?: (asset: StudioAsset) => void | Promise<void>;
  isCreatingVideo?: boolean;
};

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatStatus(status?: string | null): string | null {
  if (!status) return null;
  return status.replace(/_/g, " ").toUpperCase();
}
export function AssetCard({ asset, className, onEnqueueVideo }: AssetCardProps) {
  // ---- URLs (une seule fois) ----
  const hasUrl = Boolean(asset?.url || asset?.coverUrl);
  const srcForPreview = asset.coverUrl ?? asset.url ?? "";

  const previewSrc = srcForPreview ? toThumbUrl(srcForPreview) : undefined;
  const openHref = asset.url ? toOriginalUrl(asset.url) : undefined;
  const downloadHref = asset.url ? toDownloadUrl(asset.url) : undefined;

export function AssetCard({
  asset,
  className,
  onMissingUrl,
  onCreateVideo,
  isCreatingVideo = false,
}: AssetCardProps) {
  const createdLabel = formatDate(asset.createdAt);
  const statusLabel = formatStatus(asset.status);
  const engineLabel = asset.engine?.toUpperCase();
  const hasWoofs = typeof asset.woofs === "number" && asset.woofs > 0;
  const isVideo = asset.type === "video";
  const isCarousel = asset.type === "carousel" || Boolean(asset.carouselId || asset.jobSetId);

  const openHref = asset.assetUrl ?? asset.videoUrl ?? asset.downloadUrl ?? undefined;

  const previewSrc = useMemo(() => {
    const base = asset.previewUrl ?? asset.assetUrl ?? asset.videoUrl ?? asset.downloadUrl;
    if (!base) return undefined;
    return toThumbUrl(base, { type: isVideo ? "video" : "image", width: 960 }) ?? base ?? undefined;
  }, [asset.previewUrl, asset.assetUrl, asset.videoUrl, asset.downloadUrl, isVideo]);

  const downloadHref = useMemo(
    () => toDownloadUrl(asset.downloadUrl ?? asset.assetUrl ?? asset.videoUrl ?? asset.previewUrl ?? null),
    [asset.downloadUrl, asset.assetUrl, asset.videoUrl, asset.previewUrl],
  );

  const title = asset.title ?? `Asset ${asset.id.slice(0, 6)}`;

  const handleDownload = () => {
    if (downloadHref) {
      const link = document.createElement("a");
      link.href = downloadHref;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    onMissingUrl?.();
  };

  const handleCreateVideo = () => {
    if (!onCreateVideo) return;
    onCreateVideo(asset);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white/70 shadow-sm p-4 flex flex-col gap-4",
        "dark:bg-neutral-900/70 dark:border-neutral-800",
        className,
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
        {isVideo && asset.videoUrl ? (
          <video
            src={asset.videoUrl}
            poster={previewSrc}
            className="h-full w-full object-cover"
            controls
            preload="metadata"
      {/* Aperçu */}
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={asset.title ?? `Asset ${asset.id}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : previewSrc ? (
          <img src={previewSrc} alt={title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full w-full place-items-center text-neutral-400">Aucun aperçu disponible</div>
          <div className="h-full w-full grid place-items-center text-neutral-400">
            {hasUrl ? "Aucun aperçu" : "Aucun média disponible"}
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-wrap items-center gap-2">
          {statusLabel && <Badge variant="secondary">{statusLabel}</Badge>}
          {engineLabel && <Badge variant="outline">{engineLabel}</Badge>}
          {hasWoofs && <Badge variant="default">🐶 {asset.woofs}</Badge>}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" title={title}>
              {title}
            </div>
            <div className="text-xs text-neutral-500 truncate">
              {asset.type}
              {createdLabel ? ` • ${createdLabel}` : ""}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          asChild
          size="sm"
          variant="outline"
          className={cn(!openHref && "pointer-events-none opacity-60")}
      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Ouvrir */}
        <a
          href={openHref}
          target="_blank"
          rel="noopener"
          className={cn(
            "inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm",
            openHref ? "hover:bg-neutral-50 dark:hover:bg-neutral-800" : "pointer-events-none opacity-50"
          )}
          aria-disabled={!openHref}
        >
          <ExternalLink size={16} />
          Ouvrir l’asset
        </a>

        {/* Télécharger */}
        <a
          href={downloadHref}
          download
          className={cn(
            "inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm",
            downloadHref ? "hover:bg-neutral-50 dark:hover:bg-neutral-800" : "pointer-events-none opacity-50"
          )}
          aria-disabled={!downloadHref}
        >
          <a
            href={openHref ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              if (!openHref) {
                event.preventDefault();
                onMissingUrl?.();
              }
            }}
          >
            <ExternalLink size={16} /> Ouvrir
          </a>
        </Button>

        <Button size="sm" variant="outline" onClick={handleDownload} disabled={!downloadHref && !onMissingUrl}>
          <Download size={16} /> Télécharger
        </Button>

        {isCarousel && typeof onCreateVideo === "function" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCreateVideo}
            disabled={isCreatingVideo}
          >
            <Film size={16} /> {isCreatingVideo ? "Création…" : "Créer une vidéo"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default AssetCard;
