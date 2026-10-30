import test from "node:test";
import assert from "node:assert/strict";
import {
  clamp,
  roomGeometry,
  roundUpToStep,
} from "../lib/estimate/geometry";

test("room geometry keeps floor and ceiling area", () => {
  const geo = roomGeometry(24, 2.75);
  assert.equal(geo.floorArea, 24);
  assert.equal(geo.ceilingArea, 24);
  assert.ok(geo.perimeter > 19 && geo.perimeter < 21);
  assert.ok(geo.wallArea > 24);
});

test("wall area never drops below 120% of floor area", () => {
  const geo = roomGeometry(5, 1.8);
  assert.ok(geo.wallArea >= 6);
});

test("quantity rounds up to the purchase step", () => {
  assert.equal(roundUpToStep(9.1, 11), 11);
  assert.equal(roundUpToStep(11, 11), 11);
  assert.equal(roundUpToStep(23, 11), 33);
  assert.equal(roundUpToStep(2.1, 1), 3);
});

test("clamp keeps values inside bounds", () => {
  assert.equal(clamp(0.2, 1, 5), 1);
  assert.equal(clamp(9, 1, 5), 5);
  assert.equal(clamp(3, 1, 5), 3);
});
