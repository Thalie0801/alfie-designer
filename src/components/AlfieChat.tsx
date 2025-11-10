// src/components/AlfieChat.tsx
import React, { useCallback, useEffect, useState } from "react";
import { enqueue_job, libraryLink, search_assets, studioLink } from "@/ai/tools";
import { normalizeIntent, type AlfieIntent } from "@/ai/intent";
import { Templates } from "@/ai/templates";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export default function AlfieChat() {
  const activeBrandId = "default-brand"; // TODO: remplace par ton vrai contexte brand

  // === ÉTATS (déclare UNE SEULE fois) ===
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Salut, je suis Alfie. Dis-moi ce que tu veux créer.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [lastIntent, setLastIntent] = useState<AlfieIntent | null>(null);

  // === HELPERS (une seule version) ===
  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleSend = useCallback(
    async (userText: string) => {
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: userText,
        createdAt: new Date().toISOString(),
      };
      addMessage(userMsg);

      const intent = normalizeIntent({
        brandId: activeBrandId,
        kind: /carrousel|carousel/i.test(userText)
          ? "carousel"
          : /vidéo|video/i.test(userText)
          ? "video"
          : "image",
        copyBrief: userText,
      });
      setLastIntent(intent);

      // Récap
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: Templates.recapBeforeLaunch(intent),
        createdAt: new Date().toISOString(),
      });

      // Lancement direct (exemple)
      const { orderId } = await enqueue_job({ intent });
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: Templates.confirmAfterEnqueue(
          orderId,
          studioLink(orderId),
          libraryLink(intent.brandId)
        ),
        createdAt: new Date().toISOString(),
      });
    },
    [activeBrandId, addMessage]
  );

  // === Hook proprement fermé (pas de virgule orpheline) ===
  useEffect(() => {
    // Exemple: rafraîchir périodiquement (noop pour l’instant)
    // Tu peux ajouter un interval ici si besoin.
  }, [activeBrandId, addMessage, lastIntent]);

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
            <div className="inline-block rounded-xl px-3 py-2 border">
              <pre className="whitespace-pre-wrap">{m.content}</pre>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem("chat") as HTMLInputElement | null;
          if (!input || !input.value.trim()) return;
          void handleSend(input.value.trim());
          input.value = "";
        }}
        className="flex gap-2"
      >
        <input
          name="chat"
          className="flex-1 border rounded-lg px-3 py-2"
          placeholder="Décris ce que tu veux créer…"
        />
        <button type="submit" className="border rounded-lg px-3 py-2">
          Envoyer
        </button>
      </form>
    </div>
  );
}
