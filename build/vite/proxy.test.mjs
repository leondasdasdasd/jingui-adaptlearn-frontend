import assert from "node:assert/strict";

import { createDevelopmentProxy } from "./proxy.mjs";

const proxy = createDevelopmentProxy({
  adaptiveBffTarget: "http://adaptive.test",
  openMaicTarget: "http://openmaic.test",
  quizApiTarget: "http://quiz.test",
});

assert.equal(proxy["/adaptive-api"].target, "http://adaptive.test");
assert.equal(proxy["/classroom-api"].target, "http://adaptive.test");
assert.equal(proxy["/api/anonymous-runtime"].target, "http://openmaic.test");
assert.equal(proxy["/api/classroom-media"].target, "http://openmaic.test");
assert.equal(proxy["/avatars"].target, "http://openmaic.test");
assert.equal(proxy["/_next"].target, "http://openmaic.test");
assert.equal(proxy["/api"].target, "http://quiz.test");
assert.equal(
  proxy["/adaptive-api"].rewrite("/adaptive-api/textbook-lessons"),
  "/api/textbook-lessons",
);

console.log("proxy ownership: OK");
