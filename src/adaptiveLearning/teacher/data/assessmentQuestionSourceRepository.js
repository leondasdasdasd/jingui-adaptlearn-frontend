/* eslint-disable complexity -- 真实题库与试卷的异构 DTO 仅在此 repository 边界归一化。 */
import {
  queryInquireTest,
  queryPaperList,
  queryQuestion,
  queryTestView,
  queryViewOrDownPaper,
} from "../../../services/example";
import {
  stageSubjectList,
  teachingMaterialAndGradeList,
} from "../../../services/qustion";
import { createAdaptiveQuestionSnapshotFromV2 } from "../../shared/question-platform/v2QuestionSnapshotAdapter";
import { assessmentQuestionSourceKey } from "../domain/assessmentSlotManagement";

const SUBJECT_NAMES = Object.freeze({
  math: new Set(["数学", "Mathematics", "Math"]),
  science: new Set(["科学", "Science"]),
  physics: new Set(["物理", "Physics"]),
});
const GRADE_NAMES = Object.freeze({
  grade7: ["七年级", "Grade 7", "G7"],
  grade8: ["八年级", "Grade 8", "G8"],
  grade9: ["九年级", "Grade 9", "G9"],
});
const QUESTION_TYPES = Object.freeze([
  { id: "", legacyId: "", label: "全部题型" },
  { id: "single_choice", legacyId: "1", label: "单选题" },
  { id: "multiple_choice", legacyId: "2", label: "多选题" },
  { id: "fill_blank", legacyId: "3", label: "填空题" },
  { id: "judgement", legacyId: "4", label: "判断题" },
  { id: "short_answer", legacyId: "5", label: "问答题" },
]);
const TYPE_BY_NAME = Object.freeze([
  [/单选|single.?choice|^1$/i, "single_choice"],
  [/多选|multiple.?choice|^2$/i, "multiple_choice"],
  [/填空|fill|^3$/i, "fill_blank"],
  [/判断|judg|true.?false|^4$/i, "judgement"],
  [/简答|问答|short.?answer|^5$/i, "short_answer"],
  [/排序|order/i, "ordering"],
  [/分类|classif/i, "classification"],
  [/匹配|match/i, "matching"],
  [/连线|line/i, "line_connect"],
]);

const contentOf = (response) => response?.content ?? response ?? {};
const cloneContent = (value) => JSON.parse(JSON.stringify(value));
const text = (value) => String(value ?? "").trim();
const idOf = (item) => text(item?.id ?? item?.stageId ?? item?.gradeId);
const nameOf = (item) => text(item?.name ?? item?.stageName ?? item?.gradeName);

/**
 *
 * @param response
 * @param fallback
 */
function requireRealResponse(response, fallback) {
  if (response?.ifLogin === false) throw new Error("登录已过期，请重新登录");
  if (response?.status === false) throw new Error(response.message || fallback);
  return contentOf(response);
}

/**
 *
 * @param scope
 */
function normalizedScope(scope = {}) {
  const subject = text(scope.subject);
  const grade = text(scope.grade);
  if (!SUBJECT_NAMES[subject] || !/^grade[7-9]-(?:up|down)$/.test(grade)) {
    throw new Error("当前课时缺少真实题源所需的学科或年级范围");
  }
  return { ...scope, subject, grade };
}

/**
 * 各真实服务从稳定业务范围独立解析自己的数字 ID，目录平台 ID 不跨平台透传。
 * @param scope
 * @param loaders
 */
async function resolveTeachingContext(scope, loaders = {}) {
  const businessScope = normalizedScope(scope);
  const loadStages = loaders.loadStages || stageSubjectList;
  const loadTeaching = loaders.loadTeaching || teachingMaterialAndGradeList;
  const stages = requireRealResponse(await loadStages({}), "学段学科加载失败");
  const stage = (Array.isArray(stages) ? stages : []).find((item) =>
    ["初中", "Junior High School"].some((name) => nameOf(item).includes(name)),
  );
  const subject = (stage?.subjectList || []).find((item) =>
    SUBJECT_NAMES[businessScope.subject].has(nameOf(item)),
  );
  if (!stage || !subject) throw new Error("当前学校未开放该学科的真实题源");
  const teaching = requireRealResponse(
    await loadTeaching({ stageId: idOf(stage) }),
    "年级目录加载失败",
  );
  const gradeKey = businessScope.grade.match(/^grade[7-9]/)?.[0];
  const grade = (teaching.gradeList || []).find((item) =>
    GRADE_NAMES[gradeKey].some((name) => nameOf(item).includes(name)),
  );
  if (!grade) throw new Error("当前学校未配置该年级的真实题源");
  return {
    stageId: Number(idOf(stage)),
    subjectId: Number(idOf(subject)),
    gradeId: Number(idOf(grade)),
  };
}

/**
 *
 * @param question
 * @param questionType
 */
function adaptiveType(question, questionType = {}) {
  const numericType = text(question?.type ?? question?.questionType);
  const numericDefinition = TYPE_BY_NAME.find(([pattern]) =>
    pattern.test(numericType),
  );
  if (numericDefinition) return numericDefinition[1];
  const source = [
    question?.type,
    question?.questionType,
    questionType?.code,
    questionType?.name,
  ].join(" ");
  return TYPE_BY_NAME.find(([pattern]) => pattern.test(source))?.[1] || "";
}

/**
 *
 * @param questionType
 */
function legacyQuestionTypeId(questionType) {
  return (
    QUESTION_TYPES.find((item) => item.id === text(questionType))?.legacyId ||
    ""
  );
}

/**
 *
 * @param question
 */
function legacyQuestionStem(question) {
  return text(question.content ?? question.questionContent ?? question.stem);
}

/**
 *
 * @param question
 */
function legacyQuestionOptions(question) {
  return (question.answersModelList || question.optionList || []).map(
    (option, index) => ({
      id: String.fromCodePoint(65 + index),
      text: text(option.answers ?? option.content ?? option.text),
    }),
  );
}

/**
 *
 * @param question
 * @param type
 * @param stem
 */
function legacyQuestionSnapshot(question, type, stem) {
  return {
    stem,
    type: type || "short_answer",
    difficulty: Number(question.questionLevel ?? question.level) || 3,
    options: legacyQuestionOptions(question),
    answer: cloneContent(question.answer ?? question.gapFillingAnswer ?? ""),
    analysis: text(question.analysis ?? question.questionAnalysis),
    sourceContentSnapshot: cloneContent(question),
  };
}

/**
 *
 * @param question
 * @param source
 * @param renderIndex
 */
function legacyQuestionSelection(question, source = {}, renderIndex = 0) {
  const questionId = text(question.questionId ?? question.id);
  const sourceKind = source.kind || "question_bank";
  const key = assessmentQuestionSourceKey({ kind: sourceKind, questionId });
  const type = adaptiveType(question, question.businessQuestionType || {});
  const stem = legacyQuestionStem(question);
  const supported = Boolean(key && type && stem);
  return {
    key,
    renderKey: key || `${sourceKind}:unidentified:${renderIndex}`,
    label: stem || `试题 #${questionId}`,
    typeLabel:
      QUESTION_TYPES.find((item) => item.legacyId === text(question.type))
        ?.label ||
      text(question.questionTypeName) ||
      "题目",
    difficulty: Math.max(
      1,
      Math.min(5, Number(question.questionLevel ?? question.level) || 3),
    ),
    gradeName: text(question.gradeName),
    subjectName: text(question.subjectName),
    supported,
    unsupportedReason: supported
      ? ""
      : key
        ? "当前自适应课时暂不支持该题型"
        : "题目缺少来源标识，无法加入课时",
    source: {
      kind: sourceKind,
      questionId,
      ...(source.paperId ? { paperId: text(source.paperId) } : {}),
      version: text(question.version),
    },
    snapshot: legacyQuestionSnapshot(question, type, stem),
  };
}

/**
 * 复用一课一练题库筛选合同，返回自适应统一选择项。
 * @param parameters
 * @param loaders
 */
export async function loadAssessmentQuestionBank(
  parameters = {},
  loaders = {},
) {
  const context = await resolveTeachingContext(
    parameters.questionSourceScope,
    loaders,
  );
  const loadQuestions = loaders.loadQuestions || queryQuestion;
  const response = requireRealResponse(
    await loadQuestions({
      content: text(parameters.keyword),
      gradeId: context.gradeId,
      isNoCancat: true,
      knowlegeIds: [],
      limit: 50,
      pageNo: Number(parameters.pageNo) || 1,
      questionLevelList: parameters.difficulty
        ? [Number(parameters.difficulty)]
        : [],
      questionType: legacyQuestionTypeId(parameters.questionType),
      subjectId: context.subjectId,
      type: parameters.scope === "school" ? 2 : 1,
      yearPeriodId: context.stageId,
    }),
    "题库加载失败",
  );
  const items = response.data || response.list || response.items || response;
  return {
    items: (Array.isArray(items) ? items : []).map((item, index) =>
      legacyQuestionSelection(item, {}, index),
    ),
    questionTypes: QUESTION_TYPES,
    total:
      Number(response.totalNum ?? response.totalCount ?? response.total) || 0,
  };
}

/**
 * 将手动新增后回读的 V2 aggregate 转为同一选择合同。
 * @param aggregate
 * @param questionTypes
 */
export function createdQuestionSelection(aggregate, questionTypes = []) {
  const questionTypesById = Object.fromEntries(
    questionTypes.map((item) => [Number(item.businessQuestionTypeId), item]),
  );
  const question = aggregate.question;
  const questionType = questionTypesById[question.businessQuestionTypeId];
  const type = adaptiveType(question, questionType);
  const source = {
    kind: "question_bank",
    questionId: text(question.id),
    version: text(question.version),
  };
  const key = assessmentQuestionSourceKey(source);
  return {
    key,
    renderKey: key || "question_bank:unidentified:created",
    supported: Boolean(key && type),
    source,
    snapshot: createAdaptiveQuestionSnapshotFromV2({
      aggregate,
      questionTypesById,
      type: type || "short_answer",
    }),
  };
}

/**
 *
 * @param response
 */
function paperListItems(response) {
  const content = contentOf(response);
  return (
    content.examList || content.items || content.data || content.list || []
  );
}

/**
 * 复用一课一练真实试卷列表筛选合同。
 * @param parameters
 * @param loaders
 */
export async function loadAssessmentPapers(parameters = {}, loaders = {}) {
  const context = await resolveTeachingContext(
    parameters.questionSourceScope,
    loaders,
  );
  const loadPapers = loaders.loadPapers || queryPaperList;
  const response = await loadPapers({
    examName: text(parameters.keyword),
    examTypeCode: null,
    gradeId: context.gradeId,
    hasEditExam: 1,
    limit: Number(parameters.pageSize) || 50,
    pageNo: Number(parameters.pageNo) || 1,
    semesterId: null,
    subjectId: context.subjectId,
    viewType: parameters.scope === "school" ? 2 : 1,
    year: null,
  });
  requireRealResponse(response, "试卷库加载失败");
  return paperListItems(response).map((paper) => ({
    id: text(paper.id ?? paper.paperId),
    title:
      text(
        paper.examPaperName ?? paper.examName ?? paper.name ?? paper.title,
      ) || "未命名试卷",
    gradeName: text(paper.gradeName),
    subjectName: text(paper.subjectName ?? paper.courseName),
    questionCount: Number(paper.smallQuestionNumbers) || 0,
    createdAt: text(paper.createDate ?? paper.examDate),
  }));
}

/**
 *
 * @param value
 * @param result
 * @param visited
 */
function collectPaperQuestions(value, result = [], visited = new Set()) {
  if (!value || typeof value !== "object" || visited.has(value)) return result;
  visited.add(value);
  const id =
    value.questionId ?? (value.content || value.stem ? value.id : null);
  if (id != null) result.push(value);
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) collectPaperQuestions(item, result, visited);
    } else if (child && typeof child === "object")
      collectPaperQuestions(child, result, visited);
  }
  return result;
}

/**
 * 与一课一练一致，按预览详情、byId、下载详情顺序读取结构化试题。
 * @param paperId
 * @param loaders
 */
export async function loadAssessmentPaperQuestions(paperId, loaders = {}) {
  const details = loaders.loadDetails || [
    queryTestView,
    queryInquireTest,
    queryViewOrDownPaper,
  ];
  for (const loadDetail of details) {
    try {
      const response = await loadDetail({ id: paperId, paperId });
      if (response?.ifLogin === false || response?.status === false) continue;
      const seen = new Set();
      const selections = collectPaperQuestions(contentOf(response)).flatMap(
        (question) => {
          const questionId = text(question.questionId ?? question.id);
          if (!questionId || seen.has(questionId)) return [];
          seen.add(questionId);
          return [
            legacyQuestionSelection(question, { kind: "paper", paperId }),
          ];
        },
      );
      if (selections.length > 0) return selections;
    } catch {
      // 尝试下一条现有真实详情服务，全部失败后统一报错。
    }
  }
  throw new Error("这份试卷暂无可加入的结构化题目");
}

export { resolveTeachingContext };
