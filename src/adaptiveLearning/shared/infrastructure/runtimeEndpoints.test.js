/** @jest-environment node */
/* eslint-disable jsdoc/check-tag-names */
/* global describe, expect, test */
import { createRuntimeEndpoints } from "./runtimeEndpointFactory.js";

describe("adaptive learning runtime endpoints", () => {
  test("isolates adaptive BFF requests from the question-test API proxy", () => {
    const endpoints = createRuntimeEndpoints({});

    expect(
      endpoints.adaptiveApiUrl("/api/questions/generate?lessonId=lesson-1"),
    ).toBe("/adaptive-api/questions/generate?lessonId=lesson-1");
    expect(() => endpoints.adaptiveApiUrl("/course/api/v1/questions")).toThrow(
      "Adaptive API path must start with /api",
    );
  });

  test("keeps classroom service paths behind their dedicated adapter", () => {
    const endpoints = createRuntimeEndpoints({
      VITE_ADAPTIVE_API_URL: "https://adaptive.example.test/gateway/",
      VITE_CLASSROOM_API_URL: "https://classroom.example.test/root/",
    });

    expect(endpoints.adaptiveApiUrl("/api/answers/grade")).toBe(
      "https://adaptive.example.test/gateway/answers/grade",
    );
    expect(endpoints.classroomApiUrl("/api/v1/student/profile")).toBe(
      "https://classroom.example.test/root/api/v1/student/profile",
    );
  });
});
