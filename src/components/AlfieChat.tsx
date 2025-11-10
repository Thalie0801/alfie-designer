import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Role = "user" | "assistant" | "system";
type ChatMsg = { id: string; role: Role; content: string };

export default function AlfieChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Salut, je suis Alfie. Dis-moi ce que tu veux créer (image, carrousel, vidéo) et je m’occupe du reste.",
    },
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content) return;
    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Reçu. (Squelette minimal) — le routage vers l’orchestrateur/edge functions sera branché ici.",
      },
    ]);
    setInput("");
    inputRef.current?.focus();
  }, [input]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && canSend) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto bg-muted"
            )}
            aria-label={`${m.role} message`}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {m.content}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Décris ton besoin…"
            className="flex-1 rounded-xl border px-3 py-2 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              "rounded-xl px-4 py-2",
              canSend
                ? "bg-black text-white hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
