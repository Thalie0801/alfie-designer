import { useMemo, type ComponentType } from "react";
import { AlertCircle, Check, Clock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StudioJob = {
  id: string;
  type: string;
  status: string;
  order_id: string | null;
  created_at: string;
  error?: string | null;
  error_message?: string | null;
  output_url?: string | null;
};

type JobCardProps = {
  job: StudioJob;
  onRequeue?: (jobId: string) => void;
};

type StatusKey = "queued" | "running" | "done" | "completed" | "error" | "failed";

type StatusConfig = {
  label: string;
  className: string;
  icon: ComponentType<{ className?: string }> | null;
  iconClassName?: string;
};

const STATUS_STYLES: Record<StatusKey, StatusConfig> = {
  queued: {
    label: "En attente",
    className: "border-amber-200 bg-amber-100 text-amber-900",
import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import type { JobEntry } from "../types";

type NormalizedStatus = "queued" | "running" | "done" | "error" | "unknown";

const STATUS_MAP: Record<NormalizedStatus, { label: string; badgeClass: string; icon?: ComponentType<{ className?: string }> }> = {
  queued: {
    label: "En attente",
    badgeClass: "bg-amber-100 text-amber-800 border border-amber-200",
    icon: Clock,
  },
  running: {
    label: "En cours",
    className: "border-sky-200 bg-sky-100 text-sky-900",
    icon: Loader2,
    iconClassName: "animate-spin",
  },
  done: {
    label: "Terminé",
    className: "border-emerald-200 bg-emerald-100 text-emerald-900",
    icon: Check,
  },
  completed: {
    label: "Terminé",
    className: "border-emerald-200 bg-emerald-100 text-emerald-900",
    icon: Check,
  },
  error: {
    label: "Erreur",
    className: "border-red-200 bg-red-100 text-red-900",
    icon: AlertCircle,
  },
  failed: {
    label: "Erreur",
    className: "border-red-200 bg-red-100 text-red-900",
    icon: AlertCircle,
  },
};

function formatJobDate(value: string) {
  if (!value) return "";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function normalizeStatus(status: string): StatusKey | undefined {
  const normalized = status?.toLowerCase();

  if (normalized in STATUS_STYLES) {
    return normalized as StatusKey;
  }

  switch (normalized) {
    case "success":
    case "succeeded":
    case "finished":
      return "done";
    case "completed":
      return "completed";
    case "processing":
    case "in_progress":
      return "running";
    case "pending":
    case "waiting":
      return "queued";
    case "failed":
      return "failed";
    case "failure":
    case "errored":
      return "failed";
    default:
      return undefined;
  }
}

export function JobCard({ job, onRequeue }: JobCardProps) {
  const jobError = job.error_message || job.error || "";
  const statusKey = (normalizeStatus(job.status) ?? "queued") as StatusKey;
  const statusConfig = useMemo(() => STATUS_STYLES[statusKey], [statusKey]);
  const Icon = statusConfig.icon;
  const canRequeue = typeof onRequeue === "function" && ["error", "failed"].includes(statusKey);
  const outputUrl = job.output_url ?? "";
  const hasOutput = Boolean(outputUrl);
  const jobTypeLabel = job.type.replace(/_/g, " ");
  const actionAlignment =
    hasOutput && canRequeue ? "justify-between" : hasOutput ? "justify-start" : "justify-end";

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium capitalize truncate" title={jobTypeLabel}>
            {jobTypeLabel}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{formatJobDate(job.created_at)}</p>
          {job.order_id && (
            <p className="mt-1 text-xs text-muted-foreground">Commande #{job.order_id}</p>
          )}
        </div>
        <Badge
          variant="outline"
          className={cn("gap-1 whitespace-nowrap", statusConfig.className)}
        >
          {Icon ? <Icon className={cn("h-3.5 w-3.5", statusConfig.iconClassName)} /> : null}
          <span>{statusConfig.label}</span>
        </Badge>
      </div>

      {jobError ? (
        <p className="mt-3 text-xs text-red-600 truncate" title={jobError}>
          {jobError}
        </p>
      ) : null}

      {(hasOutput || canRequeue) && (
        <div
          className={cn("mt-3 flex flex-wrap items-center gap-2", actionAlignment)}
        >
          {hasOutput ? (
            <Button asChild size="sm" variant="outline">
              <a href={outputUrl} target="_blank" rel="noreferrer">
                Ouvrir
              </a>
            </Button>
          ) : null}

          {canRequeue ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onRequeue?.(job.id)}
            >
              Relancer
    badgeClass: "bg-sky-100 text-sky-700 border border-sky-200",
    icon: Loader2,
  },
  done: {
    label: "Terminé",
    badgeClass: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    icon: CheckCircle,
  },
  error: {
    label: "Erreur",
    badgeClass: "bg-red-100 text-red-700 border border-red-200",
    icon: AlertCircle,
  },
  unknown: {
    label: "Statut inconnu",
    badgeClass: "bg-secondary text-secondary-foreground",
  },
};

function normalizeStatus(status?: string | null): NormalizedStatus {
  if (!status) return "unknown";
  const value = status.toLowerCase();
  if (value === "pending" || value === "queued") return "queued";
  if (value === "processing" || value === "running") return "running";
  if (value === "done" || value === "completed" || value === "success") return "done";
  if (value === "failed" || value === "error") return "error";
  return "unknown";
}

interface JobCardProps {
  job: JobEntry;
  createdAt: string;
  onRetry?: (job: JobEntry) => void;
  isStuck?: boolean;
}

export function JobCard({ job, createdAt, onRetry, isStuck }: JobCardProps) {
  const normalized = normalizeStatus(job.status);
  const config = STATUS_MAP[normalized];
  const Icon = config.icon;
  const jobError = (job.error_message || job.error || "").toString().trim();
  const showRetry = Boolean(jobError && onRetry);

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium capitalize">{job.type.replace(/_/g, " ")}</p>
          <p className="text-xs text-muted-foreground">{createdAt}</p>
          {job.order_id && (
            <p className="text-xs text-muted-foreground">Commande #{job.order_id}</p>
          )}
          {isStuck && normalized === "queued" && (
            <p className="text-[11px] text-amber-600 font-medium">Bloqué depuis &gt; 10 min</p>
          )}
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "flex items-center gap-1 uppercase tracking-wide text-[11px]",
            config.badgeClass,
            normalized === "running" && "[&>svg]:animate-spin",
          )}
        >
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
          {config.label}
        </Badge>
      </div>

      {jobError && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-red-600 truncate" title={jobError}>
            {jobError}
          </p>
          {showRetry ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onRetry?.(job)}
            >
              Retenter
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
