import {
  batchCreateMockGenerationRuns,
  getMockAnswerReviews,
  getMockCheckInDiagnosis,
  getMockClassDetails,
  getMockClassroomReports,
  getMockClassroomSnapshot,
  getMockClassStudents,
  getMockLearningPeriods,
  getMockPlatformCourses,
  getMockPlatformCourseStudents,
  getMockPlatformSemester,
  getMockPlatformSubjects,
  getMockPublishedLessonSummaries,
  getMockPublishedLessonVersion,
  getMockSessionSnapshot,
  getMockStudentLearningHome,
  getMockStudentSessionContent,
  getMockTeacherClasses,
  getMockTeacherPeriod,
  getMockTeacherPeriods,
  gradeMockAnswer,
  putMockSessionSnapshot,
  startMockStudentSession,
} from "./mockDataService.js";

/**
 * @param req
 */
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

/**
 * @param res
 * @param data
 * @param status
 */
function sendJson(res, data, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

/**
 * Middleware handler for mock APIs
 */
function createMockMiddleware(server) {
  return async (req, res, next) => {
    const url = new URL(
      req.url || "/",
      `http://${req.headers.host || "localhost"}`,
    );
    const pathname = url.pathname;

    // 1. Teacher Session
    if (
      pathname.endsWith("/api/teacher/session") ||
      pathname.endsWith("/teacher/session")
    ) {
      return sendJson(res, {
        status: "authenticated",
        principal: {
          subjectFingerprint: "mock-teacher-fingerprint-001",
          displayName: "云谷任课教师",
          email: "teacher@yungu-inc.org",
          role: "TEACHER",
        },
        logoutUrl: "",
      });
    }

    // 2. Student Session
    if (
      pathname.endsWith("/api/student/session") ||
      pathname.endsWith("/student/session")
    ) {
      return sendJson(res, {
        session: {
          accessToken: "mock-student-token-001",
          identity: {
            studentId: "student-mock-1",
            studentName: "演示同学",
            classId: "class-7-1",
            className: "初一（1）班",
          },
        },
      });
    }

    // 3. Teacher Classes & Students
    if (
      (pathname === "/classroom-api/api/v1/teacher/classes" ||
        pathname === "/api/v1/teacher/classes") &&
      req.method === "GET"
    ) {
      return sendJson(res, getMockTeacherClasses());
    }

    const classDetailMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/teacher\/classes\/([^/]+)$/,
    );
    if (classDetailMatch && req.method === "GET") {
      const classId = decodeURIComponent(classDetailMatch[1]);
      return sendJson(res, getMockClassDetails(classId));
    }

    const classStudentsMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/teacher\/classes\/([^/]+)\/students$/,
    );
    if (classStudentsMatch && req.method === "GET") {
      const classId = decodeURIComponent(classStudentsMatch[1]);
      return sendJson(res, getMockClassStudents(classId));
    }

    const classStudentCredentialMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/teacher\/classes\/([^/]+)\/students\/([^/]+)\/credential$/,
    );
    if (classStudentCredentialMatch) {
      if (req.method === "POST") {
        return sendJson(res, {
          status: "ACTIVE",
          accessToken: `mock-token-rotated-${Date.now()}`,
          updatedAt: new Date().toISOString(),
        });
      }
      if (req.method === "DELETE") {
        return sendJson(res, {
          status: "REVOKED",
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const classStudentLiveViewMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/teacher\/(?:classes|learning-periods)\/[^/]+\/students\/([^/]+)\/live-view$/,
    );
    if (classStudentLiveViewMatch && req.method === "GET") {
      const studentId = decodeURIComponent(classStudentLiveViewMatch[1]);
      return sendJson(res, getMockStudentLearningHome(studentId));
    }

    // 4. Teacher Learning Periods
    const teacherPeriodsListMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/teacher\/learning-periods$/,
    );
    if (teacherPeriodsListMatch) {
      if (req.method === "GET") {
        return sendJson(res, getMockTeacherPeriods());
      }
      if (req.method === "POST") {
        const body = await parseJsonBody(req);
        return sendJson(
          res,
          {
            period: {
              id: `mock-period-${Date.now()}`,
              periodId: `mock-period-${Date.now()}`,
              status: "ACTIVE",
              publishedAt: new Date().toISOString(),
              studentCount: 32,
              onlineCount: 28,
              ...body,
            },
          },
          201,
        );
      }
    }

    const periodSnapshotMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/teacher\/learning-periods\/([^/]+)\/snapshot$/,
    );
    if (periodSnapshotMatch && req.method === "GET") {
      const periodId = decodeURIComponent(periodSnapshotMatch[1]);
      return sendJson(res, getMockClassroomSnapshot(periodId));
    }

    const periodReportsMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/teacher\/learning-periods\/([^/]+)\/reports$/,
    );
    if (periodReportsMatch && req.method === "GET") {
      const periodId = decodeURIComponent(periodReportsMatch[1]);
      return sendJson(res, getMockClassroomReports(periodId));
    }

    const periodPublishMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/teacher\/learning-periods\/([^/]+)\/publish$/,
    );
    if (periodPublishMatch && req.method === "POST") {
      return sendJson(res, {
        status: "ACTIVE",
        publishedAt: new Date().toISOString(),
      });
    }

    const periodCompleteMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/teacher\/learning-periods\/([^/]+)\/complete$/,
    );
    if (periodCompleteMatch && req.method === "POST") {
      return sendJson(res, {
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
      });
    }

    const periodEventsMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/teacher\/learning-periods\/([^/]+)\/events$/,
    );
    if (periodEventsMatch && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write("event: heartbeat\ndata: {}\n\n");
      return;
    }

    const teacherPeriodDetailMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/teacher\/learning-periods\/([^/]+)$/,
    );
    if (teacherPeriodDetailMatch && req.method === "GET") {
      const periodId = decodeURIComponent(teacherPeriodDetailMatch[1]);
      return sendJson(res, getMockTeacherPeriod(periodId));
    }

    // 5. Published lesson content versions (Teacher & Student)
    const singleVersionMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/(?:student|teacher)\/textbook-lessons\/([^/]+)\/content-version$/,
    );
    if (singleVersionMatch && req.method === "GET") {
      const lessonId = decodeURIComponent(singleVersionMatch[1]);
      return sendJson(res, getMockPublishedLessonVersion(lessonId));
    }

    const multiVersionsMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/(?:student|teacher)\/textbook-lessons\/content-versions$/,
    );
    if (multiVersionsMatch && req.method === "GET") {
      const lessonIds = url.searchParams.getAll("lessonIds");
      return sendJson(res, getMockPublishedLessonSummaries(lessonIds));
    }

    const lessonVersionsListMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/teacher\/textbook-lessons\/([^/]+)\/content-versions$/,
    );
    if (lessonVersionsListMatch) {
      const lessonId = decodeURIComponent(lessonVersionsListMatch[1]);
      if (req.method === "GET") {
        return sendJson(res, [getMockPublishedLessonVersion(lessonId)]);
      }
      if (req.method === "POST") {
        return sendJson(res, {
          id: `version-${Date.now()}`,
          textbookLessonId: lessonId,
          versionNumber: 2,
          publishedAt: new Date().toISOString(),
        });
      }
    }

    const lessonValidationMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/teacher\/textbook-lessons\/([^/]+)\/validation$/,
    );
    if (lessonValidationMatch && req.method === "POST") {
      return sendJson(res, { valid: true, issues: [] });
    }

    // 6. Classroom Plans
    if (
      pathname.match(/(?:\/classroom-api)?\/api\/v1\/teacher\/classroom-plans$/)
    ) {
      if (req.method === "GET") return sendJson(res, []);
      if (req.method === "POST") {
        const body = await parseJsonBody(req);
        return sendJson(res, { id: `plan-${Date.now()}`, ...body });
      }
    }

    // 7. Student learning periods
    if (
      pathname.endsWith("/api/v1/student/learning-periods") &&
      req.method === "GET"
    ) {
      return sendJson(res, getMockLearningPeriods());
    }

    // 8. Start student session
    const startSessionMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/learning-periods\/([^/]+)\/student-session$/,
    );
    if (startSessionMatch && req.method === "POST") {
      const periodId = decodeURIComponent(startSessionMatch[1]);
      return sendJson(res, startMockStudentSession(periodId));
    }

    // 9. Self-study session
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

    // 10. Student session content
    const sessionContentMatch = pathname.match(
      /(?:\/classroom-api)?\/api\/v1\/student-sessions\/([^/]+)\/content$/,
    );
    if (sessionContentMatch && req.method === "GET") {
      const sessionId = decodeURIComponent(sessionContentMatch[1]);
      return sendJson(res, getMockStudentSessionContent(sessionId));
    }

    // 11. Student session snapshot
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

    // 12. Student Learning Home
    if (
      pathname.match(
        /(?:\/classroom-api)?\/api\/v1\/student(?:\/learning-home|-sessions\/[^/]+\/learning-home)$/,
      ) &&
      req.method === "GET"
    ) {
      return sendJson(res, getMockStudentLearningHome());
    }

    // 13. Grade answer
    if (
      (pathname === "/adaptive-api/answers/grade" ||
        pathname === "/api/answers/grade" ||
        pathname.endsWith("/answers/grade")) &&
      req.method === "POST"
    ) {
      const body = await parseJsonBody(req);
      return sendJson(res, gradeMockAnswer(body));
    }

    // 14. Review answers
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

    // 15. Learning Check-In
    if (
      (pathname === "/adaptive-api/learning/check-in" ||
        pathname === "/api/learning/check-in" ||
        pathname.endsWith("/learning/check-in")) &&
      req.method === "POST"
    ) {
      const body = await parseJsonBody(req);
      return sendJson(res, getMockCheckInDiagnosis(body));
    }

    // 16. OpenMAIC Classrooms
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

    // 17. Generation Runs & Tasks
    if (pathname.includes("/generation-runs/batch")) {
      const body = await parseJsonBody(req);
      return sendJson(res, batchCreateMockGenerationRuns(body.lessons || []));
    }

    const lessonRunMatch = pathname.match(
      /\/api\/textbook-lessons\/([^/]+)\/generation-runs(?:\/current)?$/,
    );
    if (lessonRunMatch) {
      const lessonId = decodeURIComponent(lessonRunMatch[1]);
      return sendJson(
        res,
        batchCreateMockGenerationRuns([{ id: lessonId }])[0],
      );
    }

    const singleRunMatch = pathname.match(
      /\/api\/generation-runs\/([^/?#]+)(?:\/(publish|cancel))?$/,
    );
    if (singleRunMatch) {
      const action = singleRunMatch[2];
      if (action === "publish") {
        return sendJson(res, { success: true, status: "published" });
      }
      if (action === "cancel") {
        return sendJson(res, { success: true, status: "canceled" });
      }
      return sendJson(
        res,
        batchCreateMockGenerationRuns([{ id: "section-1-1" }])[0],
      );
    }

    if (pathname.includes("/generation-runs")) {
      return sendJson(res, { runs: {} });
    }

    if (pathname.includes("/generation-tasks")) {
      return sendJson(res, { lessons: {}, tasks: {} });
    }

    // 18. Quiz Platform Teaching Directory APIs
    if (pathname === "/api/question/subject/list") {
      return sendJson(res, getMockPlatformSubjects());
    }

    if (pathname === "/api/exam/options") {
      return sendJson(res, getMockPlatformSemester());
    }

    if (pathname === "/api/task/my/courses") {
      return sendJson(res, getMockPlatformCourses());
    }

    if (pathname === "/api/getCourseStudents") {
      return sendJson(res, getMockPlatformCourseStudents());
    }

    // Pass through to next middleware
    next();
  };
}

/**
 * Vite plugin to mock adaptive learning APIs
 */
export function viteMockAdaptivePlugin() {
  return {
    name: "vite-mock-adaptive-api",
    configureServer(server) {
      server.config.logger.warn(
        "[Adaptive mock enabled] 当前使用模拟课堂与测评数据 / Mock classroom and assessment data are active.",
      );
      server.middlewares.use(createMockMiddleware(server));
    },
    configurePreviewServer(server) {
      server.config.logger.warn(
        "[Adaptive mock enabled in preview] 当前使用模拟课堂与测评数据 / Mock classroom and assessment data are active in preview.",
      );
      server.middlewares.use(createMockMiddleware(server));
    },
  };
}

