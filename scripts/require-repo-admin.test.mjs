import assert from "node:assert/strict";
import test from "node:test";
import { adminAccess } from "./require-repo-admin.mjs";

test("repository owner can run the admin workflow", () => {
  const decision = adminAccess({
    actor: "sergey-frolov-pets",
    owner: "sergey-frolov-pets",
  });
  assert.equal(decision.ok, true);
});

test("another admin can run the workflow", () => {
  const decision = adminAccess({
    actor: "co-admin",
    owner: "sergey-frolov-pets",
    permission: "admin",
    apiStatus: 200,
  });
  assert.equal(decision.ok, true);
});

test("write collaborators cannot run the workflow", () => {
  const decision = adminAccess({
    actor: "writer",
    owner: "sergey-frolov-pets",
    permission: "write",
    apiStatus: 200,
  });
  assert.equal(decision.ok, false);
  assert.match(decision.detail, /write/);
});

test("a failed permission lookup does not grant access", () => {
  const decision = adminAccess({
    actor: "writer",
    owner: "sergey-frolov-pets",
    apiStatus: 403,
  });
  assert.equal(decision.ok, false);
  assert.match(decision.detail, /403/);
});
