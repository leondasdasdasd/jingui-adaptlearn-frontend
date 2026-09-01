import {
  getStudentSessionAnswers,
  getStudentSessionReport,
} from "../../shared/infrastructure/classroomApi";

function normalizePurpose(answer) {
  return String(answer?.purpose || answer?.sourceType || "").toUpperCase() ===
    "PRE"
    ? "PRE"
    : "POST";
}

function textValue(value) {
  return String(value ?? "");
}

function numericValue(value) {
  return Number(value ?? 0);
}

function objectValue(value) {
  return value ?? {};
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function definedFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );
}

function mapSourceScores(sourceScores) {
  const source = objectValue(sourceScores);
  return definedFields({
    PRE: source.PRE,
    PRACTICE: source.PRACTICE,
    POST: source.POST,
  });
}

function mapMasteryTrace(item) {
  const source = objectValue(item);
  return definedFields({
    questionId: source.questionId,
    source: source.source,
    role: source.role,
    scoreRatio: source.scoreRatio,
    masteryBefore: source.masteryBefore,
    masteryAfter: source.masteryAfter,
    masteryDelta: source.masteryDelta,
    confidenceBefore: source.confidenceBefore,
    confidenceAfter: source.confidenceAfter,
  });
}

function mapRubricResult(item) {
  const source = objectValue(item);
  return definedFields({
    point: source.point,
    earned: source.earned,
  });
}

function mapMasteryResult(item) {
  const source = objectValue(item);
  return {
    knowledgeObjectiveId: textValue(source.knowledgeObjectiveId),
    mastery: source.mastery ?? null,
    sourceScores: mapSourceScores(source.sourceScores),
    evidenceCount: numericValue(source.evidenceCount),
    confidence: numericValue(source.confidence),
    independenceAverage: numericValue(source.independenceAverage),
    itemConfidenceAverage: numericValue(source.itemConfidenceAverage),
    status: textValue(source.status),
    algorithmVersion: textValue(source.algorithmVersion),
    trace: arrayValue(source.trace).map((trace) => mapMasteryTrace(trace)),
  };
}

function mapClassroomScore(score) {
  if (!score) return null;
  return {
    status: textValue(score.status),
    reviewStatus: textValue(score.reviewStatus),
    summary: textValue(score.summary),
  };
}

function mapClassroomGrading(grading) {
  const source = objectValue(grading);
  const stableFields = {
    correct: source.correct,
    scoreRatio: source.scoreRatio,
    answerQuality: source.answerQuality,
    feedbackSource: source.feedbackSource,
    aiGraded: source.aiGraded,
    gradingMethod: source.gradingMethod,
    gradedBy: source.gradedBy,
    aiCommentary: source.aiCommentary,
    errorReason: source.errorReason,
    improvements: source.improvements,
    strengths: source.strengths,
    rubricResults: Array.isArray(source.rubricResults)
      ? source.rubricResults.map((item) => mapRubricResult(item))
      : undefined,
    correctAnswer: source.correctAnswer,
    recognizedAnswer: source.recognizedAnswer,
    correctionRequired: source.correctionRequired,
    evidenceEligible: source.evidenceEligible,
    skipped: source.skipped,
    disposition: source.disposition,
    analysis: source.analysis,
    showAnswer: source.showAnswer,
    answer: source.answer,
  };
  return definedFields(stableFields);
}

/**
 * 将课堂报告 DTO 收敛为学生结果应用层契约。
 * @param {object | null} report 课堂报告 DTO
 * @returns {object | null} 稳定报告快照
 */
export function mapClassroomResultReport(report) {
  if (!report) return null;
  return {
    settledAt: report.settledAt ?? null,
    answeredQuestionCount: numericValue(report.answeredQuestionCount),
    algorithmVersion: textValue(report.algorithmVersion),
    masteryResults: arrayValue(report.masteryResults).map((item) =>
      mapMasteryResult(item),
    ),
    score: mapClassroomScore(report.score),
  };
}

/**
 * 将课堂服务 answer DTO 映射为结果页稳定记录。
 * @param {object} answer 课堂服务 answer DTO
 * @returns {object} 结果页记录
 */
export function mapClassroomAnswerRecord(answer) {
  const grading = answer?.gradingResult || {};
  return {
    questionId: String(answer?.questionId || ""),
    purpose: normalizePurpose(answer),
    attempt: {
      ...mapClassroomGrading(grading),
      answer: grading.answer ?? answer?.answerContent?.text ?? "",
      score: Number(answer?.score || 0),
      maxScore: Number(answer?.maxScore || 0),
      submittedAt: answer?.submittedAt,
      authority: "server",
      syncStatus: "persisted",
    },
  };
}

/**
 * 读取学生结算快照，并在 data 边界内收敛 HTTP 错误和传输 DTO。
 * @param {object} input 查询参数
 * @param {string} input.studentSessionId 学生会话 ID
 * @param {string} input.accessToken 学生访问令牌
 * @returns {Promise<object>} 稳定加载状态、报告和答题记录
 */
export async function loadStudentResultSnapshot({
  studentSessionId,
  accessToken,
}) {
  try {
    const [report, answers] = await Promise.all([
      getStudentSessionReport(studentSessionId, accessToken),
      getStudentSessionAnswers(studentSessionId, accessToken),
    ]);
    return {
      status: "ready",
      report: mapClassroomResultReport(report),
      answerRecords: (answers || [])
        .map((answer) => mapClassroomAnswerRecord(answer))
        .filter((record) => record.questionId),
    };
  } catch (error) {
    return {
      status: error?.status === 404 ? "notFound" : "unavailable",
      report: null,
      answerRecords: [],
    };
  }
}
