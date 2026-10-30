import { chromium } from "playwright-core";
import { PrismaClient } from "@prisma/client";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EDGE =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const prisma = new PrismaClient();
const OUT = ".screenshots";

async function json(res) {
  return res.json().catch(() => null);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  async function shot(name, url, wait = 800) {
    await page.goto(BASE + url, { waitUntil: "networkidle" });
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    console.log("shot", name, page.url());
  }

  await shot("01-landing", "/");
  await shot("02-auth", "/auth?mode=register");

  const email = `visual-${Date.now()}@oma.by`;
  let res = await context.request.post(BASE + "/api/auth/register", {
    data: {
      name: "Ирина Соколова",
      email,
      password: "oma360demo",
      role: "CLIENT",
      consent: true,
    },
  });
  console.log("register", res.status(), await json(res));

  res = await context.request.post(BASE + "/api/projects", {
    data: {
      roomType: "living",
      area: 24,
      ceiling: 2.75,
      description:
        "Хотим светлую гостиную с зоной кинотеатра, рабочее место у окна и скрытое хранение. Любим натуральное дерево.",
      budget: 8500,
    },
  });
  const projectId = (await json(res)).id;
  console.log("project", projectId);

  res = await context.request.post(
    BASE + `/api/projects/${projectId}/questions`,
    {},
  );
  const questions = (await json(res)).questions;
  const answers = questions.map((q) => ({
    id: q.id,
    title: q.title,
    values: q.defaultValue,
    labels: q.options
      .filter((o) => q.defaultValue.includes(o.value))
      .map((o) => o.label),
  }));
  await context.request.post(BASE + `/api/projects/${projectId}/answers`, {
    data: { answers },
  });

  res = await context.request.post(
    BASE + `/api/projects/${projectId}/estimate`,
    {},
  );
  const jobId = (await json(res)).jobId;
  console.log("estimate job", jobId);
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const status = await context.request.get(
      BASE + `/api/projects/${projectId}/status?type=estimate`,
    );
    const data = await json(status);
    if (data.job?.status === "DONE") break;
    if (data.job?.status === "FAILED") throw new Error(data.job.error);
    if (i === 99) throw new Error("estimate timeout");
  }

  await shot("03-step1", `/app/new?project=${projectId}`);
  await shot("04-step2", `/app/new/questions?project=${projectId}`);
  await shot("05-step3", `/app/new/packages?project=${projectId}`, 1200);

  await page.goto(BASE + `/app/new/packages?project=${projectId}`, {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("button", { name: /Выбрать и перейти к согласованию/i })
    .click();
  await page.waitForURL(/\/app\/new\/final/, { timeout: 120000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/06-step4.png`, fullPage: true });
  console.log("shot 06-step4", page.url());

  await page.getByRole("button", { name: /^Оплатить/ }).click();
  await page.waitForURL(/\/app$/, { timeout: 60000 });
  await page.goto(BASE + `/app/orders/${projectId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/07-order-client.png`, fullPage: true });
  console.log("shot 07-order-client", page.url());

  await shot("08-client-orders", "/app");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { foreman: true },
  });
  await context.clearCookies();
  res = await context.request.post(BASE + "/api/auth/login", {
    data: { email: project.foreman.email, password: "oma360demo" },
  });
  console.log("foreman login", res.status());

  await shot("09-pro-orders", "/pro");
  await shot("10-pro-order", `/pro/orders/${projectId}`);

  await browser.close();
  console.log("done");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
