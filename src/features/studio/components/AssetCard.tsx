import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Download, Film, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StudioAsset {
  id: string;
  type: string;
  created_at: string;
  status?: string | null;
  url?: string | null;
  cloudinary_url?: string | null;
  metadata?: Record<string, any> | null;
}

interface AssetCardProps {
  asset: StudioAsset;
  onEnqueueVideo?: (asset: StudioAsset) => Promise<void> | void;
}

function formatDateLabel(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function resolveStatusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "queued":
      return "secondary";
    case "running":
      return "default";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function extractSlideUrls(metadata?: Record<string, any> | null): string[] {
  if (!metadata) return [];
  if (Array.isArray(metadata.slide_urls)) {
    return metadata.slide_urls.filter((url: unknown): url is string => typeof url === "string" && url.length > 0);
  }
  if (Array.isArray(metadata.slides)) {
    return metadata.slides
      .map((entry: unknown) => {
        if (!entry || typeof entry !== "object") return null;
        const record = entry as Record<string, any>;
        const candidates = [record.url, record.cloudinary_url, record.storage_url, record.thumbnail_url];
        for (const candidate of candidates) {
          if (typeof candidate === "string" && candidate.length > 0) {
            return candidate;
          }
        }
        return null;
      })
      .filter((url): url is string => typeof url === "string" && url.length > 0);
  }
  return [];
}

export function AssetCard({ asset, onEnqueueVideo }: AssetCardProps) {
  const metadata = asset.metadata ?? {};
  const createdAtLabel = useMemo(() => formatDateLabel(asset.created_at), [asset.created_at]);
  const status = (metadata.status ?? asset.status ?? "done") as string;
  const statusVariant = resolveStatusVariant(status);
  const woofs = typeof metadata.woofs === "number" ? metadata.woofs : null;
  const slideUrls = useMemo(() => extractSlideUrls(metadata), [metadata]);
  const isCarousel = asset.type === "carousel" || slideUrls.length > 0;

  const previewUrl = useMemo(() => {
    if (typeof metadata.thumbnail_url === "string" && metadata.thumbnail_url.length > 0) {
      return metadata.thumbnail_url;
    }
    if (typeof metadata.preview_url === "string" && metadata.preview_url.length > 0) {
      return metadata.preview_url;
    }
    if (isCarousel && slideUrls.length > 0) {
      return slideUrls[0];
    }
    if (asset.type === "video" && typeof metadata.video_url === "string" && metadata.video_url.length > 0) {
      return metadata.video_url;
    }
    if (typeof asset.cloudinary_url === "string" && asset.cloudinary_url.length > 0) {
      return asset.cloudinary_url;
    }
    if (typeof asset.url === "string" && asset.url.length > 0) {
      return asset.url;
    }
    return "";
  }, [asset.cloudinary_url, asset.type, asset.url, isCarousel, metadata, slideUrls]);

  const assetUrl = useMemo(() => {
    if (typeof asset.url === "string" && asset.url.length > 0) {
      return asset.url;
    }
    if (typeof metadata.download_url === "string" && metadata.download_url.length > 0) {
      return metadata.download_url;
    }
    if (asset.type === "video" && typeof metadata.video_url === "string" && metadata.video_url.length > 0) {
      return metadata.video_url;
    }
    if (typeof asset.cloudinary_url === "string" && asset.cloudinary_url.length > 0) {
      return asset.cloudinary_url;
    }
    return "";
  }, [asset.cloudinary_url, asset.type, asset.url, metadata]);

  const hasUrl = assetUrl.length > 0;
  const downloadExtension = asset.type === "video" ? "mp4" : "png";
  const separator = assetUrl.includes("?") ? "&" : "?";
  const downloadHref = hasUrl
    ? `${assetUrl}${separator}fl_attachment:alfie_${asset.id}.${downloadExtension}`
    : "";
  const slideCount = slideUrls.length > 0 ? slideUrls.length : null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium capitalize">{asset.type.replace(/_/g, " ")}</p>
          <p className="text-xs text-muted-foreground">{createdAtLabel}</p>
          {woofs !== null && <p className="text-xs text-muted-foreground">Woofs consommés : {woofs}</p>}
          {isCarousel && slideCount && (
            <p className="text-xs text-muted-foreground">{slideCount} slides</p>
          )}
        </div>
        <Badge variant={statusVariant} className="uppercase">
          {status}
        </Badge>
      </div>

      <div className="overflow-hidden rounded-md border bg-muted">
        {asset.type === "video" ? (
          previewUrl ? (
            <video src={previewUrl} controls className="w-full" preload="metadata" />
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )
        ) : previewUrl ? (
          <img src={previewUrl} alt="Media généré" className="w-full" loading="lazy" />
        ) : (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        {hasUrl ? (
          <a href={assetUrl} target="_blank" rel="noopener" className="text-sm font-medium text-primary hover:underline">
            Ouvrir l’asset →
          </a>
        ) : (
          <span className="text-sm font-medium text-muted-foreground">Ouvrir l’asset →</span>
        )}

        <div className="flex flex-wrap gap-2">
          {hasUrl ? (
            <a
              href={downloadHref}
              download
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 justify-center")}
            >
              <Download className="h-4 w-4" />
              Télécharger
            </a>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "flex-1 cursor-not-allowed justify-center opacity-50",
              )}
              aria-disabled
            >
              <Download className="h-4 w-4" />
              Télécharger
            </span>
          )}

          {isCarousel && onEnqueueVideo && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onEnqueueVideo(asset)}
              disabled={slideUrls.length === 0}
            >
              <Film className="h-4 w-4" />
              Transformer en vidéo
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
