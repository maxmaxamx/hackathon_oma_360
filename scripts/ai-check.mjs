import fs from "node:fs";

function readEnv() {
  if (!fs.existsSync(".env")) return {};
  return Object.fromEntries(
    fs
      .readFileSync(".env", "utf8")
      .split(/\r?\n/)
      .filter((line) => /^[A-Z0-9_]+=/.test(line))
      .map((line) => {
        const index = line.indexOf("=");
        const value = line.slice(index + 1).replace(/^"|"$/g, "");
        return [line.slice(0, index), value];
      }),
  );
}

const env = readEnv();
const base = (env.AI_BASE_URL || "").replace(/\/$/, "");
const key = env.AI_API_KEY || "";
const textModel = env.AI_TEXT_MODEL || "";
const imageModel = env.AI_IMAGE_MODEL || "";

console.log("AI configuration");
console.log("  base URL :", base || "(empty)");
console.log("  API key  :", key ? `set (${key.length} chars)` : "(empty)");
console.log("  text     :", textModel || "(empty)");
console.log("  image    :", imageModel || "(empty)");

if (!base || !key || !textModel) {
  console.log("\nText AI is not configured; the app will use built-in fallbacks.");
  process.exit(0);
}

const started = Date.now();
try {
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "User-Agent": "oma360/1.0",
      "x-opencode-session": `oma360-check-${Date.now()}`,
    },
    body: JSON.stringify({
      model: textModel,
      messages: [{ role: "user", content: 'Return JSON: {"ok":true}' }],
      max_tokens: 200,
      ...(env.AI_REASONING_EFFORT
        ? { reasoning_effort: env.AI_REASONING_EFFORT }
        : {}),
    }),
    signal: AbortSignal.timeout(60000),
  });
  const body = await response.text();
  console.log(
    `\nChat request: HTTP ${response.status} in ${Date.now() - started} ms`,
  );
  console.log(body.slice(0, 800) || "(empty body)");

  if (response.ok) {
    console.log("\nText AI is working.");
  } else if (body.includes("Insufficient account funds")) {
    console.log(
      "\nПричина: на счёте OpenCode Go недостаточно средств. Пополните баланс или используйте бесплатную модель, когда квота доступна.",
    );
  } else if (body.includes("FreeUsageLimitError")) {
    console.log(
      "\nПричина: исчерпан бесплатный лимит модели. Нужна подписка OpenCode Go или пополнение баланса.",
    );
  } else if (body.includes("Model is unavailable")) {
    console.log(
      "\nПричина: неверный ID модели для этого шлюза. Проверьте AI_TEXT_MODEL.",
    );
  } else if (response.status === 401 || response.status === 403) {
    console.log("\nПричина: ключ не принят шлюзом (401/403).");
  } else if (response.status === 404) {
    console.log(
      "\nПричина: endpoint не найден. AI_BASE_URL должен указывать на OpenAI-совместимый /v1.",
    );
  } else if (body.includes("MissingSessionID")) {
    console.log(
      "\nПричина: шлюз требует заголовок x-opencode-session. Проверьте, что используется актуальная версия клиента.",
    );
  }
} catch (error) {
  console.log("\nRequest failed:", error instanceof Error ? error.message : error);
}

if (!imageModel) {
  console.log(
    "\nImage generation is disabled: AI_IMAGE_MODEL is empty. DeepSeek is text-only, поэтому для preview нужна отдельная image-модель.",
  );
} else {
  console.log(
    `\nImage model configured: ${imageModel}. Preview will call ${base}/images/generations.`,
  );
}
