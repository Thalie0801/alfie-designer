import { Download, ExternalLink, Film } from "lucide-react";
import { cn } from "@/lib/utils";

export type StudioAsset = {
  id: string;
  type: "image" | "carousel" | "video" | string;
  url?: string | null;
  coverUrl?: string | null;
  slideUrls?: string[] | null;
  ratio?: "1:1" | "9:16" | "16:9" | "3:4" | string;
  title?: string | null;
  created_at?: string | null;
  meta?: Record<string, unknown> | null;
};

export interface AssetCardProps {
  asset: StudioAsset;
  className?: string;
  onEnqueueVideo?: (asset: StudioAsset) => void;
}

const TYPE_LABEL: Record<string, string> = {
  image: "Image",
  carousel: "Carrousel",
  video: "Vidéo",
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  } catch (error) {
    console.warn("[AssetCard] Invalid date", { value, error });
    return null;
  }
}

function getPreviewUrl(asset: StudioAsset) {
  if (asset.type === "carousel" && asset.coverUrl) {
    return asset.coverUrl;
  }
  if (asset.url) {
    return asset.url;
  }
  if (asset.slideUrls?.length) {
    return asset.slideUrls[0] ?? null;
  }
  return null;
}

export function AssetCard({ asset, className, onEnqueueVideo }: AssetCardProps) {
  const previewUrl = getPreviewUrl(asset);
  const hasDownloadUrl = Boolean(asset?.url);
  const openHref = hasDownloadUrl ? String(asset.url) : undefined;
  const downloadHref = hasDownloadUrl
    ? `${asset!.url!}${asset!.url!.includes("?") ? "&" : "?"}fl_attachment`
    : undefined;

  const typeLabel = TYPE_LABEL[asset.type] ?? asset.type ?? "Asset";
  const createdAt = formatDate(asset.created_at);

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-white/70 p-4 shadow-sm",
        "dark:border-neutral-800 dark:bg-neutral-900/70",
        className,
      )}
    >
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={asset.title ?? `${typeLabel} ${asset.id}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-neutral-400">
            Aucun aperçu disponible
          </div>
        )}
      </div>

      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {asset.title ?? typeLabel}
          </p>
          <p className="truncate text-xs text-neutral-500">
            {asset.ratio ? `Format ${asset.ratio}` : "Format inconnu"}
            {createdAt ? ` • ${createdAt}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-800">
          {typeLabel}
        </span>
      </header>

      <footer className="flex flex-wrap items-center gap-2">
        <a
          href={openHref}
          target="_blank"
          rel="noopener"
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors",
            hasDownloadUrl
              ? "hover:bg-neutral-50 dark:hover:bg-neutral-800"
              : "pointer-events-none opacity-50",
          )}
          aria-disabled={!hasDownloadUrl}
        >
          <ExternalLink size={16} />
          Ouvrir
        </a>
        <a
          href={downloadHref}
          download
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors",
            hasDownloadUrl
              ? "hover:bg-neutral-50 dark:hover:bg-neutral-800"
              : "pointer-events-none opacity-50",
          )}
          aria-disabled={!hasDownloadUrl}
        >
          <Download size={16} />
          Télécharger
        </a>
        {asset.type === "carousel" && typeof onEnqueueVideo === "function" && (
          <button
            type="button"
            onClick={() => onEnqueueVideo(asset)}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            <Film size={16} />
            Transformer en vidéo
          </button>
        )}
      </footer>
    </article>
  );
}

export default AssetCard;
