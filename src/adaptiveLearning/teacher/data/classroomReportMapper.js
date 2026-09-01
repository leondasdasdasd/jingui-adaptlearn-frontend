import { isMasteredValue } from "../../shared/domain/masteryPolicy.js";
import {
  buildClassroomStudents,
  knowledgePointName,
} from "../domain/teacherClassroom";

const finiteNumber = (value) => {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const percentValue = (value) => {
  const numeric = finiteNumber(value);
  if (numeric == null) return null;
  return Math.max(0, Math.min(100, numeric <= 1 ? numeric * 100 : numeric));
};

const average = (values) => {
  const present = values.filter((value) => value != null);
  return present.length > 0
    ? Math.round(present.reduce((sum, value) => sum + value, 0) / present.length)
    : null;
};

const determinedResults = (report) =>
  (report?.masteryResults || []).filter(
    (item) => item.status === "DETERMINED" && item.mastery != null,
  );

/** 将一个学生的结算报告映射为报告列表数据。 */
function mappedStudent(student) {
  const report = student.report || null;
  const masteryResults = determinedResults(report);
  const preMastery = average(
    masteryResults.map((item) => percentValue(item.priorMastery)),
  );
  const postMastery = average(
    masteryResults.map((item) => percentValue(item.mastery)),
  );
  const confidences = masteryResults.map((item) =>
    percentValue(item.confidence),
  );
  const reportQuestionCount = finiteNumber(report?.answeredQuestionCount);
  return {
    id: student.id,
    name: student.name,
    learningMinutes: finiteNumber(student.learningMinutes),
    questionCount: reportQuestionCount ?? finiteNumber(student.questionCount),
    accuracy: finiteNumber(student.accuracy),
    knowledgePointCount: masteryResults.length,
    preMastery,
    postMastery,
    gain:
      preMastery == null || postMastery == null
        ? null
        : postMastery - preMastery,
    confidence: average(confidences),
    scoreStatus: report?.score?.status || "WAITING",
    scoreReviewStatus: report?.score?.reviewStatus || "",
    scoreSummary: report?.score?.summary || "",
  };
}

/** 汇总某学生在单个知识点上的真实作答。 */
function answerMetrics(answers, studentSessionId, knowledgeObjectiveId) {
  const items = answers.filter(
    (answer) =>
      answer.studentSessionId === studentSessionId &&
      answer.knowledgeObjectiveId === knowledgeObjectiveId,
  );
  const ratios = items
    .map((answer) => {
      const score = finiteNumber(answer.score);
      const maxScore = finiteNumber(answer.maxScore);
      return score == null || maxScore == null || maxScore <= 0
        ? null
        : score / maxScore;
    })
    .filter((ratio) => ratio != null);
  return {
    questionCount: items.length,
    accuracy:
      ratios.length > 0
        ? Math.round(
            (ratios.filter((ratio) => ratio >= 0.8).length / ratios.length) *
              100,
          )
        : null,
  };
}

/** 根据权威掌握度返回页面使用的稳定状态。 */
function masteryStatus(postMastery) {
  if (postMastery == null) return "PENDING";
  if (isMasteredValue(postMastery)) return "EXCELLENT";
  return postMastery >= 65 ? "GOOD" : "NEEDS_REINFORCEMENT";
}

/** 将单个学生知识点结算映射为展示行。 */
function studentMasteryRow(result, student, report, answers) {
  const postMastery =
    result.status === "DETERMINED" ? percentValue(result.mastery) : null;
  const preMastery = percentValue(result.priorMastery);
  const metrics = answerMetrics(
    answers,
    report.studentSessionId,
    result.knowledgeObjectiveId,
  );
  return {
    studentId: student?.id || report.studentId,
    studentName: student?.name || report.studentName || "",
    preMastery,
    postMastery,
    gain:
      postMastery == null || preMastery == null
        ? null
        : postMastery - preMastery,
    confidence: percentValue(result.confidence),
    accuracy: metrics.accuracy,
    questionCount: metrics.questionCount,
    status: masteryStatus(postMastery),
  };
}

/** 按知识点汇总全班学生的真实结算与作答。 */
function mappedKnowledgePoints(reports, students, answers) {
  const rows = new Map();
  for (const report of reports) {
    const student = students.find(
      (item) =>
        item.id === report.studentId || item.sessionId === report.studentSessionId,
    );
    for (const result of report.masteryResults || []) {
      const id = result.knowledgeObjectiveId;
      if (!id) continue;
      if (!rows.has(id))
        rows.set(id, { id, name: knowledgePointName(id), students: [] });
      rows
        .get(id)
        .students.push(studentMasteryRow(result, student, report, answers));
    }
  }
  return [...rows.values()].map((row) => {
    const questionCount = row.students.reduce(
      (sum, student) => sum + student.questionCount,
      0,
    );
    const answeredStudents = row.students.filter(
      (student) => student.questionCount > 0,
    ).length;
    return {
      ...row,
      avgPre: average(row.students.map((student) => student.preMastery)),
      avgPost: average(row.students.map((student) => student.postMastery)),
      avgConfidence: average(
        row.students.map((student) => student.confidence),
      ),
      avgAccuracy: average(row.students.map((student) => student.accuracy)),
      totalQuestions: questionCount,
      avgQuestionsPerStudent:
        answeredStudents > 0
          ? Number((questionCount / answeredStudents).toFixed(1))
          : null,
      masteredCount: row.students.filter(
        (student) =>
          student.postMastery != null && isMasteredValue(student.postMastery),
      ).length,
    };
  });
}

const firstText = (values) =>
  String(values.find((value) => value != null && value !== "") || "");

/** 将课堂 DTO 收窄为报告页所需元信息。 */
function mappedPeriod(period = {}) {
  const durationSeconds = finiteNumber(period.durationSeconds);
  const scheduledStartAt = period.scheduledStartAt || "";
  const startedAtMs = Date.parse(scheduledStartAt);
  return {
    id: firstText([period.id, period.periodId]),
    title: firstText([period.title]),
    className: firstText([period.className]),
    courseName: firstText([period.teachingCourseName]),
    semesterName: firstText([period.semesterName]),
    scheduledStartAt,
    endsAt:
      Number.isFinite(startedAtMs) && durationSeconds != null
        ? new Date(startedAtMs + durationSeconds * 1000).toISOString()
        : "",
    durationMinutes:
      durationSeconds == null
        ? null
        : Math.max(0, Math.round(durationSeconds / 60)),
    linkedLessonIds: Array.isArray(period.linkedLessonIds)
      ? period.linkedLessonIds.filter(Boolean)
      : [],
  };
}

/**
 * 将课堂服务 DTO 映射为教师报告页面唯一数据形状，缺失证据始终保留 null。
 * @param {object} payload 课堂、快照和结算报告 DTO
 * @param {object} payload.period 课堂 DTO
 * @param {object} payload.snapshot 实时快照 DTO
 * @param {object[]} payload.reports 学生结算 DTO
 * @returns {object} 稳定报告页面模型
 */
export function classroomReportFromApi({
  period = {},
  snapshot = {},
  reports = [],
} = {}) {
  const safeReports = Array.isArray(reports) ? reports : [];
  const safeSnapshot = snapshot || {};
  const classroomStudents = buildClassroomStudents(safeSnapshot, safeReports);
  return {
    period: mappedPeriod(period),
    students: classroomStudents.map((student) => mappedStudent(student)),
    knowledgePoints: mappedKnowledgePoints(
      safeReports,
      classroomStudents,
      safeSnapshot.answers || [],
    ),
  };
}
