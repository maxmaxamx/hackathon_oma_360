import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const BASE = (process.env.AI_BASE_URL || "").replace(/\/$/, "");
const KEY = process.env.AI_API_KEY || "";
const DEFAULT_SESSION = `oma360-${randomUUID()}`;
const USER_AGENT = "oma360/1.0";
export const TEXT_MODEL =
  process.env.AI_TEXT_MODEL?.trim() || "gemini-3.5-flash-lite";
export const IMAGE_MODEL = process.env.AI_IMAGE_MODEL?.trim() || "";
const REASONING_EFFORT = process.env.AI_REASONING_EFFORT?.trim() || "";

export function isAiConfigured(): boolean {
  return Boolean(BASE && KEY && TEXT_MODEL);
}

export function isImageConfigured(): boolean {
  return Boolean(BASE && KEY && IMAGE_MODEL);
}

function endpoint(suffix: string): string {
  return `${BASE}${suffix}`;
}

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("AI response is not valid JSON");
  }
}

export async function chatJson<T = unknown>(
  system: string,
  user: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    sessionId?: string;
  },
): Promise<T | null> {
  if (!isAiConfigured()) return null;
  try {
    const res = await fetch(endpoint("/chat/completions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
        "User-Agent": USER_AGENT,
        "x-opencode-session": options?.sessionId ?? DEFAULT_SESSION,
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        temperature: options?.temperature ?? 0.4,
        max_tokens: options?.maxTokens ?? 2000,
        ...(REASONING_EFFORT ? { reasoning_effort: REASONING_EFFORT } : {}),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(options?.timeoutMs ?? 90000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[ai] text request failed ${res.status}: ${body.slice(0, 500) || "no body"}`,
      );
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return extractJson(content) as T;
  } catch (error) {
    console.warn("[ai] text request error:", error);
    return null;
  }
}

export async function generateImage(
  prompt: string,
  sessionId?: string,
): Promise<string | null> {
  if (!isImageConfigured()) {
    console.warn(
      "[ai] image generation skipped: AI_IMAGE_MODEL is not configured",
    );
    return null;
  }
  try {
    const res = await fetch(endpoint("/images/generations"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
        "User-Agent": USER_AGENT,
        "x-opencode-session": sessionId ?? DEFAULT_SESSION,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
      signal: AbortSignal.timeout(180000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[ai] image request failed ${res.status}: ${body.slice(0, 500) || "no body"}`,
      );
      return null;
    }
    const data = (await res.json()) as {
      data?: { b64_json?: string; url?: string }[];
    };
    const first = data.data?.[0];
    let buffer: Buffer | null = null;

    if (first?.b64_json) {
      buffer = Buffer.from(first.b64_json, "base64");
    } else if (first?.url) {
      const imageRes = await fetch(first.url, {
        signal: AbortSignal.timeout(120000),
      });
      if (imageRes.ok) {
        buffer = Buffer.from(await imageRes.arrayBuffer());
      }
    }
    if (!buffer || buffer.length < 1000) return null;

    const dir = path.join(process.cwd(), "public", "generated");
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.png`;
    await writeFile(path.join(dir, name), buffer);
    return `/generated/${name}`;
  } catch (error) {
    console.warn("[ai] image request error:", error);
    return null;
  }
}
