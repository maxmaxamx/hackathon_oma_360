"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Avatar } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

export type ChatMessageDto = {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; name: string; role: string };
  mine: boolean;
};

export function Chat({
  projectId,
  otherName,
  disabled,
}: {
  projectId: string;
  otherName: string;
  disabled?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/messages`);
        const data = (await res.json()) as { messages?: ChatMessageDto[] };
        if (!cancelled && data.messages) setMessages(data.messages);
      } catch {
        // silent retry on next tick
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(load, 4000);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [projectId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      const data = (await res.json()) as {
        message?: ChatMessageDto;
        error?: string;
      };
      if (!res.ok || !data.message) {
        setError(data.error ?? "Не удалось отправить сообщение.");
        return;
      }
      setMessages((current) => [...current, data.message!]);
      setText("");
    } catch {
      setError("Нет связи с сервером.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={otherName} size={32} />
          <div>
            <div className="text-sm font-semibold">{otherName}</div>
            <div className="flex items-center gap-1 text-[10px] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> в сети
            </div>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-muted">
          Чат
        </span>
      </div>

      <div ref={scrollRef} className="flex h-[340px] flex-col gap-3 overflow-y-auto bg-subtle/60 px-3.5 py-4">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-muted">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="text-xs text-muted">
              Здесь появится переписка с{" "}
              {otherName === "прораб" ? "прорабом" : otherName}. Уточняйте сроки,
              доставку и приёмку этапов.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex max-w-[88%] animate-message flex-col gap-1",
                message.mine ? "self-end items-end" : "self-start items-start",
              )}
            >
              {!message.mine ? (
                <span className="px-1 text-[10px] font-semibold text-muted">
                  {message.author.name}
                  {message.author.role === "FOREMAN" ? " · прораб" : ""}
                </span>
              ) : null}
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-xs leading-relaxed",
                  message.mine
                    ? "bg-royal text-white"
                    : "border border-line bg-white text-ink",
                )}
              >
                {message.text}
              </div>
              <span className="px-1 text-[9px] text-muted">
                {formatDateTime(message.createdAt)}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t border-line p-2.5">
        {error ? (
          <div className="mb-2 px-1 text-[10px] text-danger">{error}</div>
        ) : null}
        <div className="flex items-center gap-2">
          <input
            className="input h-10 text-xs"
            placeholder={
              disabled ? "Чат станет доступен после назначения прораба" : "Написать…"
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={disabled || sending || !text.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-royal text-white transition hover:bg-royal-hover disabled:opacity-50"
            aria-label="Отправить"
          >
            {sending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
