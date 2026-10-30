import test from "node:test";
import assert from "node:assert/strict";
import { buildNeeds } from "../lib/estimate/needs";

test("living room needs cover all ten stages", () => {
  const needs = buildNeeds({
    roomType: "living",
    area: 24,
    ceiling: 2.75,
    answers: [],
  });
  assert.ok(needs.length >= 15);
  const stages = new Set(needs.map((need) => need.stage));
  for (let stage = 1; stage <= 10; stage++) {
    assert.ok(stages.has(stage), `stage ${stage} has no materials`);
  }
  assert.ok(needs.some((need) => need.key === "flooring"));
  assert.ok(needs.some((need) => need.category === "furniture"));
});

test("wet rooms get waterproofing and wall tiles", () => {
  const needs = buildNeeds({
    roomType: "bathroom",
    area: 6,
    ceiling: 2.6,
    answers: [],
  });
  assert.ok(needs.some((need) => need.key === "waterproofing"));
  assert.ok(needs.some((need) => need.key === "wall-tile"));
  assert.ok(needs.some((need) => need.key === "floor-tile"));
});

test("classic style chooses wallpaper instead of paint", () => {
  const needs = buildNeeds({
    roomType: "bedroom",
    area: 14,
    ceiling: 2.7,
    answers: [
      {
        id: "style",
        title: "Стиль",
        values: ["classic"],
        labels: ["Неоклассика"],
      },
    ],
  });
  assert.ok(needs.some((need) => need.key === "wallpaper"));
  assert.ok(!needs.some((need) => need.key === "paint-walls"));
});
