import React, { useCallback, useEffect, useMemo, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBrandKit } from "@/hooks/useBrandKit";
import { routeUserMessage } from "@/features/chat/assistantRouter";
import type { AlfieIntent } from "@/ai/intent";
import { enqueueAlfieJob, searchAlfieAssets, type AlfieJobStatus, type LibraryAsset } from "@/api/alfie";
import { libraryLink, studioLink } from "@/lib/links";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  quickReplies?: string[];
};

function generateId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? (crypto as Crypto).randomUUID()
    : Math.random().toString(36).slice(2);
}

const INITIAL_ASSISTANT: Message = {
  id: "assistant-intro",
  role: "assistant",
  content:
    "👋 Hey ! Je suis Alfie. Donne-moi un brief (format, objectif, CTA) et je te prépare un récap avant de lancer la génération.",
  createdAt: new Date().toISOString(),
};

export function AlfieChat() {
  const { activeBrandId, brandKit } = useBrandKit();
  const [messages, setMessages] = useState<Message[]>([INITIAL_ASSISTANT]);
  const [input, setInput] = useState("");
  const [pendingIntent, setPendingIntent] = useState<AlfieIntent | null>(null);
  const [lastIntent, setLastIntent] = useState<AlfieIntent | null>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<AlfieJobStatus[]>([]);
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [isSending, setIsSending] = useState(false);

  const brandName = brandKit?.name ?? "ta marque";

  const addMessage = useCallback((message: Message) => {
    const withTimestamp: Message = {
      ...message,
      createdAt: message.createdAt ?? new Date().toISOString(),
    };
    setMessages((current) => [...current, withTimestamp]);
  }, []);

  const handleUserMessage = useCallback(
    async (text: string) => {
      if (!activeBrandId) {
        toast.error("Sélectionne une marque active avant de discuter avec Alfie.");
        return;
      }

      const trimmed = text.trim();
      if (!trimmed) return;

      addMessage({ id: generateId(), role: "user", content: trimmed, createdAt: new Date().toISOString() });
      setInput("");
      setIsSending(true);

      try {
        const route = routeUserMessage(trimmed, {
          brandId: activeBrandId,
          baseIntent: lastIntent ?? undefined,
        });

        if (route.kind === "reply") {
          addMessage({
            id: generateId(),
            role: "assistant",
            content: route.text,
            createdAt: new Date().toISOString(),
            quickReplies: route.quickReplies,
          });
          setQuickReplies(route.quickReplies ?? []);
          setPendingIntent(null);
          return;
        }

        setQuickReplies([]);
        setPendingIntent(route.intent);
        setLastIntent(route.intent);
        addMessage({
          id: generateId(),
          role: "assistant",
          content: route.text,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[AlfieChat] routing failed", error);
        toast.error("Je n'ai pas compris ce brief, reformule-le en précisant le format et l'objectif.");
      } finally {
        setIsSending(false);
      }
    },
    [activeBrandId, addMessage, lastIntent]
  );

  const refreshStatuses = useCallback(
    async (targetOrderId: string) => {
      if (!activeBrandId) return;
      try {
        const payload = await searchAlfieAssets(activeBrandId, targetOrderId);
        setJobs(payload.jobs);
        setAssets(payload.assets);
      } catch (error) {
        console.error("[AlfieChat] status refresh failed", error);
      }
    },
    [activeBrandId]
  );

  useEffect(() => {
    if (!orderId) return;
    refreshStatuses(orderId);
    const interval = setInterval(() => {
      refreshStatuses(orderId);
    }, 5000);
    return () => clearInterval(interval);
  }, [orderId, refreshStatuses]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void handleUserMessage(input);
    },
    [handleUserMessage, input]
  );

  const handleQuickReply = useCallback(
    (reply: string) => {
      void handleUserMessage(reply);
    },
    [handleUserMessage]
  );

  const handleCancelRecap = useCallback(() => {
    setPendingIntent(null);
  }, []);

  const handleConfirmIntent = useCallback(async () => {
    if (!pendingIntent) return;
    if (!activeBrandId) {
      toast.error("Connecte une marque avant de lancer une génération.");
      return;
    }

    try {
      setIsSending(true);
      const result = await enqueueAlfieJob(pendingIntent);
      setOrderId(result.orderId);
      toast.success("Génération lancée ! Suis le statut ci-dessous.");
      setPendingIntent(null);
      addMessage({
        id: generateId(),
        role: "assistant",
        content: `C'est parti ! Tu peux suivre l'avancement depuis le Studio ou la Library.`,
        createdAt: new Date().toISOString(),
      });
      await refreshStatuses(result.orderId);
    } catch (error) {
      console.error("[AlfieChat] enqueue failed", error);
      const message = error instanceof Error ? error.message : "Impossible de lancer la génération.";
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  }, [activeBrandId, addMessage, pendingIntent, refreshStatuses]);

  const recapLines = useMemo(() => {
    if (!pendingIntent) return [] as string[];
    return [
      `• Format: ${pendingIntent.ratio} — ${pendingIntent.kind}`,
      `• Objectif: ${pendingIntent.goal}`,
      `• Tone: ${pendingIntent.tone_pack}`,
      `• Template: ${pendingIntent.templateId ?? "—"}`,
      `• Contenu: "${pendingIntent.copyBrief}"`,
    ];
  }, [pendingIntent]);

  const hasCompletedAsset = assets.some((asset) => asset.status === "ready" || asset.status === "done");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="rounded-lg border p-6">
        <div className="mb-4 space-y-3">
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              <div className="text-sm font-semibold text-muted-foreground">
                {message.role === "assistant" ? "Alfie" : "Toi"}
              </div>
              <p className="whitespace-pre-line text-base text-foreground">{message.content}</p>
              {message.quickReplies && message.quickReplies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.quickReplies.map((reply) => (
                    <Button key={reply} size="sm" variant="secondary" onClick={() => handleQuickReply(reply)}>
                      {reply}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <TextareaAutosize
            minRows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Ex: Carrousel 5 slides pour ${brandName}, objectif lead avec CTA "Demander une démo"`}
            className="w-full resize-none rounded-md border bg-background p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isSending}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isSending || !input.trim()}>
              Envoyer
            </Button>
          </div>
        </form>
      </div>

      {pendingIntent && (
        <Card>
          <CardHeader>
            <CardTitle>Récap de ta création</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 text-sm text-muted-foreground">
              {recapLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="flex gap-3">
              <Button onClick={handleConfirmIntent} disabled={isSending}>
                Oui, lancer
              </Button>
              <Button type="button" variant="outline" onClick={handleCancelRecap} disabled={isSending}>
                Modifier
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {orderId && (
        <StatusPanel
          orderId={orderId}
          jobs={jobs}
          assets={assets}
          hasPreview={hasCompletedAsset}
        />
      )}

      {quickReplies.length > 0 && !pendingIntent && (
        <div className="flex flex-wrap gap-2">
          {quickReplies.map((reply) => (
            <Button key={reply} size="sm" variant="outline" onClick={() => handleQuickReply(reply)}>
              {reply}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

interface StatusPanelProps {
  orderId: string;
  jobs: AlfieJobStatus[];
  assets: LibraryAsset[];
  hasPreview: boolean;
}

function StatusPanel({ orderId, jobs, assets, hasPreview }: StatusPanelProps) {
  const primaryStatus = jobs[0]?.status ?? "queued";
  const statusLabel = statusToLabel(primaryStatus);
  const studioHref = studioLink(orderId);
  const libraryHref = libraryLink(orderId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Statuts de la génération</CardTitle>
        <Badge variant="outline">{statusLabel}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button variant="secondary" asChild>
            <a href={studioHref} target="_blank" rel="noreferrer">
              Ouvrir Studio
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={libraryHref} target="_blank" rel="noreferrer">
              Voir Library
            </a>
          </Button>
        </div>
        <Separator />
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Historique</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            {jobs.map((job) => (
              <div key={job.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{job.type}</span>
                  <Badge variant="secondary">{statusToLabel(job.status)}</Badge>
                </div>
                {job.errorMessage && <p className="text-destructive">{job.errorMessage}</p>}
                {job.events.slice(0, 3).map((event) => (
                  <p key={event.id} className="text-xs">
                    {new Date(event.createdAt).toLocaleTimeString()} — {event.kind}
                    {event.message ? ` · ${event.message}` : ""}
                  </p>
                ))}
              </div>
            ))}
            {jobs.length === 0 && <p>Aucun job enregistré pour cette commande.</p>}
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Assets générés</h4>
          {hasPreview ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {assets.map((asset) => (
                <li key={asset.id}>
                  {asset.kind} — {asset.status} {asset.previewUrl && "·"}{" "}
                  {asset.previewUrl && (
                    <a
                      href={asset.previewUrl}
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Prévisualiser
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun média généré pour l'instant.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function statusToLabel(status: string): string {
  switch (status) {
    case "queued":
    case "pending":
      return "En attente";
    case "processing":
    case "running":
    case "rendering":
      return "En cours";
    case "done":
    case "completed":
    case "succeeded":
      return "Terminé";
    case "failed":
    case "error":
      return "En échec";
    default:
      return status;
  }
}
