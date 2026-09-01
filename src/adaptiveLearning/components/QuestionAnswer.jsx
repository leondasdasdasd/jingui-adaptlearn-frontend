import React, { useEffect, useMemo, useRef, useState } from "react";
import { QuestionPlayer } from "@yungu-fed/question-editor";

import { locale } from "../../utils/i18n";
import { choiceLayoutClassName } from "../shared/question-platform/choiceLayout";
import { prepareQuestionForGradingDisplay } from "../shared/question-platform/gradingDisplay";
import {
  adaptLegacyQuestion,
  canUseQuestionPlatformPlayer,
  readLegacyAnswer,
} from "../shared/question-platform/legacyQuestionAdapter";
import AnswerRichEditor from "./AnswerRichEditor";
import DrawingBoardInput from "./DrawingBoardInput";
import { Check } from "./Icons";
import MathContent from "./MathContent";
import PhotoAnswerInput from "./PhotoAnswerInput";
import VoiceAnswerInput from "./VoiceAnswerInput";

// MathLive 通过 package exports 暴露该样式，旧版 eslint import resolver 无法识别条件导出。
// eslint-disable-next-line import/no-unresolved
import "mathlive/fonts.css";

export const questionTypeLabels = {
  single_choice: "单项选择题",
  multiple_choice: "多项选择题",
  fill_blank: "题干内填空",
  short_answer: "问答题",
  judgement: "判断题",
  ordering: "排序题",
  classification: "分类题",
  matching: "匹配题",
  line_connect: "连线题",
  text_marker: "文本标记题",
  word_builder: "组式题",
};

/**
 *
 * @param root0
 * @param root0.question
 * @param root0.value
 * @param root0.onChange
 * @param root0.disabled
 * @param root0.grading
 */
function PlatformQuestionAnswer({
  question,
  value,
  onChange,
  disabled,
  grading,
}) {
  const { question: displayQuestion, showAnswer } = useMemo(
    () => prepareQuestionForGradingDisplay(question, grading),
    [question, grading],
  );
  const adapted = useMemo(
    () => adaptLegacyQuestion(displayQuestion, value),
    [displayQuestion, value],
  );
  const mathRenderKey = useMemo(
    () =>
      JSON.stringify([
        displayQuestion.id,
        displayQuestion.stem,
        displayQuestion.options,
        displayQuestion.platformQuestion,
        showAnswer,
      ]),
    [displayQuestion, showAnswer],
  );
  return (
    <MathContent
      as="div"
      className={`question-platform-player ${choiceLayoutClassName(displayQuestion)}`}
      renderKey={mathRenderKey}
    >
      <QuestionPlayer
        disabled={disabled}
        locale={locale()}
        onResponseChange={(response) =>
          onChange(readLegacyAnswer(response, question.type))
        }
        questionTypeTemplates={adapted.templates}
        response={adapted.response}
        showAnswer={false}
        value={adapted.draft}
      />
    </MathContent>
  );
}

const FORMULA_ANSWER_KINDS = new Set(["expression", "formula", "latex"]);

/**
 *
 * @param value
 */
function looksLikeLatex(value) {
  return /\\[a-z]+|[^_{}]/i.test(String(value || ""));
}

/**
 *
 * @param root0
 * @param root0.index
 * @param root0.question
 * @param root0.value
 * @param root0.mode
 * @param root0.onModeChange
 * @param root0.onChange
 * @param root0.disabled
 * @param root0.formulaTargeting
 * @param root0.onFormulaTargeted
 */
function InlineFillBlank({
  index,
  question,
  value,
  mode,
  onModeChange,
  onChange,
  disabled,
  formulaTargeting,
  onFormulaTargeted,
}) {
  const answerRef = useRef(null);
  const measureRef = useRef(null);
  const mathFieldRef = useRef(null);
  const focusFormulaRef = useRef(false);
  const resolvedMode =
    mode ||
    (FORMULA_ANSWER_KINDS.has(
      String(question.answerKind || "").toLowerCase(),
    ) || looksLikeLatex(value)
      ? "formula"
      : "text");
  const [inputWidth, setInputWidth] = useState(64);
  const [mathReady, setMathReady] = useState(false);

  useEffect(() => {
    if (resolvedMode !== "formula") return;
    let cancelled = false;
    import("mathlive")
      .then(() => {
        if (!cancelled) setMathReady(true);
      })
      .catch(() => {
        if (!cancelled) setMathReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedMode]);

  useEffect(() => {
    const mathField = mathFieldRef.current;
    if (!mathReady || !mathField) return;
    mathField.mathVirtualKeyboardPolicy = "auto";
    mathField.readOnly = Boolean(disabled || formulaTargeting);
    if (mathField.getValue("latex") !== value) {
      mathField.setValue(value, { silenceNotifications: true });
    }
    if (focusFormulaRef.current && !formulaTargeting && !disabled) {
      focusFormulaRef.current = false;
      window.requestAnimationFrame(() => mathField.focus());
    }
  }, [disabled, formulaTargeting, mathReady, value]);

  useEffect(() => {
    const answerRoot = answerRef.current;
    const measure = measureRef.current;
    if (!answerRoot || !measure) return;
    const resize = () => {
      const containerWidth =
        answerRoot.closest(".inline-fill-answer")?.getBoundingClientRect()
          .width || 360;
      const availableWidth = Math.max(64, containerWidth - 76);
      const contentWidth =
        Math.ceil(measure.getBoundingClientRect().width) + 22;
      setInputWidth(Math.max(64, Math.min(360, availableWidth, contentWidth)));
    };
    resize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(answerRoot);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [mathReady, resolvedMode, value]);

  const updateFormula = (event) => {
    const nextValue = event.currentTarget.getValue?.("latex");
    if (typeof nextValue === "string") onChange(nextValue);
  };
  const label = `空 ${index + 1}`;
  const activateFormula = () => {
    if (!formulaTargeting || disabled) return;
    focusFormulaRef.current = true;
    onModeChange("formula");
    onFormulaTargeted(index);
  };
  const handleTargetKeyDown = (event) => {
    if (!formulaTargeting || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    activateFormula();
  };

  return (
    <span
      className={`inline-fill-blank${formulaTargeting ? " is-formula-target" : ""}`}
      ref={answerRef}
      onClick={activateFormula}
    >
      <span
        className="inline-fill-input-shell"
        style={{ "--inline-fill-width": `${inputWidth}px` }}
      >
        {resolvedMode === "formula" ? (
          <math-field
            ref={mathFieldRef}
            aria-label={
              formulaTargeting ? `选择${label}输入公式` : `${label}公式`
            }
            className="inline-fill-math-field"
            data-loading={mathReady ? undefined : "true"}
            onBlur={updateFormula}
            onInput={updateFormula}
            onKeyDown={handleTargetKeyDown}
          />
        ) : (
          <input
            aria-label={formulaTargeting ? `选择${label}输入公式` : label}
            autoComplete="off"
            disabled={disabled}
            readOnly={formulaTargeting}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleTargetKeyDown}
            value={value}
          />
        )}
        <span
          className="inline-fill-measure"
          ref={measureRef}
          aria-hidden="true"
        >
          {resolvedMode === "formula" && value ? (
            <MathContent
              as="span"
              renderKey={value}
            >{`\\(${value}\\)`}</MathContent>
          ) : (
            value || "答"
          )}
        </span>
      </span>
    </span>
  );
}

/**
 *
 * @param root0
 * @param root0.question
 * @param root0.value
 * @param root0.onChange
 * @param root0.inputModes
 * @param root0.onInputModesChange
 * @param root0.disabled
 * @param root0.formulaTargeting
 * @param root0.onFormulaTargeted
 */
function InlineFillAnswer({
  question,
  value,
  onChange,
  inputModes = [],
  onInputModesChange,
  disabled,
  formulaTargeting,
  onFormulaTargeted,
}) {
  const parts = String(question.stem || "").split(/_{2,}/);
  const blankCount = Math.max(1, parts.length - 1);
  const values = Array.isArray(value)
    ? Array.from({ length: blankCount }, (_, index) =>
        String(value[index] || ""),
      )
    : Array.from({ length: blankCount }, (_, index) =>
        index === 0 ? String(value || "") : "",
      );
  const update = (index, nextValue) => {
    const next = [...values];
    next[index] = nextValue;
    onChange(blankCount === 1 ? next[0] : next);
  };
  return (
    <div className="inline-fill-answer" aria-label="题干内填空">
      {parts.map((part, index) => (
        <span
          className="inline-fill-fragment"
          key={`${question.id}-fragment-${index}`}
        >
          {part && (
            <MathContent
              as="span"
              renderKey={`${question.id}-${index}-${part}`}
            >
              {part}
            </MathContent>
          )}
          {index < blankCount && (
            <InlineFillBlank
              disabled={disabled}
              index={index}
              key={`${question.id}-blank-${index}`}
              mode={inputModes[index]}
              onModeChange={(nextMode) => {
                const nextModes = Array.from(
                  { length: blankCount },
                  (_, modeIndex) =>
                    modeIndex === index
                      ? nextMode
                      : inputModes[modeIndex] || "text",
                );
                onInputModesChange(nextModes);
              }}
              onChange={(nextValue) => update(index, nextValue)}
              formulaTargeting={formulaTargeting}
              onFormulaTargeted={onFormulaTargeted}
              question={question}
              value={values[index]}
            />
          )}
        </span>
      ))}
    </div>
  );
}

/**
 *
 * @param root0
 * @param root0.question
 * @param root0.value
 * @param root0.onChange
 * @param root0.image
 * @param root0.onImageChange
 * @param root0.disabled
 * @param root0.grading
 * @param root0.fillInputModes
 * @param root0.onFillInputModesChange
 * @param root0.formulaTargeting
 * @param root0.onFormulaTargeted
 */
export default function QuestionAnswer({
  question,
  value,
  onChange,
  image,
  onImageChange,
  disabled,
  grading,
  fillInputModes = [],
  onFillInputModesChange = () => {},
  formulaTargeting = false,
  onFormulaTargeted = () => {},
}) {
  if (question.type === "fill_blank") {
    return (
      <InlineFillAnswer
        question={question}
        value={value}
        onChange={onChange}
        inputModes={fillInputModes}
        onInputModesChange={onFillInputModesChange}
        disabled={disabled}
        formulaTargeting={formulaTargeting}
        onFormulaTargeted={onFormulaTargeted}
      />
    );
  }
  if (canUseQuestionPlatformPlayer(question)) {
    return (
      <PlatformQuestionAnswer
        question={question}
        value={value}
        onChange={onChange}
        disabled={disabled}
        grading={grading}
      />
    );
  }

  if (["single_choice", "multiple_choice"].includes(question.type)) {
    const multiple = question.type === "multiple_choice";
    const selectedValues = multiple ? value || [] : [];
    const visibleAnswer = grading?.showAnswer
      ? grading.correctAnswer
      : question.answer;
    return (
      <div
        className={`option-list ${choiceLayoutClassName(question)}`}
        role={multiple ? "group" : "radiogroup"}
        aria-label="答案选项"
      >
        {question.options.map((option) => {
          const active = multiple
            ? selectedValues.includes(option.id)
            : value === option.id;
          const correctAnswers = Array.isArray(visibleAnswer)
            ? visibleAnswer
            : [visibleAnswer];
          const correctOption = grading && correctAnswers.includes(option.id);
          const wrongOption = grading && active && !correctOption;
          return (
            <button
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={active}
              disabled={disabled}
              className={`option-row${active ? " active" : ""}${correctOption ? " correct" : ""}${wrongOption ? " wrong" : ""}`}
              key={option.id}
              onClick={() => {
                if (multiple) {
                  onChange(
                    active
                      ? selectedValues.filter((id) => id !== option.id)
                      : [...selectedValues, option.id],
                  );
                } else {
                  onChange(option.id);
                }
              }}
            >
              <span className={multiple ? "option-key square" : "option-key"}>
                {correctOption ? <Check size={17} /> : option.id}
              </span>
              <MathContent as="span" renderKey={option.text}>
                {option.text}
              </MathContent>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="written-answer subjective">
      <label id={`answer-label-${question.id}`}>我的作答</label>
      <div
        className="answer-composer"
        role="group"
        aria-labelledby={`answer-label-${question.id}`}
      >
        <AnswerRichEditor
          key={question.id}
          disabled={disabled}
          image={image}
          onChange={onChange}
          onImageChange={onImageChange}
          placeholder="在这里写下解题过程与答案"
          value={value || ""}
        />
        <div className="answer-tools" aria-label="作答工具">
          <VoiceAnswerInput
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
          <PhotoAnswerInput
            image={image}
            onChange={onImageChange}
            disabled={disabled}
          />
          <DrawingBoardInput
            image={image}
            onChange={onImageChange}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
