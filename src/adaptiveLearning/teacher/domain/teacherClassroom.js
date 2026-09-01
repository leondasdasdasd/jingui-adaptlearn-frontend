import { course } from "../../shared/domain/courseCatalog.js";
import { isMasteredValue } from "../../shared/domain/masteryPolicy.js";

const stageLabels = {
  PRE_ASSESSMENT: "课前小测",
  pre_assessment: "课前小测",
  LEARNING: "互动学习",
  openmaic_learning: "互动学习",
  knowledge_learning: "知识点学习",
  composite_learning: "课时学习",
  PRACTICE: "知识点练习",
  knowledge_practice: "知识点练习",
  CHECK_IN: "错题回顾",
  check_in: "错题回顾",
  knowledge_checkpoint: "学习小结",
  remediation: "重点讲解",
  revalidation: "重新验证",
  POST_ASSESSMENT: "综合练习",
  post_assessment: "综合练习",
  composite_review: "综合练习",
};

const tutoringStateMeta = {
  DIAGNOSING: {
    label: "正在回顾错因",
    nextAction: "引导学生说清共同错因和检查方法",
  },
  READY_TO_CONTINUE: {
    label: "错因已经确认",
    nextAction: "安排未见新题重新验证",
  },
  REMEDIATION: { label: "正在重点讲解", nextAction: "讲解后必须完成未见新题" },
  REVALIDATING: { label: "正在重新验证", nextAction: "等待学生独立完成新题" },
  COMPLETE: { label: "重新验证通过", nextAction: "继续后续学习" },
  NEEDS_SUPPORT: {
    label: "重新验证未通过",
    nextAction: "建议教师安排后续巩固",
  },
};

export const tutoringStateLabel = (state) =>
  tutoringStateMeta[state]?.label || "学习支持";

const nowMs = () => Date.now();
const knowledgePointNames = Object.fromEntries(
  course.chapters.flatMap((chapter) =>
    chapter.sections.flatMap((section) =>
      section.knowledgePoints.map((knowledgePoint) => [
        knowledgePoint.id,
        knowledgePoint.name,
      ]),
    ),
  ),
);
export const knowledgePointName = (id) => knowledgePointNames[id] || id || "—";
/**
 *
 * @param seconds
 */
export function formatDuration(seconds = 0) {
  const value = Math.max(0, Math.round(seconds));
  if (value < 60) return `${value} 秒`;
  const minutes = Math.floor(value / 60);
  const remain = value % 60;
  return remain ? `${minutes} 分 ${remain} 秒` : `${minutes} 分钟`;
}

/**
 *
 * @param event
 */
function payload(event) {
  return event.payload || {};
}
/**
 *
 * @param event
 */
function eventTime(event) {
  return event.occurredAt || event.receivedAt;
}
/**
 *
 * @param from
 * @param to
 */
function secondsBetween(from, to = new Date().toISOString()) {
  return from
    ? Math.max(
        0,
        Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000),
      )
    : 0;
}

/**
 *
 * @param event
 */
function eventKnowledgePointId(event) {
  const data = payload(event);
  return (
    data.knowledgePointId ||
    data.knowledgeObjectiveId ||
    event.knowledgeObjectiveId ||
    ""
  );
}

/**
 *
 * @param event
 */
function timelineTitle(event) {
  const data = payload(event);
  const stage = data.stage;
  const label = stageLabels[stage] || stage || "学习记录";
  const knowledgePointId = eventKnowledgePointId(event);
  if (
    knowledgePointId &&
    [
      "knowledge_learning",
      "knowledge_practice",
      "LEARNING",
      "PRACTICE",
    ].includes(stage)
  ) {
    return `${label} · ${knowledgePointName(knowledgePointId)}`;
  }
  if (
    data.lessonTitle &&
    [
      "pre_assessment",
      "PRE_ASSESSMENT",
      "composite_learning",
      "openmaic_learning",
      "post_assessment",
      "POST_ASSESSMENT",
      "composite_review",
    ].includes(stage)
  ) {
    return `${label} · ${data.lessonTitle}`;
  }
  return label;
}

/**
 *
 * @param session
 * @param events
 * @param answers
 */
function recordsFor(session, events, answers) {
  const sessionEvents = events.filter(
    (event) => event.studentSessionId === session.id,
  );
  const presented = [
    ...new Map(
      sessionEvents
        .filter((event) => payload(event).type === "question_presented")
        .sort((a, b) => new Date(eventTime(a)) - new Date(eventTime(b)))
        .map((event) => [payload(event).questionId, event]),
    ).values(),
  ];
  const submitted = answers.filter(
    (answer) => answer.studentSessionId === session.id,
  );
  const records = submitted.map((answer) => {
    const shown = [...presented]
      .reverse()
      .find((event) => payload(event).questionId === answer.questionId);
    const data = payload(shown || {});
    const grading = answer.gradingResult || {};
    return {
      id: answer.id,
      mode: answer.purpose === "PRE" ? "pre" : "post",
      stem: data.stem || answer.questionId,
      knowledgePointName: knowledgePointName(answer.knowledgeObjectiveId),
      answer: answer.answerContent?.text || "",
      score: Number(answer.score),
      maxScore: Number(answer.maxScore),
      feedback: grading.feedback || "",
      status: "answered",
      presentedAt: eventTime(shown || {}) || answer.submittedAt,
      submittedAt: answer.submittedAt,
      durationSeconds: secondsBetween(
        eventTime(shown || {}),
        answer.submittedAt,
      ),
    };
  });
  for (const shown of presented.filter(
    (shown) =>
      !submitted.some(
        (answer) => answer.questionId === payload(shown).questionId,
      ),
  )) {
    const data = payload(shown);
    records.push({
      id: shown.id,
      mode: data.mode,
      stem: data.stem,
      knowledgePointName: knowledgePointName(data.knowledgePointId),
      status: "presented",
      presentedAt: eventTime(shown),
      submittedAt: "",
      durationSeconds: secondsBetween(eventTime(shown)),
    });
  }
  return records.sort(
    (a, b) => new Date(a.presentedAt) - new Date(b.presentedAt),
  );
}

/**
 *
 * @param session
 * @param events
 * @param dialogues
 */
function timelineFor(session, events, dialogues) {
  const rawStages = events
    .filter(
      (event) =>
        event.studentSessionId === session.id &&
        payload(event).type === "stage_entered",
    )
    .sort((a, b) => new Date(eventTime(a)) - new Date(eventTime(b)));
  const stages = rawStages.filter(
    (event, index) =>
      index === 0 ||
      payload(event).stage !== payload(rawStages[index - 1]).stage ||
      eventKnowledgePointId(event) !==
        eventKnowledgePointId(rawStages[index - 1]) ||
      secondsBetween(eventTime(rawStages[index - 1]), eventTime(event)) > 5,
  );
  return stages
    .map((event, index) => {
      const next = stages[index + 1];
      const data = payload(event);
      const startedAt = eventTime(event);
      const endedAt = next ? eventTime(next) : "";
      const knowledgePointId = eventKnowledgePointId(event);
      return {
        id: event.id,
        type: data.stage,
        title: timelineTitle(event),
        detail: knowledgePointId ? `所属课时：${data.lessonTitle || "—"}` : "",
        startedAt,
        endedAt,
        durationSeconds: secondsBetween(startedAt, endedAt || undefined),
      };
    })
    .concat(
      stages.length > 0
        ? []
        : [
            {
              id: `${session.id}-start`,
              type: "start",
              title: "进入课堂",
              detail: "",
              startedAt: session.startedAt,
              endedAt: "",
              durationSeconds: secondsBetween(session.startedAt),
            },
          ],
    );
}

/**
 *
 * @param snapshot
 * @param reports
 */
export function buildClassroomStudents(snapshot = {}, reports = []) {
  const events = snapshot.recentEvents || [];
  const answers = snapshot.answers || [];
  return (snapshot.sessions || []).map((session) => {
    const sessionEvents = events.filter(
      (event) => event.studentSessionId === session.id,
    );
    const records = recordsFor(session, events, answers);
    const dialogues = sessionEvents
      .filter((event) => payload(event).type === "ai_tutor_message")
      .map((event) => ({
        id: event.id,
        role: payload(event).role,
        content: payload(event).content,
        occurredAt: eventTime(event),
      }));
    const tutoringTransitions = sessionEvents
      .filter((event) => payload(event).type === "tutoring_state_transition")
      .sort((a, b) => new Date(eventTime(a)) - new Date(eventTime(b)))
      .map((event) => ({
        id: event.id,
        ...payload(event),
        occurredAt: eventTime(event),
      }));
    const latestTutoring = tutoringTransitions.at(-1);
    const tutoringMeta = tutoringStateMeta[latestTutoring?.toState] || null;
    const tutoringSupport = tutoringMeta
      ? {
          state: latestTutoring.toState,
          label: tutoringMeta.label,
          nextAction: tutoringMeta.nextAction,
          summary: latestTutoring.summary || "",
          causeType: latestTutoring.causeType || "",
          evidenceQuestionIds: latestTutoring.evidenceQuestionIds || [],
          updatedAt: latestTutoring.occurredAt,
        }
      : null;
    const preAssessmentDecisions = [
      ...new Map(
        sessionEvents
          .filter(
            (event) => payload(event).type === "pre_assessment_kp_decided",
          )
          .sort((a, b) => new Date(eventTime(a)) - new Date(eventTime(b)))
          .map((event) => [
            eventKnowledgePointId(event),
            {
              id: event.id,
              ...payload(event),
              occurredAt: eventTime(event),
            },
          ]),
      ).values(),
    ];
    const preAssessmentCompleted = sessionEvents
      .filter((event) => payload(event).type === "pre_assessment_completed")
      .sort((a, b) => new Date(eventTime(a)) - new Date(eventTime(b)))
      .at(-1);
    const report = reports.find((item) => item.studentSessionId === session.id);
    const answered = records.filter((item) => item.status === "answered");
    const correct = answered.filter(
      (item) => item.maxScore > 0 && item.score / item.maxScore >= 0.8,
    ).length;
    const lastActivityAt = session.lastEventAt || session.startedAt;
    const lastActivityMinutes = Math.max(
      0,
      Math.floor((nowMs() - new Date(lastActivityAt).getTime()) / 60_000),
    );
    const slow = records.find(
      (record) =>
        record.status === "presented" && record.durationSeconds >= 300,
    );
    const recent = answered.slice(-3);
    const consecutiveErrors =
      recent.length === 3 &&
      recent.every(
        (item) => !item.maxScore || item.score / item.maxScore < 0.5,
      );
    const warnings = [];
    if (session.status === "ACTIVE") {
      if (lastActivityMinutes >= 5)
        warnings.push({
          type: "inactive",
          minutes: lastActivityMinutes,
          label: `连续 ${lastActivityMinutes} 分钟无学习变化`,
        });
      if (slow)
        warnings.push({
          type: "slow_question",
          minutes: Math.floor(slow.durationSeconds / 60),
          label: `单题已停留 ${Math.floor(slow.durationSeconds / 60)} 分钟`,
          questionId: slow.id,
        });
      if (consecutiveErrors)
        warnings.push({ type: "consecutive_errors", label: "连续三题未通过" });
    }
    const masteryResults = report?.masteryResults || [];
    const determined = masteryResults.filter(
      (item) => item.status === "DETERMINED",
    );
    const masteryCount =
      report && determined.length > 0
        ? determined.filter((item) => isMasteredValue(item.mastery)).length
        : null;
    const questionCount = answered.length;
    const latestStageEvent = [...sessionEvents]
      .filter((event) => payload(event).type === "stage_entered")
      .sort((a, b) => new Date(eventTime(a)) - new Date(eventTime(b)))
      .at(-1);
    const latestStagePayload = payload(latestStageEvent || {});
    const currentQuestion = [...records]
      .sort(
        (left, right) =>
          new Date(left.presentedAt) - new Date(right.presentedAt),
      )
      .at(-1);
    const currentKnowledgePointName = knowledgePointName(
      eventKnowledgePointId(latestStageEvent || {}) ||
        session.currentKnowledgeObjectiveId,
    );
    const currentStage = latestStagePayload.stage || session.currentStage;
    const currentStageLabel =
      stageLabels[currentStage] || currentStage || "学习中";
    const questionStages = new Set([
      "pre_assessment",
      "PRE_ASSESSMENT",
      "knowledge_practice",
      "knowledge_verification",
      "PRACTICE",
      "post_assessment",
      "POST_ASSESSMENT",
      "composite_review",
      "revalidation",
    ]);
    let currentContent = currentStageLabel;
    let currentContentDescriptor = { kind: "stage", stageCode: currentStage };
    if (questionStages.has(currentStage) && currentQuestion?.stem) {
      currentContent = currentQuestion.stem;
      currentContentDescriptor = { kind: "question", text: currentQuestion.stem };
    } else if (currentStage === "knowledge_learning") {
      currentContent = `${currentKnowledgePointName} · 单点讲解`;
      currentContentDescriptor = {
        kind: "knowledgeExplanation",
        name: currentKnowledgePointName,
      };
    } else if (
      ["composite_learning", "openmaic_learning", "LEARNING"].includes(
        currentStage,
      )
    ) {
      currentContent = `${latestStagePayload.lessonTitle || "本次课堂"} · 综合讲解`;
      currentContentDescriptor = {
        kind: "lessonExplanation",
        name: latestStagePayload.lessonTitle || "",
      };
    } else if (currentStage === "remediation") {
      currentContent = `${currentKnowledgePointName} · 重点讲解`;
      currentContentDescriptor = {
        kind: "remediation",
        name: currentKnowledgePointName,
      };
    } else if (currentStage === "check_in" || currentStage === "CHECK_IN") {
      currentContent = `${currentKnowledgePointName} · 错题回顾`;
      currentContentDescriptor = {
        kind: "review",
        name: currentKnowledgePointName,
      };
    } else if (currentKnowledgePointName !== "—") {
      currentContent = `${currentKnowledgePointName} · ${currentStageLabel}`;
      currentContentDescriptor = {
        kind: "knowledgeStage",
        name: currentKnowledgePointName,
        stageCode: currentStage,
      };
    }
    const settled = session.status === "SETTLED";
    return {
      id: session.studentId,
      sessionId: session.id,
      name: session.studentName,
      startedAt: session.startedAt,
      endsAt: session.endsAt,
      sessionStatus: session.status,
      stageCode: settled ? "SETTLED" : currentStage || "LEARNING",
      stage: settled ? "已结束" : currentStageLabel,
      kp: settled ? "—" : currentKnowledgePointName,
      currentContentDescriptor: settled
        ? { kind: "settled" }
        : currentContentDescriptor,
      currentContent: settled ? "课堂学习已完成" : currentContent,
      progress: Math.min(
        100,
        Math.round(secondsBetween(session.startedAt) / 27),
      ),
      accuracy: questionCount
        ? Math.round((correct / questionCount) * 100)
        : null,
      online: session.status === "ACTIVE" && lastActivityMinutes < 2,
      lastActivityAt,
      lastActivityMinutes,
      warnings,
      warning: warnings[0]?.label || "",
      tone: consecutiveErrors
        ? "danger"
        : warnings.length > 0
          ? "warning"
          : "normal",
      masteryCount,
      masteryTotal: masteryResults.length,
      questionCount,
      aiRounds: dialogues.filter((item) => item.role === "user").length,
      learningMinutes:
        report?.score?.effectiveLearningSeconds == null
          ? Math.max(
              0,
              Math.round(
                secondsBetween(session.startedAt, lastActivityAt) / 60,
              ),
            )
          : Math.max(
              0,
              Math.round(Number(report.score.effectiveLearningSeconds) / 60),
            ),
      averageQuestionsPerMastery: masteryCount
        ? Number((questionCount / masteryCount).toFixed(1))
        : null,
      questionRecords: records,
      dialogues,
      tutoringTransitions,
      tutoringSupport,
      preAssessment:
        preAssessmentDecisions.length > 0
          ? {
              decisions: preAssessmentDecisions,
              strategyVersion:
                payload(preAssessmentCompleted || {}).strategyVersion ||
                preAssessmentDecisions.at(-1)?.strategyVersion ||
                "",
              answeredQuestionCount: Number(
                payload(preAssessmentCompleted || {}).answeredQuestionCount ||
                  records.filter(
                    (item) => item.mode === "pre" && item.status === "answered",
                  ).length,
              ),
              completedAt: eventTime(preAssessmentCompleted || {}),
            }
          : null,
      learningTimeline: timelineFor(session, events, dialogues),
      report,
    };
  });
}
