import {
  getMockPublishedLessonVersion,
  getMockPublishedLessonSummaries,
  getMockLearningPeriods,
  startMockStudentSession,
  getMockStudentSessionContent,
  getMockSessionSnapshot,
  putMockSessionSnapshot,
  gradeMockAnswer,
  getMockAnswerReviews,
  getMockCheckInDiagnosis,
} from "./mockDataService.js";

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, data, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

export function viteMockAdaptivePlugin() {
  return {
    name: "vite-mock-adaptive-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
        const pathname = url.pathname;

        // 1. Published lesson content version
        // /classroom-api/api/v1/student/textbook-lessons/:lessonId/content-version
        // or /api/v1/student/textbook-lessons/:lessonId/content-version
        const singleVersionMatch = pathname.match(
          /(?:\/classroom-api)?\/api\/v1\/student\/textbook-lessons\/([^/]+)\/content-version$/,
        );
        if (singleVersionMatch && req.method === "GET") {
          const lessonId = decodeURIComponent(singleVersionMatch[1]);
          return sendJson(res, getMockPublishedLessonVersion(lessonId));
        }

        // 2. Multiple published lesson versions
        // /classroom-api/api/v1/student/textbook-lessons/content-versions?lessonIds=...
        const multiVersionsMatch = pathname.match(
          /(?:\/classroom-api)?\/api\/v1\/student\/textbook-lessons\/content-versions$/,
        );
        if (multiVersionsMatch && req.method === "GET") {
          const lessonIds = url.searchParams.getAll("lessonIds");
          return sendJson(res, getMockPublishedLessonSummaries(lessonIds));
        }

        // 3. Learning periods
        // /classroom-api/api/v1/student/learning-periods
        if (
          pathname.endsWith("/api/v1/student/learning-periods") &&
          req.method === "GET"
        ) {
          return sendJson(res, getMockLearningPeriods());
        }

        // 4. Start student session
        // /classroom-api/api/v1/learning-periods/:periodId/student-session
        const startSessionMatch = pathname.match(
          /(?:\/classroom-api)?\/api\/v1\/learning-periods\/([^/]+)\/student-session$/,
        );
        if (startSessionMatch && req.method === "POST") {
          const periodId = decodeURIComponent(startSessionMatch[1]);
          return sendJson(res, startMockStudentSession(periodId));
        }

        // 5. Self-study session
        if (
          pathname.endsWith("/api/v1/student/self-study-sessions") &&
          req.method === "POST"
        ) {
          const body = await parseJsonBody(req);
          return sendJson(
            res,
            startMockStudentSession(body.textbookLessonId || "section-1-1"),
          );
        }

        // 6. Student session content
        // /classroom-api/api/v1/student-sessions/:sessionId/content
        const sessionContentMatch = pathname.match(
          /(?:\/classroom-api)?\/api\/v1\/student-sessions\/([^/]+)\/content$/,
        );
        if (sessionContentMatch && req.method === "GET") {
          const sessionId = decodeURIComponent(sessionContentMatch[1]);
          return sendJson(res, getMockStudentSessionContent(sessionId));
        }

        // 7. Student session snapshot
        // /classroom-api/api/v1/student-sessions/:sessionId/snapshot
        const sessionSnapshotMatch = pathname.match(
          /(?:\/classroom-api)?\/api\/v1\/student-sessions\/([^/]+)\/snapshot$/,
        );
        if (sessionSnapshotMatch) {
          const sessionId = decodeURIComponent(sessionSnapshotMatch[1]);
          if (req.method === "GET") {
            return sendJson(res, getMockSessionSnapshot(sessionId));
          }
          if (req.method === "PUT") {
            const body = await parseJsonBody(req);
            return sendJson(res, putMockSessionSnapshot(sessionId, body));
          }
        }

        // 8. Grade answer
        // /adaptive-api/answers/grade or /api/answers/grade
        if (
          (pathname === "/adaptive-api/answers/grade" ||
            pathname === "/api/answers/grade" ||
            pathname.endsWith("/answers/grade")) &&
          req.method === "POST"
        ) {
          const body = await parseJsonBody(req);
          return sendJson(res, gradeMockAnswer(body));
        }

        // 9. Review answers
        // /adaptive-api/answers/review or /api/answers/review
        if (
          (pathname === "/adaptive-api/answers/review" ||
            pathname === "/api/answers/review" ||
            pathname.endsWith("/answers/review")) &&
          req.method === "POST"
        ) {
          const body = await parseJsonBody(req);
          return sendJson(
            res,
            getMockAnswerReviews(body.questionIds, body.contentVersionId),
          );
        }

        // 10. Learning Check-In
        // /adaptive-api/learning/check-in or /api/learning/check-in
        if (
          (pathname === "/adaptive-api/learning/check-in" ||
            pathname === "/api/learning/check-in" ||
            pathname.endsWith("/learning/check-in")) &&
          req.method === "POST"
        ) {
          const body = await parseJsonBody(req);
          return sendJson(res, getMockCheckInDiagnosis(body));
        }

        // 11. OpenMAIC Classrooms
        // /adaptive-api/openmaic/classrooms
        if (
          (pathname.includes("/openmaic/classrooms") ||
            pathname.includes("/openmaic/jobs")) &&
          (req.method === "POST" || req.method === "GET")
        ) {
          return sendJson(res, {
            status: "READY",
            classroomId: "mock-openmaic-classroom-1",
            classroomUrl: "/mock-classroom.html",
            message: "课堂已就绪",
          });
        }

        // Pass through to next middleware
        next();
      });
    },
  };
}
