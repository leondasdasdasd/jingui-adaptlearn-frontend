/* eslint-disable complexity, sonarjs/cognitive-complexity, sonarjs/no-nested-template-literals -- 保留既有题目筛选与单一编辑保存链路。 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { QuestionContentEditor } from "@yungu-fed/question-editor";
import { Eye, EyeOff, Pencil, Plus, Save, Star, Trash2, X } from "lucide-react";
import PropTypes from "prop-types";

import { knowledgeEvidenceProfile } from "../shared/domain/questionEvidence";
import {
  difficultyStarCount,
  localizedDifficultyLabel,
} from "../shared/presentation/difficultyPresentation";
import { choiceLayoutClassName } from "../shared/question-platform/choiceLayout";
import {
  canUseQuestionPlatformEditor,
  createQuestionPlatformDraft,
  readQuestionPlatformDraft,
} from "../shared/question-platform/legacyQuestionAdapter";
import { getQuestionPlatformTemplate } from "../shared/question-platform/questionContract";
import useStableId from "../shared/react/useStableId";
import { parseQuestionOptionDraft } from "../teacher/domain/questionOptionDraft";
import {
  difficultyOptions,
  emptyQuestion,
  hasReferenceAnswer,
  optionsText,
  resetTypeSpecificFields,
  typeLabels,
} from "./teacher-question-review/model";
import {
  assignmentContextPropType,
  knowledgePointPropType,
  questionPropType,
} from "./teacher-question-review/propTypes";
import QuestionSlotBadge from "./teacher-question-review/QuestionSlotBadge";
import ReadonlyQuestionPreview from "./teacher-question-review/ReadonlyQuestionPreview";

export { questionSlotPresentation } from "./teacher-question-review/model";

/**
 * @param root0
 * @param root0.mode
 * @param root0.questions
 * @param root0.knowledgePoints
 * @param root0.onChange
 * @param root0.initialScope
 * @param root0.title
 * @param root0.hideKnowledgePointTabs
 * @param root0.headerActions
 * @param root0.disabled
 * @param root0.creationRequest
 * @param root0.onCreationRequestHandled
 * @param root0.assignmentContext
 */
export default function TeacherQuestionReview({
  mode,
  questions,
  knowledgePoints,
  onChange,
  initialScope,
  title,
  hideKnowledgePointTabs = false,
  headerActions = null,
  disabled = false,
  creationRequest = null,
  onCreationRequestHandled,
  assignmentContext,
}) {
  const isReviewPool = initialScope === "review";
  const [selectedKp, setSelectedKp] = useState(
    initialScope ||
      (mode === "practice" ? knowledgePoints[0]?.id || "all" : "all"),
  );

  useEffect(() => {
    if (initialScope) {
      setSelectedKp(initialScope);
    }
  }, [initialScope]);
  const [editing, setEditing] = useState(null);
  const [expandedQuestionIds, setExpandedQuestionIds] = useState(
    () => new Set(),
  );
  const [optionDraft, setOptionDraft] = useState("");
  const [platformDraft, setPlatformDraft] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const editingId = editing?.id;
  const dialogTitleId = useStableId("teacher-question-review-title");
  const questionTabsId = useStableId("teacher-question-review-tabs");
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const knowledgePointTabRefs = useRef([]);
  const visible = useMemo(
    () =>
      questions.filter((item) => {
        if (selectedKp === "all") return true;
        if (selectedKp === "review") return item.phase === "review";
        return (
          item.phase !== "review" &&
          item.knowledgePointIds?.includes(selectedKp)
        );
      }),
    [questions, selectedKp],
  );
  const selectedKnowledgePointIndex = knowledgePoints.findIndex(
    (kp) => kp.id === selectedKp,
  );
  const selectedKnowledgePointTabId =
    selectedKnowledgePointIndex >= 0
      ? `${questionTabsId}-tab-${selectedKnowledgePointIndex}`
      : undefined;

  const openEditor = (question) => {
    if (disabled) return;
    openerRef.current = document.activeElement;
    const fallbackKnowledgePointId =
      selectedKp === "all" || selectedKp === "review"
        ? knowledgePoints[0]?.id
        : selectedKp;
    const value = question || {
      ...emptyQuestion(mode, fallbackKnowledgePointId),
      ...(isReviewPool
        ? {
            phase: "review",
            knowledgePointIds: knowledgePoints.map(
              (knowledgePoint) => knowledgePoint.id,
            ),
            primaryKnowledgePointId: knowledgePoints[0]?.id,
          }
        : {}),
    };
    setEditing({ ...value });
    setOptionDraft(optionsText(value));
    setPlatformDraft(
      canUseQuestionPlatformEditor(value)
        ? createQuestionPlatformDraft(value)
        : null,
    );
    setValidationErrors({});
  };

  useEffect(() => {
    if (!creationRequest || disabled) return;
    const fallbackKnowledgePointId =
      selectedKp === "all" || selectedKp === "review"
        ? knowledgePoints[0]?.id
        : selectedKp;
    const base = {
      ...emptyQuestion(mode, fallbackKnowledgePointId),
      ...creationRequest.draft,
    };
    const value = resetTypeSpecificFields(base, base.type);
    openerRef.current = creationRequest.opener || document.activeElement;
    setEditing(value);
    setOptionDraft(optionsText(value));
    setPlatformDraft(
      canUseQuestionPlatformEditor(value)
        ? createQuestionPlatformDraft(value)
        : null,
    );
    setValidationErrors({});
    onCreationRequestHandled?.(creationRequest.id);
  }, [
    creationRequest,
    disabled,
    knowledgePoints,
    mode,
    onCreationRequestHandled,
    selectedKp,
  ]);

  const closeEditor = useCallback(() => {
    setEditing(null);
    setPlatformDraft(null);
    setValidationErrors({});
    window.setTimeout(() => openerRef.current?.focus?.(), 0);
  }, []);

  useEffect(() => {
    if (disabled && editingId) closeEditor();
  }, [closeEditor, disabled, editingId]);

  useEffect(() => {
    if (!editingId) return;
    const dialog = dialogRef.current;
    window.setTimeout(
      () =>
        dialog
          ?.querySelector('textarea, select, input, [contenteditable="true"]')
          ?.focus(),
      0,
    );
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeEditor();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeEditor, editingId]);

  const saveQuestion = () => {
    if (disabled) return;
    const platformContent =
      platformDraft && canUseQuestionPlatformEditor(editing)
        ? readQuestionPlatformDraft(platformDraft, editing.type, editing)
        : null;
    const content = platformContent
      ? { ...editing, ...platformContent }
      : editing;
    const nextErrors = {};
    if (!String(content?.stem || "").trim()) nextErrors.stem = "请输入题干";
    if (!hasReferenceAnswer(content)) nextErrors.answer = "请输入参考答案";
    if (
      ["single_choice", "multiple_choice"].includes(content?.type) &&
      !platformContent &&
      parseQuestionOptionDraft(optionDraft).length < 2
    )
      nextErrors.options = "至少填写两个有效选项";
    if (Object.keys(nextErrors).length > 0) {
      setValidationErrors(nextErrors);
      return;
    }
    const phase = isReviewPool ? "review" : editing.phase;
    const kpId = editing.knowledgePointIds?.[0] || knowledgePoints[0]?.id;
    const reviewIds = knowledgePoints.map((kp) => kp.id);
    const primaryKnowledgePointId =
      phase === "review"
        ? reviewIds.includes(editing.primaryKnowledgePointId)
          ? editing.primaryKnowledgePointId
          : reviewIds[0]
        : kpId;
    const evidenceProfile = knowledgeEvidenceProfile({
      ...editing,
      phase,
      knowledgePointIds: phase === "review" ? reviewIds : [kpId],
      primaryKnowledgePointId,
    });
    const next = {
      ...content,
      phase,
      options: platformContent
        ? platformContent.options
        : ["single_choice", "multiple_choice"].includes(content.type)
          ? parseQuestionOptionDraft(optionDraft)
          : [],
      knowledgePointIds: phase === "review" ? reviewIds : [kpId],
      primaryKnowledgePointId: evidenceProfile.primaryKnowledgePointId,
      knowledgePointWeights: evidenceProfile.knowledgePointWeights,
    };
    const exists = questions.some((item) => item.id === next.id);
    onChange(
      exists
        ? questions.map((item) => (item.id === next.id ? next : item))
        : [...questions, next],
    );
    closeEditor();
  };

  const changeQuestionType = (type) => {
    const next = resetTypeSpecificFields(editing, type);
    setEditing(next);
    setPlatformDraft(
      canUseQuestionPlatformEditor(next)
        ? createQuestionPlatformDraft(next)
        : null,
    );
  };

  const deleteQuestion = (id) => {
    if (disabled) return;
    if (!window.confirm("确定删除这道题吗？")) return;
    onChange(questions.filter((item) => item.id !== id));
  };

  const toggleAnswer = (id) => {
    setExpandedQuestionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleKnowledgePointTabKeyDown = (event, index) => {
    if (knowledgePoints.length === 0) return;
    let nextIndex;
    switch (event.key) {
      case "ArrowRight": {
        nextIndex = (index + 1) % knowledgePoints.length;
        break;
      }
      case "ArrowLeft": {
        nextIndex =
          (index - 1 + knowledgePoints.length) % knowledgePoints.length;
        break;
      }
      case "Home": {
        nextIndex = 0;
        break;
      }
      case "End": {
        nextIndex = knowledgePoints.length - 1;
        break;
      }
      default: {
        return;
      }
    }
    event.preventDefault();
    setSelectedKp(knowledgePoints[nextIndex].id);
    window.requestAnimationFrame(() =>
      knowledgePointTabRefs.current[nextIndex]?.focus(),
    );
  };

  const kpName = (question) => {
    const names = knowledgePoints
      .filter((kp) => question.knowledgePointIds?.includes(kp.id))
      .map((kp) => kp.name);
    if (question.phase === "review") {
      const primary = knowledgePoints.find(
        (kp) =>
          kp.id === knowledgeEvidenceProfile(question).primaryKnowledgePointId,
      )?.name;
      const secondary = names.filter((name) => name !== primary);
      return `课时综合 · 主：${primary || "未标注"}${secondary.length > 0 ? ` · 次：${secondary.join("、")}` : ""}`;
    }
    return names[0] || "未关联知识点";
  };

  return (
    <section className="question-review-workspace">
      <header className="question-review-toolbar">
        <div>
          <strong>
            {title ||
              (mode === "pre"
                ? "课前测验题"
                : isReviewPool
                  ? "综合练习题"
                  : "知识点练习题")}
          </strong>
        </div>
        <div className="question-review-actions">
          {headerActions}
          <button
            className="teacher-neutral"
            type="button"
            disabled={disabled}
            onClick={() => openEditor(null)}
          >
            <Plus size={15} />
            新增题目
          </button>
        </div>
      </header>

      {mode === "practice" && !isReviewPool && !hideKnowledgePointTabs && (
        <div
          className="question-kp-tabs"
          role="tablist"
          aria-label="知识点题池"
        >
          {knowledgePoints.map((kp, index) => (
            <button
              key={kp.id}
              ref={(node) => {
                knowledgePointTabRefs.current[index] = node;
              }}
              id={`${questionTabsId}-tab-${index}`}
              role="tab"
              aria-controls={`${questionTabsId}-panel`}
              aria-selected={selectedKp === kp.id}
              tabIndex={selectedKp === kp.id ? 0 : -1}
              className={selectedKp === kp.id ? "active" : ""}
              type="button"
              onClick={() => setSelectedKp(kp.id)}
              onKeyDown={(event) =>
                handleKnowledgePointTabKeyDown(event, index)
              }
            >
              {kp.name}
              <span>
                {
                  questions.filter(
                    (q) =>
                      q.phase !== "review" &&
                      q.knowledgePointIds?.includes(kp.id),
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
      )}

      <div
        className="question-review-list"
        id={
          mode === "practice" && !isReviewPool
            ? `${questionTabsId}-panel`
            : undefined
        }
        role={mode === "practice" && !isReviewPool ? "tabpanel" : undefined}
        aria-labelledby={
          mode === "practice" && !isReviewPool
            ? selectedKnowledgePointTabId
            : undefined
        }
      >
        {visible.map((question, index) => (
          <article className="teacher-question-row" key={question.id}>
            <div className="teacher-question-row-header">
              <span
                className="teacher-question-index"
                aria-label={`第 ${index + 1} 题`}
              >
                {index + 1}
              </span>
              <div className="teacher-question-meta">
                <span className="teacher-question-type">
                  {typeLabels[question.type] || question.type}
                </span>
                <QuestionSlotBadge
                  question={question}
                  assignmentContext={assignmentContext}
                />
                <span
                  className="teacher-question-difficulty"
                  aria-label={`难度 ${localizedDifficultyLabel(question.difficulty)}`}
                >
                  <span>难度</span>
                  <span
                    className="teacher-question-difficulty-stars"
                    aria-hidden="true"
                  >
                    {[1, 2, 3, 4, 5].map((level) => {
                      const filledLevel = difficultyStarCount(
                        question.difficulty,
                      );
                      return (
                        <Star
                          key={level}
                          className={level <= filledLevel ? "filled" : "empty"}
                          size={13}
                        />
                      );
                    })}
                  </span>
                </span>
                <span className="teacher-question-knowledge">
                  知识点：{kpName(question)}
                </span>
              </div>
              <div className="teacher-question-actions">
                <button
                  type="button"
                  aria-label={
                    expandedQuestionIds.has(question.id)
                      ? "收起答案解析"
                      : "查看答案解析"
                  }
                  onClick={() => toggleAnswer(question.id)}
                >
                  {expandedQuestionIds.has(question.id) ? (
                    <EyeOff size={15} />
                  ) : (
                    <Eye size={15} />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="编辑题目"
                  disabled={disabled}
                  onClick={() => openEditor(question)}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  aria-label="删除题目"
                  disabled={disabled}
                  onClick={() => deleteQuestion(question.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div
              className={`teacher-question-preview-wrap ${choiceLayoutClassName(question)}`}
            >
              <ReadonlyQuestionPreview
                question={question}
                showAnswer={expandedQuestionIds.has(question.id)}
              />
            </div>
          </article>
        ))}
        {visible.length === 0 && (
          <div className="teacher-empty">当前范围还没有题目</div>
        )}
      </div>

      {editing && (
        <div
          className="question-editor-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
        >
          <button
            className="question-editor-mask"
            type="button"
            aria-label="关闭题目编辑"
            onClick={closeEditor}
          />
          <section ref={dialogRef}>
            <header>
              <div>
                <small>
                  {questions.some((item) => item.id === editing.id)
                    ? "编辑题目"
                    : "新增题目"}
                </small>
                <h2 id={dialogTitleId}>题目内容</h2>
              </div>
              <button
                type="button"
                aria-label="关闭题目编辑"
                onClick={closeEditor}
              >
                <X size={18} />
              </button>
            </header>
            <div className="question-editor-form">
              {Object.keys(validationErrors).length > 0 && (
                <div
                  className="question-editor-validation-summary"
                  role="alert"
                >
                  请检查标红的必填内容
                </div>
              )}
              <label>
                <span>题型</span>
                <select
                  value={editing.type}
                  onChange={(event) => changeQuestionType(event.target.value)}
                >
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>难度</span>
                <select
                  value={String(editing.difficulty || "3").replace(/^d/i, "")}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      difficulty: Number(event.target.value),
                    })
                  }
                >
                  {difficultyOptions.map((value) => (
                    <option key={value} value={value}>
                      {localizedDifficultyLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
              {mode === "practice" && (
                <label>
                  <span>所属范围</span>
                  {isReviewPool ? (
                    <select value="review" disabled>
                      <option value="review">综合练习</option>
                    </select>
                  ) : (
                    <select
                      value={editing.knowledgePointIds?.[0]}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          phase: "knowledge",
                          knowledgePointIds: [event.target.value],
                          primaryKnowledgePointId: event.target.value,
                        })
                      }
                    >
                      {knowledgePoints.map((kp) => (
                        <option key={kp.id} value={kp.id}>
                          {kp.name}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              )}
              {mode === "practice" && isReviewPool && (
                <label>
                  <span>主要知识点</span>
                  <select
                    value={
                      editing.primaryKnowledgePointId || knowledgePoints[0]?.id
                    }
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        primaryKnowledgePointId: event.target.value,
                      })
                    }
                  >
                    {knowledgePoints.map((kp) => (
                      <option key={kp.id} value={kp.id}>
                        {kp.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {platformDraft && canUseQuestionPlatformEditor(editing) ? (
                <div
                  className="wide question-platform-content-editor"
                  aria-invalid={Boolean(
                    validationErrors.stem || validationErrors.answer,
                  )}
                >
                  <QuestionContentEditor
                    locale="zh-CN"
                    onChange={setPlatformDraft}
                    questionTypeTemplates={[
                      getQuestionPlatformTemplate(editing.type),
                    ]}
                    value={platformDraft}
                  />
                  {(validationErrors.stem || validationErrors.answer) && (
                    <small className="field-error">
                      请填写题干并设置参考答案
                    </small>
                  )}
                </div>
              ) : (
                <>
                  <label className="wide">
                    <span>题干</span>
                    <textarea
                      rows={4}
                      aria-invalid={Boolean(validationErrors.stem)}
                      value={editing.stem}
                      onChange={(event) => {
                        setEditing({ ...editing, stem: event.target.value });
                        setValidationErrors((current) => ({
                          ...current,
                          stem: "",
                        }));
                      }}
                    />
                    {validationErrors.stem && (
                      <small className="field-error">
                        {validationErrors.stem}
                      </small>
                    )}
                  </label>
                  {["single_choice", "multiple_choice"].includes(
                    editing.type,
                  ) && (
                    <label className="wide">
                      <span>选项（每行一项）</span>
                      <textarea
                        rows={5}
                        aria-invalid={Boolean(validationErrors.options)}
                        value={optionDraft}
                        onChange={(event) => {
                          setOptionDraft(event.target.value);
                          setValidationErrors((current) => ({
                            ...current,
                            options: "",
                          }));
                        }}
                        placeholder={"A. 选项一\nB. 选项二"}
                      />
                      {validationErrors.options && (
                        <small className="field-error">
                          {validationErrors.options}
                        </small>
                      )}
                    </label>
                  )}
                  <label className="wide">
                    <span>参考答案</span>
                    <textarea
                      rows={3}
                      aria-invalid={Boolean(validationErrors.answer)}
                      value={
                        Array.isArray(editing.answer)
                          ? editing.answer.join(",")
                          : editing.answer
                      }
                      onChange={(event) => {
                        setEditing({
                          ...editing,
                          answer:
                            editing.type === "multiple_choice"
                              ? event.target.value
                                  .split(/[\s,、，]+/)
                                  .filter(Boolean)
                                  .map((v) => v.toUpperCase())
                              : event.target.value,
                        });
                        setValidationErrors((current) => ({
                          ...current,
                          answer: "",
                        }));
                      }}
                    />
                    {validationErrors.answer && (
                      <small className="field-error">
                        {validationErrors.answer}
                      </small>
                    )}
                  </label>
                </>
              )}
              {editing.type !== "short_answer" && (
                <label className="wide">
                  <span>解析</span>
                  <textarea
                    rows={3}
                    value={editing.analysis || ""}
                    onChange={(event) =>
                      setEditing({ ...editing, analysis: event.target.value })
                    }
                  />
                </label>
              )}
            </div>
            <footer>
              <button
                className="teacher-neutral"
                type="button"
                onClick={closeEditor}
              >
                取消
              </button>
              <button
                className="teacher-primary"
                type="button"
                onClick={saveQuestion}
              >
                <Save size={15} />
                保存题目
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}

TeacherQuestionReview.propTypes = {
  mode: PropTypes.string.isRequired,
  questions: PropTypes.arrayOf(questionPropType).isRequired,
  knowledgePoints: PropTypes.arrayOf(knowledgePointPropType).isRequired,
  onChange: PropTypes.func.isRequired,
  initialScope: PropTypes.string,
  title: PropTypes.string,
  hideKnowledgePointTabs: PropTypes.bool,
  headerActions: PropTypes.node,
  disabled: PropTypes.bool,
  creationRequest: PropTypes.shape({
    id: PropTypes.string.isRequired,
    draft: PropTypes.shape({
      blueprintSlotId: PropTypes.string.isRequired,
      assessmentPolicyId: PropTypes.string,
      matrixCellId: PropTypes.string.isRequired,
      matrixRole: PropTypes.string,
      type: PropTypes.string.isRequired,
      difficulty: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        .isRequired,
      knowledgePointIds: PropTypes.arrayOf(PropTypes.string).isRequired,
      primaryKnowledgePointId: PropTypes.string.isRequired,
    }).isRequired,
    opener: PropTypes.object,
  }),
  onCreationRequestHandled: PropTypes.func,
  assignmentContext: assignmentContextPropType,
};
