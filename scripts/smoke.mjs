import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const prisma = new PrismaClient();

function makeClient() {
  let cookie = "";
  return async function request(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {}),
    };
    const res = await fetch(BASE + path, {
      ...options,
      headers,
      redirect: "manual",
    });
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const pair = raw.split(";")[0];
      if (pair.includes("=deleted") || /max-age=0/i.test(raw)) continue;
      if (pair.startsWith("oma_session=")) cookie = pair;
    }
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { html: text };
    }
    return { status: res.status, data, html: text };
  };
}

function step(name) {
  console.log(`\n== ${name}`);
}

async function main() {
  const client = makeClient();
  const email = `smoke-${Date.now()}@oma.by`;

  step("register client");
  let res = await client("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Смоук Тестов",
      email,
      password: "oma360demo",
      role: "CLIENT",
      consent: true,
    }),
  });
  console.log(res.status, res.data);
  if (res.status !== 200) throw new Error("register failed");

  step("create project");
  res = await client("/api/projects", {
    method: "POST",
    body: JSON.stringify({
      roomType: "living",
      area: 24,
      ceiling: 2.75,
      description: "Хотим зону отдыха с кинотеатром и рабочее место у окна",
      budget: 8500,
    }),
  });
  console.log(res.status, res.data);
  const projectId = res.data.id;
  if (!projectId) throw new Error("project failed");

  step("generate questions");
  res = await client(`/api/projects/${projectId}/questions`, {
    method: "POST",
  });
  console.log(res.status, res.data?.questions?.map((q) => q.title));
  const questions = res.data.questions;
  if (!questions?.length) throw new Error("questions failed");

  step("save answers");
  const answers = questions.map((q) => ({
    id: q.id,
    title: q.title,
    values: q.defaultValue,
    labels: q.options
      .filter((o) => q.defaultValue.includes(o.value))
      .map((o) => o.label),
  }));
  res = await client(`/api/projects/${projectId}/answers`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
  console.log(res.status, res.data);

  step("start estimate");
  res = await client(`/api/projects/${projectId}/estimate`, { method: "POST" });
  console.log(res.status, res.data);
  if (!res.data.jobId) throw new Error("estimate failed to start");

  step("poll estimate");
  let done = false;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const status = await client(
      `/api/projects/${projectId}/status?type=estimate`,
    );
    const job = status.data.job;
    if (i % 5 === 0 || job?.status !== "RUNNING") {
      console.log(job?.status, job?.progress, job?.error ?? "");
    }
    if (job?.status === "DONE") {
      done = true;
      break;
    }
    if (job?.status === "FAILED") {
      throw new Error(`estimate failed: ${job.error}`);
    }
  }
  if (!done) throw new Error("estimate timeout");

  const packages = await prisma.estimatePackage.findMany({
    where: { projectId },
    orderBy: { total: "asc" },
  });
  console.log(
    packages.map((p) => `${p.tier}: ${p.itemsCount} items, ${p.total} BYN`),
  );
  if (packages.length !== 3) throw new Error("packages missing");
  const items = await prisma.projectItem.findMany({
    where: { projectId, tier: "BASE" },
  });
  console.log("BASE items sample:", items.slice(0, 3).map((i) => i.name));

  step("select BASE package + finalize plan");
  res = await client(`/api/projects/${projectId}/package`, {
    method: "POST",
    body: JSON.stringify({ tier: "BASE" }),
  });
  console.log(res.status, res.data);
  if (res.status !== 200) throw new Error("package selection failed");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { stages: true, escrow: true },
  });
  console.log("status", project.status, "foreman", project.foremanId);
  console.log(
    "stages",
    project.stages.length,
    "total",
    project.total,
    "services",
    project.servicesTotal,
  );
  console.log(
    "stage budgets sum",
    project.stages.reduce((s, x) => s + x.budget, 0),
  );
  if (project.stages.length !== 10) throw new Error("plan stages missing");

  step("final page HTML");
  const finalPage = await client(`/app/new/final?project=${projectId}`);
  console.log(finalPage.status, finalPage.html.includes("Финальное согласование"));

  step("pay");
  res = await client(`/api/projects/${projectId}/pay`, { method: "POST" });
  console.log(res.status, res.data);

  step("chat as client");
  res = await client(`/api/projects/${projectId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text: "Здравствуйте! Когда стартуют работы?" }),
  });
  console.log(res.status, res.data?.message?.text);

  step("login foreman");
  const pro = makeClient();
  const assignedForeman = project.foremanId
    ? await prisma.user.findUnique({ where: { id: project.foremanId } })
    : null;
  res = await pro("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: assignedForeman?.email ?? "pro@oma.by",
      password: "oma360demo",
    }),
  });
  console.log(res.status, res.data, assignedForeman?.name);
  if (res.status !== 200) throw new Error("foreman login failed");

  step("pro list page");
  const proPage = await pro("/pro");
  console.log(proPage.status, proPage.html.includes("Мои объекты"));

  step("pro reads chat and replies");
  res = await pro(`/api/projects/${projectId}/messages`);
  console.log(res.status, res.data?.messages?.length);
  res = await pro(`/api/projects/${projectId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text: "Добрый день! Начинаем завтра в 9:00." }),
  });
  console.log(res.status, res.data?.message?.text);

  step("complete all stages as foreman");
  for (let i = 0; i < 10; i++) {
    const stage = await prisma.planStage.findFirst({
      where: { projectId, status: "IN_PROGRESS" },
    });
    if (!stage) break;
    res = await pro(`/api/projects/${projectId}/stages/${stage.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "complete" }),
    });
    console.log(`stage ${stage.number}`, res.status, res.data);
    if (res.status !== 200) throw new Error("stage completion failed");
  }

  const afterStages = await prisma.project.findUnique({
    where: { id: projectId },
    include: { stages: true, escrow: true },
  });
  console.log(
    "status after stages",
    afterStages.status,
    "released",
    afterStages.escrow?.released,
  );
  console.log(
    "all done",
    afterStages.stages.every((s) => s.status === "DONE"),
  );

  step("complete order");
  res = await pro(`/api/projects/${projectId}/complete`, { method: "POST" });
  console.log(res.status, res.data);

  step("client order page");
  const orderPage = await client(`/app/orders/${projectId}`);
  console.log(orderPage.status, orderPage.html.includes("Таймлайн и этапы ремонта"));

  console.log("\nSMOKE OK", projectId);
}

main()
  .catch((error) => {
    console.error("\nSMOKE FAILED:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
