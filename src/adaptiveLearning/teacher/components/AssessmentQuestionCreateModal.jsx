import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import {
  difficultyOptions,
  typeLabels,
} from "../../components/teacher-question-review/model";
import { localizedDifficultyLabel } from "../../shared/presentation/difficultyPresentation";
import { parseQuestionOptionDraft } from "../domain/questionOptionDraft";

/**
 * 题目插槽新建题目模态框。
 * 允许教师为指定插槽新建并编写题目内容，保存后直接归入当前插槽。
 */
export default function AssessmentQuestionCreateModal({
  open = false,
  slot = null,
  knowledgePoints = [],
  onClose,
  onConfirm,
}) {
  const [type, setType] = useState("single_choice");
  const [difficulty, setDifficulty] = useState(2);
  const [stem, setStem] = useState("");
  const [optionDraft, setOptionDraft] = useState(
    "A. 选项一\nB. 选项二\nC. 选项三\nD. 选项四",
  );
  const [answer, setAnswer] = useState("A");
  const [analysis, setAnalysis] = useState("");
  const [primaryKpId, setPrimaryKpId] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (!open || !slot) return;
    setType(slot.questionType || "single_choice");
    setDifficulty(slot.difficulty ?? 2);
    setStem("");
    setOptionDraft("A. 选项一\nB. 选项二\nC. 选项三\nD. 选项四");
    setAnswer(slot.questionType === "multiple_choice" ? "A,B" : "A");
    setAnalysis("");
    setPrimaryKpId(
      slot.primaryKnowledgePointId ||
        slot.knowledgePointIds?.[0] ||
        knowledgePoints[0]?.id ||
        "",
    );
    setValidationErrors({});
  }, [open, slot, knowledgePoints]);

  if (!open || !slot) return null;

  const isChoiceType = ["single_choice", "multiple_choice"].includes(type);
  const isOrderingType = type === "ordering";

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === "multiple_choice") {
      setAnswer("A,B");
    } else if (newType === "single_choice") {
      setAnswer("A");
    } else if (newType === "judgement") {
      setAnswer("true");
    } else {
      setAnswer("");
    }
    setValidationErrors({});
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const errors = {};

    if (!stem.trim()) {
      errors.stem = trans(
        "adaptiveLearning.assessment.stemRequired",
        "请填写题干内容",
      );
    }

    let parsedOptions = [];
    if (isChoiceType || isOrderingType) {
      parsedOptions = parseQuestionOptionDraft(optionDraft);
      if (parsedOptions.length < 2) {
        errors.options = trans(
          "adaptiveLearning.assessment.optionsRequired",
          "请至少输入两个选项",
        );
      }
    }

    if (!String(answer).trim()) {
      errors.answer = trans(
        "adaptiveLearning.assessment.answerRequired",
        "请填写或选择参考答案",
      );
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    let formattedAnswer = answer;
    if (type === "multiple_choice") {
      formattedAnswer = String(answer)
        .split(/[\s,、，]+/)
        .filter(Boolean)
        .map((v) => v.toUpperCase());
    } else if (type === "judgement") {
      formattedAnswer = answer === "true" || answer === true;
    }

    const kpIds = slot.knowledgePointIds || (primaryKpId ? [primaryKpId] : []);

    const newQuestion = {
      id: `q-custom-${Date.now()}`,
      stem: stem.trim(),
      type,
      difficulty: Number(difficulty),
      options: parsedOptions,
      answer: formattedAnswer,
      analysis: analysis.trim(),
      primaryKnowledgePointId: primaryKpId,
      knowledgePointIds: kpIds,
      blueprintSlotId: String(slot.id),
      matrixCellId: String(slot.matrixCellId || ""),
      matrixCode: slot.matrixCode || "",
      phase: "assessment",
      source: "custom",
    };

    onConfirm?.(newQuestion);
  };

  return (
    <div
      className="question-editor-modal"
      role="dialog"
      aria-modal="true"
      aria-label={trans("adaptiveLearning.assessment.createQuestion", "新增题目")}
    >
      <button
        className="question-editor-mask"
        type="button"
        aria-label={trans("adaptiveLearning.content.close", "关闭")}
        onClick={onClose}
      />
      <section>
        <header>
          <div>
            <small>
              {trans("adaptiveLearning.assessment.createQuestion", "新增题目")}
            </small>
            <h2>
              {slot.matrixCode
                ? `${slot.matrixCode} · ${trans("adaptiveLearning.assessment.slotQuestionTitle", "插槽题目编写")}`
                : trans("adaptiveLearning.assessment.createQuestion", "新增题目")}
            </h2>
          </div>
          <button
            type="button"
            aria-label={trans("adaptiveLearning.content.close", "关闭")}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <form className="question-editor-form" onSubmit={handleSubmit}>
          {Object.keys(validationErrors).length > 0 && (
            <div
              className="question-editor-validation-summary"
              role="alert"
            >
              {trans(
                "adaptiveLearning.assessment.formErrorHint",
                "请检查标红的必填内容",
              )}
            </div>
          )}

          <label htmlFor="assessment-create-type">
            <span>{trans("adaptiveLearning.assessment.questionType", "题型")}</span>
            <select
              id="assessment-create-type"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              {Object.entries(typeLabels).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="assessment-create-difficulty">
            <span>{trans("adaptiveLearning.assessment.difficulty", "难度")}</span>
            <select
              id="assessment-create-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
            >
              {difficultyOptions.map((val) => (
                <option key={val} value={val}>
                  {localizedDifficultyLabel(val)}
                </option>
              ))}
            </select>
          </label>

          {knowledgePoints.length > 0 && (
            <label htmlFor="assessment-create-primary-kp">
              <span>
                {trans(
                  "adaptiveLearning.curriculum.primaryKnowledgePoint",
                  "主知识点",
                )}
              </span>
              <select
                id="assessment-create-primary-kp"
                value={primaryKpId}
                onChange={(e) => setPrimaryKpId(e.target.value)}
              >
                {knowledgePoints.map((kp) => (
                  <option key={kp.id} value={kp.id}>
                    {kp.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="question-editor-field wide">
            <label htmlFor="assessment-create-stem">
              {trans("adaptiveLearning.assessment.stem", "题干")}
            </label>
            <textarea
              id="assessment-create-stem"
              rows={4}
              value={stem}
              aria-invalid={Boolean(validationErrors.stem)}
              onChange={(e) => {
                setStem(e.target.value);
                setValidationErrors((prev) => ({ ...prev, stem: "" }));
              }}
              placeholder={trans(
                "adaptiveLearning.assessment.stemPlaceholder",
                "请输入题目描述与题干内容…",
              )}
            />
            {validationErrors.stem && (
              <small className="field-error">{validationErrors.stem}</small>
            )}
          </div>

          {(isChoiceType || isOrderingType) && (
            <div className="question-editor-field wide">
              <label htmlFor="assessment-create-options">
                {trans(
                  "adaptiveLearning.assessment.optionsPerLine",
                  "选项（每行一项）",
                )}
              </label>
              <textarea
                id="assessment-create-options"
                rows={4}
                value={optionDraft}
                aria-invalid={Boolean(validationErrors.options)}
                onChange={(e) => {
                  setOptionDraft(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, options: "" }));
                }}
                placeholder={"A. 选项一\nB. 选项二\nC. 选项三\nD. 选项四"}
              />
              {validationErrors.options && (
                <small className="field-error">{validationErrors.options}</small>
              )}
            </div>
          )}

          <div className="question-editor-field wide">
            <label htmlFor="assessment-create-answer">
              {trans("adaptiveLearning.assessment.referenceAnswer", "参考答案")}
            </label>
            {type === "judgement" ? (
              <select
                id="assessment-create-answer"
                value={String(answer)}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, answer: "" }));
                }}
              >
                <option value="true">正确 / True</option>
                <option value="false">错误 / False</option>
              </select>
            ) : (
              <textarea
                id="assessment-create-answer"
                rows={2}
                value={answer}
                aria-invalid={Boolean(validationErrors.answer)}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, answer: "" }));
                }}
                placeholder={
                  type === "multiple_choice"
                    ? "如：A,B 或 A,B,C"
                    : "请输入正确答案"
                }
              />
            )}
            {validationErrors.answer && (
              <small className="field-error">{validationErrors.answer}</small>
            )}
          </div>

          <div className="question-editor-field wide">
            <label htmlFor="assessment-create-analysis">
              {trans("adaptiveLearning.assessment.analysis", "解析")}
            </label>
            <textarea
              id="assessment-create-analysis"
              rows={3}
              value={analysis}
              onChange={(e) => setAnalysis(e.target.value)}
              placeholder={trans(
                "adaptiveLearning.assessment.analysisPlaceholder",
                "可填写题目解析与解题思路（选填）",
              )}
            />
          </div>

          <footer>
            <button
              className="teacher-neutral"
              type="button"
              onClick={onClose}
            >
              {trans("adaptiveLearning.content.cancel", "取消")}
            </button>
            <button className="teacher-primary" type="submit">
              {trans(
                "adaptiveLearning.assessment.saveAndBind",
                "保存并归入插槽",
              )}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

AssessmentQuestionCreateModal.propTypes = {
  open: PropTypes.bool,
  slot: PropTypes.object,
  knowledgePoints: PropTypes.arrayOf(PropTypes.object),
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};
