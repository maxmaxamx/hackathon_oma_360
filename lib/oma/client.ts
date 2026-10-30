import "server-only";
import { DEFAULT_CITY } from "@/lib/constants";

export type OmaProduct = {
  id: string;
  name: string;
  link: string;
  image: string;
  price: number;
  measure: string;
  inc: number;
  available: boolean;
  coverage?: number;
  mass?: number;
  volume?: number;
  length?: number;
  packCount?: number;
};

type CacheEntry = { expires: number; items: OmaProduct[] };

type OmaState = {
  jar: Map<string, string>;
  csrf: string | null;
  csrfAt: number;
  sessionPromise: Promise<void> | null;
  queue: Promise<unknown>;
  cache: Map<string, CacheEntry>;
  consecutiveFailures: number;
  blockedUntil: number;
};

const globalForOma = globalThis as unknown as { __oma?: OmaState };
const state: OmaState =
  globalForOma.__oma ??
  (globalForOma.__oma = {
    jar: new Map(),
    csrf: null,
    csrfAt: 0,
    sessionPromise: null,
    queue: Promise.resolve(),
    cache: new Map(),
    consecutiveFailures: 0,
    blockedUntil: 0,
  });

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const BASE = (process.env.OMA_BASE_URL || "https://www.oma.by").replace(/\/$/, "");
const USE_MOCK = process.env.USE_MOCK_CATALOG === "true";

const BASE_HEADERS: Record<string, string> = {
  "User-Agent": USER_AGENT,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
  Referer: `${BASE}/`,
};

export class OmaError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function absorbCookies(res: Response): void {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const cookie of raw) {
    const [pair] = cookie.split(";");
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const expired = /max-age=0/i.test(cookie) || value === "deleted" || value === "";
    if (expired) state.jar.delete(name);
    else state.jar.set(name, value);
  }
}

function cookieHeader(): string {
  state.jar.set("BITRIX_SM_GEOIP_CITY_ID", DEFAULT_CITY.cityId);
  return [...state.jar.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function isVerification(html: string): boolean {
  return /<title>\s*Verification\s*<\/title>/i.test(html) || /hg-security=/.test(html);
}

async function rawGet(path: string, headers: Record<string, string>): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    headers: { ...BASE_HEADERS, ...headers, Cookie: cookieHeader() },
    redirect: "manual",
    signal: AbortSignal.timeout(12000),
  });
}

async function openSession(): Promise<void> {
  state.csrf = null;
  state.jar.clear();

  let res = await rawGet("/", {});
  absorbCookies(res);
  let html = await res.text();

  for (let attempt = 0; attempt < 3 && isVerification(html); attempt++) {
    const match = html.match(/hg-security=([^;"\\]+)/);
    if (!match) break;
    state.jar.set("hg-security", match[1]);
    await sleep(350);
    res = await rawGet("/", { "sec-fetch-site": "same-origin" });
    absorbCookies(res);
    html = await res.text();
  }

  if (isVerification(html)) {
    throw new OmaError("Каталог OMA временно закрыт защитой. Попробуйте ещё раз.");
  }

  const csrf =
    html.match(/bitrix_sessid["']?\s*[:=]\s*["']([a-f0-9]{32})["']/)?.[1] ??
    html.match(/"bitrix_sessid"\s*:\s*"([a-f0-9]{32})"/)?.[1];
  if (!csrf) throw new OmaError("Не удалось получить CSRF-токен каталога OMA.");
  state.csrf = csrf;
  state.csrfAt = Date.now();
}

async function ensureSession(force = false): Promise<void> {
  if (state.blockedUntil > Date.now()) {
    throw new OmaError(
      "Каталог OMA временно недоступен. Попробуйте расчёт через минуту.",
    );
  }
  const fresh = state.csrf && Date.now() - state.csrfAt < 10 * 60 * 1000;
  if (!force && fresh) return;
  if (!state.sessionPromise) {
    state.sessionPromise = openSession()
      .catch((error) => {
        state.blockedUntil = Date.now() + 30000;
        throw error;
      })
      .finally(() => {
        state.sessionPromise = null;
      });
  }
  return state.sessionPromise;
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = state.queue.then(task, task);
  state.queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function parseNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function parsePackInfo(name: string): Pick<
  OmaProduct,
  "coverage" | "mass" | "volume" | "length" | "packCount"
> {
  const coverage =
    parseNumber(name.match(/S\s*=\s*([\d.,]+)/i)?.[1]) ??
    parseNumber(name.match(/([\d.,]+)\s*м²/i)?.[1]);
  const mass = parseNumber(name.match(/([\d.,]+)\s*кг/i)?.[1]);
  const volume = parseNumber(name.match(/([\d.,]+)\s*л(?![а-яё])/i)?.[1]);
  const length = parseNumber(
    name.match(/([\d.,]+)\s*м\.?\s*п\.?/i)?.[1] ??
      name.match(/([\d.,]+)\s*м(?![²м])/u)?.[1],
  );
  const packCount = parseNumber(name.match(/([\d.,]+)\s*шт/i)?.[1]);
  return {
    coverage,
    mass,
    volume,
    length,
    packCount: packCount && packCount > 1 ? Math.round(packCount) : undefined,
  };
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function absolute(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

type RawItem = {
  id: number | string;
  name?: string;
  link?: string;
  picture?: string;
  catalog?: {
    price?: number;
    measure?: string;
    available?: boolean;
    cart?: { inc?: number };
  };
};

function normalize(raw: RawItem): OmaProduct | null {
  const name = stripTags(raw.name ?? "");
  const price = Number(raw.catalog?.price ?? 0);
  if (!raw.id || !name || !Number.isFinite(price) || price <= 0) return null;
  return {
    id: String(raw.id),
    name,
    link: absolute(raw.link ?? ""),
    image: absolute(raw.picture ?? ""),
    price,
    measure: raw.catalog?.measure ?? "шт",
    inc: Math.max(1, Number(raw.catalog?.cart?.inc ?? 1)),
    available: raw.catalog?.available !== false,
    ...parsePackInfo(name),
  };
}

function mockProducts(query: string): OmaProduct[] {
  // Only used when USE_MOCK_CATALOG=true (offline development).
  const base = 20 + (query.length % 7) * 10;
  return Array.from({ length: 12 }, (_, i) => ({
    id: `mock-${query}-${i}`,
    name: `${query} (демо-позиция ${i + 1})`,
    link: `${BASE}/search/?q=${encodeURIComponent(query)}`,
    image: "",
    price: Math.round(base * (0.6 + i * 0.12) * 100) / 100,
    measure: "шт",
    inc: 1,
    available: true,
    coverage: query.includes("ламинат") || query.includes("плитк") ? 2.2 : undefined,
    mass: query.includes("штукатур") || query.includes("стяжк") ? 30 : undefined,
    volume: query.includes("краск") || query.includes("грунтов") ? 9 : undefined,
    length: query.includes("плинтус") || query.includes("кабел") ? 2.5 : undefined,
  }));
}

export async function searchCatalog(
  query: string,
  limit = 40,
  options?: { deadline?: number; timeoutMs?: number },
): Promise<OmaProduct[]> {
  const q = query.trim();
  if (!q) return [];
  if (options?.deadline && Date.now() > options.deadline) return [];

  const key = `${DEFAULT_CITY.cityId}|${q.toLowerCase()}|${limit}`;
  const cached = state.cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.items;

  if (USE_MOCK) {
    const items = mockProducts(q);
    state.cache.set(key, { expires: Date.now() + 30 * 60 * 1000, items });
    return items;
  }

  const items = await enqueue(async () => {
    if (options?.deadline && Date.now() > options.deadline) return [];

    for (let attempt = 0; attempt < 2; attempt++) {
      await ensureSession(attempt > 0);
      const url = new URL(`${BASE}/api-v2/catalog/products/search/fast`);
      url.searchParams.set("q", q);
      url.searchParams.set("index", "catalog");
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("city_id", DEFAULT_CITY.cityId);
      if (DEFAULT_CITY.locationId) {
        url.searchParams.set("location_id", DEFAULT_CITY.locationId);
      }

      const res = await (async () => {
        try {
          return await fetch(url, {
            headers: {
              ...BASE_HEADERS,
              Accept: "application/json",
              Cookie: cookieHeader(),
              "X-Bitrix-Csrf-Token": state.csrf ?? "",
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-origin",
            },
            signal: AbortSignal.timeout(options?.timeoutMs ?? 12000),
          });
        } catch {
          return null;
        }
      })();
      if (!res) {
        state.consecutiveFailures += 1;
        if (state.consecutiveFailures >= 3) {
          state.blockedUntil = Date.now() + 30000;
        }
        throw new OmaError("Каталог OMA не отвечает. Попробуйте ещё раз.");
      }
      state.consecutiveFailures = 0;
      absorbCookies(res);
      const text = await res.text();

      if (res.status === 403 || isVerification(text)) {
        await ensureSession(true);
        continue;
      }
      if (!text.startsWith("{")) {
        await ensureSession(true);
        continue;
      }

      let json: {
        status?: string;
        data?: { items?: RawItem[] };
        errors?: { code?: string }[];
      };
      try {
        json = JSON.parse(text);
      } catch {
        await ensureSession(true);
        continue;
      }

      if (json.errors?.some((e) => e.code === "invalid_csrf")) {
        await ensureSession(true);
        continue;
      }
      if (json.status !== "success") {
        throw new OmaError("Каталог OMA вернул ошибку поиска.");
      }

      const normalized = (json.data?.items ?? [])
        .map(normalize)
        .filter((p): p is OmaProduct => Boolean(p))
        .filter((p) => p.available);

      if (state.cache.size > 400) state.cache.clear();
      state.cache.set(key, {
        expires: Date.now() + 30 * 60 * 1000,
        items: normalized,
      });
      return normalized;
    }
    throw new OmaError("Не удалось получить данные каталога OMA после повторных попыток.");
  });

  return items;
}
