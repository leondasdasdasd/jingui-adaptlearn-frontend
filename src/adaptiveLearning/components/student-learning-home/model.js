/* eslint-disable complexity -- 保留既有题型兼容与掌握度映射分支。 */

import {
  adaptLegacyQuestion,
  canUseQuestionPlatformEditor,
  canUseQuestionPlatformPlayer,
  createQuestionPlatformDraft,
} from "../../shared/question-platform/legacyQuestionAdapter";
import {
  createSerializedRichContent,
  getQuestionPlatformTemplate,
  repairEmbeddedChoiceDescriptions,
} from "../../shared/question-platform/questionContract";

const questionTypeLabels = {
  single_choice: "单选题",
  multiple_choice: "多选题",
  fill_blank: "填空题",
  short_answer: "问答题",
  judgement: "判断题",
  ordering: "排序题",
  classification: "分类题",
  matching: "匹配题",
  line_connect: "连线题",
  text_marker: "文本标记题",
  word_builder: "组式题",
};

const difficultyLabels = {
  1: "D1 基础识别",
  2: "D2 直接理解",
  3: "D3 标准应用",
  4: "D4 变式综合",
  5: "D5 迁移应用",
};

// 预设高频教学知识点清单，用于防空降级填充与归类
export const DEFAULT_KPS = [
  "1.1.1 正数与负数的概念与分类",
  "1.1.2 具有相反意义的量与基准选择",
  "1.2.1 数轴表示与相反数规律",
  "1.2.2 绝对值的几何意义与化简",
];

// 计算知识点归属哪一课 (Lesson Attribution)
/**
 *
 * @param kpName
 * @param profile
 */
export function getLessonAttribution(kpName, profile) {
  const rec = (profile?.records || []).find(
    (r) => r.knowledgePointName === kpName,
  );
  if (rec?.chapterTitle && rec?.lessonTitle)
    return `${rec.chapterTitle} · ${rec.lessonTitle}`;
  if (rec?.lessonTitle) return rec.lessonTitle;
  if (profile?.lessonTitle) return profile.lessonTitle;

  if (kpName.includes("1.1.1") || kpName.includes("正数与负数")) {
    return "第一章 有理数 · 第1课 正数和负数的概念与表示";
  }
  if (
    kpName.includes("1.1.2") ||
    kpName.includes("相反意义") ||
    kpName.includes("基准")
  ) {
    return "第一章 有理数 · 第1课 正数和负数的概念与表示";
  }
  if (
    kpName.includes("1.2.1") ||
    kpName.includes("数轴") ||
    kpName.includes("相反数")
  ) {
    return "第一章 有理数 · 第2课 有理数与数轴规律";
  }
  if (kpName.includes("1.2.2") || kpName.includes("绝对值")) {
    return "第一章 有理数 · 第3课 绝对值与大小比较";
  }
  return "第一章 有理数 · 课堂综合应用课";
}

// 计算知识点最近一次学习活跃的时间戳
/**
 *
 * @param kpName
 * @param attempts
 * @param timeline
 * @param supportActivities
 */
export function getKpLatestTime(kpName, attempts, timeline, supportActivities) {
  let maxTime = 0;

  for (const a of attempts.filter((a) => a.kpName === kpName)) {
    const t = new Date(
      a.presentedAt || a.endedAt || a.startedAt || 0,
    ).getTime();
    if (t > maxTime) maxTime = t;
  }

  for (const t of timeline.filter((t) => t.kpName === kpName)) {
    const time = new Date(t.endedAt || t.startedAt || 0).getTime();
    if (time > maxTime) maxTime = time;
  }

  for (const s of supportActivities.filter((s) => s.kpName === kpName)) {
    const time = new Date(s.occurredAt || 0).getTime();
    if (time > maxTime) maxTime = time;
  }

  return maxTime;
}

/**
 *
 * @param value
 */
export function percent(value) {
  return value == null || !Number.isFinite(Number(value))
    ? "—"
    : `${Math.round(Number(value))}%`;
}

/**
 *
 * @param value
 * @param withSeconds
 */
export function dateTime(value, withSeconds = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  if (withSeconds) {
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 *
 * @param seconds
 */
export function duration(seconds = 0) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  if (value < 60) return `${value} 秒`;
  const minutes = Math.floor(value / 60);
  const remain = value % 60;
  return remain ? `${minutes} 分 ${remain} 秒` : `${minutes} 分钟`;
}

/**
 *
 * @param score
 * @param settled
 */
export function scoreState(score, settled = false) {
  if (!score)
    return {
      label: "学习中",
      text: "学习记录正在同步，证据完整后会生成正式学习结论。",
    };
  if (score.status === "READY") {
    return {
      label: score.reviewStatus === "PUBLISHED" ? "结论已确认" : "结论待确认",
      text: score.summary,
    };
  }
  return settled
    ? { label: "证据待补充", text: score.summary }
    : { label: "证据积累中", text: score.summary };
}

/**
 *
 * @param value
 */
export function questionType(value) {
  const normalized = normalizedQuestionType(value);
  return questionTypeLabels[normalized] || (value ? String(value) : "题型未知");
}

/**
 *
 * @param value
 */
function normalizedQuestionType(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");
}

/**
 *
 * @param value
 */
export function difficulty(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  const level = Number(normalized.replace(/^D/, ""));
  return difficultyLabels[level] || (value ? String(value) : "难度未知");
}

/**
 *
 * @param option
 * @param index
 */
export function optionLabel(option, index) {
  return String(
    option?.label ||
      option?.key ||
      option?.id ||
      String.fromCodePoint(65 + index),
  ).trim();
}

/**
 *
 * @param value
 */
export function contentText(value) {
  if (Array.isArray(value))
    return value
      .map((item) => contentText(item))
      .filter(Boolean)
      .join("、");
  if (value && typeof value === "object")
    return contentText(value.text ?? value.value ?? "");
  return value == null ? "" : String(value).trim();
}

/**
 *
 * @param value
 * @param options
 */
export function answerText(value, options = []) {
  const text = contentText(value);
  if (!text || options.length === 0) return text;
  const selected = text.split(/[\s,、，]+/).filter(Boolean);
  if (selected.length === 0) return text;
  const matched = selected.map((choice) =>
    options.find(
      (option, index) =>
        optionLabel(option, index).toUpperCase() === choice.toUpperCase(),
    ),
  );
  if (matched.some((option) => !option)) return text;
  return matched
    .map((option) => {
      const originalIndex = options.indexOf(option);
      return `${optionLabel(option, originalIndex)}. ${contentText(option?.text ?? option)}`;
    })
    .join("；");
}

/**
 *
 * @param score
 * @param maxScore
 * @param result
 */
export function scoreText(score, maxScore, result) {
  if (!Number.isFinite(Number(score)) || !Number.isFinite(Number(maxScore))) {
    return result === "已通过"
      ? "答对 (10分)"
      : result === "进行中"
        ? "待评分"
        : "0 分";
  }
  return `${Number(score)} / ${Number(maxScore)} 分`;
}

/**
 *
 * @param result
 */
export function attemptTone(result) {
  if (result === "已通过") return "success";
  if (result === "进行中") return "neutral";
  return "warning";
}

/**
 *
 * @param value
 * @param type
 * @param stem
 */
function editorAnswerValue(value, type, stem) {
  if (
    Array.isArray(value) &&
    [
      "multiple_choice",
      "ordering",
      "matching",
      "line_connect",
      "text_marker",
    ].includes(type)
  )
    return value;
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    ["classification", "matching", "line_connect", "word_builder"].includes(
      type,
    )
  )
    return value;
  const text = contentText(value);
  if (!text) return "";
  if (type === "multiple_choice")
    return text.split(/[\s,、，]+/).filter(Boolean);
  const blankCount = String(stem || "").match(/_{2,}/g)?.length || 0;
  if (type === "fill_blank" && blankCount > 1)
    return text.split(/[\n、]+/).filter(Boolean);
  return text;
}

/**
 *
 * @param question
 * @param draft
 * @param templates
 */
function withReviewExtras(question, draft, templates) {
  const extras = [];
  const draftExtras = [];
  const addExtra = (type, name, value) => {
    const text = contentText(value);
    if (!text) return;
    extras.push({ name, type });
    draftExtras.push({ content: createSerializedRichContent(text), type });
  };
  if (question.type === "short_answer")
    addExtra("sampleAnswer", "正确答案", question.answer);
  addExtra("solvingProcess", "答案解析", question.analysis);
  return {
    draft: { ...draft, extras: draftExtras },
    templates: templates.map((template, index) =>
      index === 0
        ? {
            ...template,
            structure: { ...template.structure, extras },
          }
        : template,
    ),
  };
}

/**
 *
 * @param attempt
 */
export function questionRendererModel(attempt) {
  const source = attempt.question || {};
  const type = normalizedQuestionType(source.type);
  const stem = contentText(source.stem);
  const question = repairEmbeddedChoiceDescriptions({
    id: `attempt-${attempt.sequence}`,
    stem,
    type,
    difficulty: source.difficulty,
    options: (Array.isArray(source.options) ? source.options : []).map(
      (option, index) => ({
        id: optionLabel(option, index),
        text: contentText(option?.text ?? option),
      }),
    ),
    categories: (Array.isArray(source.categories) ? source.categories : []).map(
      (item, index) => ({
        id: String(item?.id || `C${index + 1}`),
        text: contentText(item?.text ?? item),
      }),
    ),
    items: (Array.isArray(source.items) ? source.items : []).map(
      (item, index) => ({
        id: String(item?.id || `I${index + 1}`),
        text: contentText(item?.text ?? item),
      }),
    ),
    columns: (Array.isArray(source.columns) ? source.columns : []).map(
      (column, columnIndex) => ({
        id: String(column?.id || `column-${columnIndex + 1}`),
        items: (Array.isArray(column?.items) ? column.items : []).map(
          (item, itemIndex) => ({
            id: String(item?.id || `item-${columnIndex + 1}-${itemIndex + 1}`),
            text: contentText(item?.text ?? item),
          }),
        ),
      }),
    ),
    segments: (Array.isArray(source.segments) ? source.segments : []).map(
      (segment) => ({
        ...(segment?.markerId ? { markerId: String(segment.markerId) } : {}),
        text: contentText(segment?.text ?? segment),
      }),
    ),
    template: contentText(source.template),
    candidateOptions: (Array.isArray(source.candidateOptions)
      ? source.candidateOptions
      : []
    ).map((item) => contentText(item)),
    answer: editorAnswerValue(attempt.correctAnswer, type, stem),
    analysis: contentText(source.analysis),
  });
  if (!question.stem) return { question, renderer: null };
  try {
    if (canUseQuestionPlatformPlayer(question)) {
      const adapted = adaptLegacyQuestion(
        question,
        editorAnswerValue(attempt.answer, type, stem),
      );
      const review = withReviewExtras(
        question,
        adapted.draft,
        adapted.templates,
      );
      return {
        question,
        renderer: {
          kind: "player",
          ...adapted,
          ...review,
        },
      };
    }
    if (!canUseQuestionPlatformEditor(question))
      return { question, renderer: null };
    const draft = createQuestionPlatformDraft(question);
    const templates = [getQuestionPlatformTemplate(question.type)];
    return {
      question,
      renderer: {
        kind: "preview",
        ...withReviewExtras(question, draft, templates),
      },
    };
  } catch {
    return { question, renderer: null };
  }
}
