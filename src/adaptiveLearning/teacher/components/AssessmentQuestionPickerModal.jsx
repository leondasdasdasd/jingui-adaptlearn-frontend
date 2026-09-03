/* eslint-disable complexity -- 弹窗只在一个互斥工作流中编排题库与试卷两类真实来源。 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, FileText, LoaderCircle, Search, X } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import {
  loadAssessmentPaperQuestions,
  loadAssessmentPapers,
  loadAssessmentQuestionBank,
} from "../data/assessmentQuestionSourceRepository";
import AssessmentQuestionSelectionItem from "./AssessmentQuestionSelectionItem";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 *
 * @param root0
 * @param root0.open
 * @param root0.initialSource
 * @param root0.questionSourceScope
 * @param root0.existingSourceKeys
 * @param root0.preferredQuestionType
 * @param root0.onClose
 * @param root0.onConfirm
 */
export default function AssessmentQuestionPickerModal({
  open,
  initialSource,
  questionSourceScope,
  existingSourceKeys,
  preferredQuestionType,
  onClose,
  onConfirm,
}) {
  const [sourceKind, setSourceKind] = useState(initialSource);
  const [keyword, setKeyword] = useState("");
  const [sourceScope, setSourceScope] = useState("mine");
  const [difficulty, setDifficulty] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bankPage, setBankPage] = useState({
    items: [],
    questionTypes: [],
    total: 0,
  });
  const [questionType, setQuestionType] = useState(preferredQuestionType || "");
  const [papers, setPapers] = useState([]);
  const [selectedPaperId, setSelectedPaperId] = useState("");
  const [paperQuestions, setPaperQuestions] = useState([]);
  const [selected, setSelected] = useState(() => new Map());
  const dialogRef = useRef(null);
  const listRequestIdRef = useRef(0);
  const paperRequestIdRef = useRef(0);
  const onCloseRef = useRef(onClose);

  useEffect(() => setSourceKind(initialSource), [initialSource]);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(
    () => setQuestionType(preferredQuestionType || ""),
    [preferredQuestionType],
  );
  useEffect(() => {
    if (!open) return () => {};
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    const handleDialogKeydown = (event) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [
        ...dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR),
      ];
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleDialogKeydown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDialogKeydown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const requestId = listRequestIdRef.current + 1;
    listRequestIdRef.current = requestId;
    let active = true;
    const isLatestRequest = () =>
      active && listRequestIdRef.current === requestId;
    setSelected(new Map());
    setError("");
    setLoading(true);
    if (sourceKind === "question_bank") {
      void loadAssessmentQuestionBank({
        questionSourceScope,
        keyword,
        questionType,
        difficulty,
        scope: sourceScope,
      })
        .then((page) => {
          if (!isLatestRequest()) return page;
          setBankPage(page);
          return page;
        })
        .catch((loadError) => {
          if (isLatestRequest()) setError(loadError.message);
        })
        .finally(() => {
          if (isLatestRequest()) setLoading(false);
        });
      return () => {
        active = false;
      };
    }
    void loadAssessmentPapers({
      pageNo: 1,
      pageSize: 50,
      questionSourceScope,
      keyword,
      scope: sourceScope,
    })
      .then((items) => {
        if (isLatestRequest()) setPapers(items);
        return items;
      })
      .catch((loadError) => {
        if (isLatestRequest()) setError(loadError.message);
      })
      .finally(() => {
        if (isLatestRequest()) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    difficulty,
    keyword,
    open,
    questionSourceScope,
    questionType,
    sourceKind,
    sourceScope,
  ]);

  useEffect(() => {
    if (!open || sourceKind !== "paper" || !selectedPaperId) return;
    const requestId = paperRequestIdRef.current + 1;
    paperRequestIdRef.current = requestId;
    let active = true;
    const isLatestRequest = () =>
      active && paperRequestIdRef.current === requestId;
    setLoading(true);
    setError("");
    void loadAssessmentPaperQuestions(selectedPaperId)
      .then((items) => {
        if (isLatestRequest()) setPaperQuestions(items);
        return items;
      })
      .catch((loadError) => {
        if (isLatestRequest()) setError(loadError.message);
      })
      .finally(() => {
        if (isLatestRequest()) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, selectedPaperId, sourceKind]);

  const existing = useMemo(
    () => new Set(existingSourceKeys),
    [existingSourceKeys],
  );
  const selectablePaperQuestions = useMemo(
    () =>
      paperQuestions.filter(
        (item) => item.supported && !existing.has(item.key),
      ),
    [existing, paperQuestions],
  );
  const wholePaperSelected =
    selectablePaperQuestions.length > 0 &&
    selectablePaperQuestions.every((item) => selected.has(item.key));
  if (!open) return null;

  const toggle = (item, checked) => {
    setSelected((current) => {
      const next = new Map(current);
      if (checked) next.set(item.key, item);
      else next.delete(item.key);
      return next;
    });
  };

  return (
    <div
      className="assessment-picker-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="assessment-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assessment-picker-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <header>
          <div>
            <h2 id="assessment-picker-title">
              {trans(
                "adaptiveLearning.assessment.selectRealQuestions",
                "选择真实题目",
              )}
            </h2>
            <p>
              {trans(
                "adaptiveLearning.assessment.questionSnapshotNotice",
                "导入后保存内容快照，源题更新不会改变已发布课时",
              )}
            </p>
          </div>
          <button
            type="button"
            className="assessment-picker-close"
            aria-label={trans("global.close", "关闭")}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <div className="assessment-picker-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={sourceKind === "question_bank"}
            onClick={() => setSourceKind("question_bank")}
          >
            <BookOpen size={16} />
            {trans("adaptiveLearning.assessment.questionBank", "题库")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sourceKind === "paper"}
            onClick={() => setSourceKind("paper")}
          >
            <FileText size={16} />
            {trans("adaptiveLearning.assessment.paper", "试卷")}
          </button>
        </div>
        <div className="assessment-picker-filters">
          <div className="assessment-picker-scope" role="tablist">
            {["mine", "school"].map((scope) => (
              <button
                key={scope}
                type="button"
                role="tab"
                aria-selected={sourceScope === scope}
                onClick={() => setSourceScope(scope)}
              >
                {scope === "mine"
                  ? trans("adaptiveLearning.assessment.mine", "我的")
                  : trans("adaptiveLearning.assessment.school", "校本")}
              </button>
            ))}
          </div>
          {sourceKind === "question_bank" ? (
            <>
              <label>
                <span>
                  {trans("adaptiveLearning.assessment.questionType", "题型")}
                </span>
                <select
                  value={questionType}
                  onChange={(event) => setQuestionType(event.target.value)}
                >
                  <option value="">
                    {trans(
                      "adaptiveLearning.assessment.allQuestionTypes",
                      "全部题型",
                    )}
                  </option>
                  {bankPage.questionTypes
                    .filter((type) => type.id)
                    .map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span>
                  {trans("adaptiveLearning.assessment.difficulty", "难度")}
                </span>
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                >
                  <option value="">
                    {trans(
                      "adaptiveLearning.assessment.allDifficulty",
                      "全部难度",
                    )}
                  </option>
                  {[1, 2, 3].map((level) => (
                    <option key={level} value={level}>
                      {trans(
                        `adaptiveLearning.assessment.difficulty${level}`,
                        level === 1 ? "基础" : level === 2 ? "中等" : "较难",
                      )}
                    </option>
                  ))}
                </select>
              </label>
              <label className="assessment-picker-search">
                <span>
                  {trans("adaptiveLearning.assessment.keyword", "关键词")}
                </span>
                <div>
                  <Search size={15} />
                  <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                  />
                </div>
              </label>
            </>
          ) : (
            <form
              className="assessment-picker-paper-search"
              onSubmit={(event) => {
                event.preventDefault();
                setKeyword(
                  event.currentTarget.elements.paperKeyword.value.trim(),
                );
              }}
            >
              <label className="assessment-picker-search">
                <span>
                  {trans("adaptiveLearning.assessment.paperName", "试卷名称")}
                </span>
                <div>
                  <Search size={15} />
                  <input
                    name="paperKeyword"
                    defaultValue={keyword}
                    placeholder={trans(
                      "adaptiveLearning.assessment.searchPaper",
                      "搜索试卷",
                    )}
                    type="search"
                  />
                </div>
              </label>
              <button type="submit" className="assessment-picker-search-button">
                {trans("adaptiveLearning.assessment.search", "搜索")}
              </button>
            </form>
          )}
        </div>
        {error && (
          <div className="assessment-picker-error" role="alert">
            {error}
          </div>
        )}
        <div className="assessment-picker-results" aria-busy={loading}>
          {loading && (
            <div className="assessment-picker-loading">
              <LoaderCircle className="spin" size={18} />
              {trans("global.loading", "加载中")}
            </div>
          )}
          {!loading &&
            sourceKind === "question_bank" &&
            bankPage.items.map((item) => {
              const key = item.key;
              return (
                <AssessmentQuestionSelectionItem
                  key={item.renderKey}
                  item={item}
                  checked={selected.has(key)}
                  existing={existing.has(key)}
                  preferredQuestionType={preferredQuestionType}
                  showCourseMeta={true}
                  onToggle={toggle}
                />
              );
            })}
          {!loading &&
            !error &&
            sourceKind === "question_bank" &&
            bankPage.items.length === 0 && (
              <p className="assessment-picker-empty">
                {trans(
                  "adaptiveLearning.assessment.noQuestionSourceResults",
                  "当前筛选条件下没有可用题目",
                )}
              </p>
            )}
          {!loading &&
            sourceKind === "paper" &&
            !selectedPaperId &&
            papers.map((paper) => (
              <button
                type="button"
                className="assessment-picker-paper-card"
                key={paper.id}
                onClick={() => setSelectedPaperId(paper.id)}
              >
                <strong>{paper.title}</strong>
                <span>
                  {[paper.gradeName, paper.subjectName]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <small>
                  {paper.questionCount
                    ? trans(
                        "adaptiveLearning.assessment.paperQuestionCount",
                        "{$count} 题",
                        { count: paper.questionCount },
                      )
                    : trans(
                        "adaptiveLearning.assessment.openPaper",
                        "查看试题",
                      )}
                </small>
              </button>
            ))}
          {!loading &&
            sourceKind === "paper" &&
            selectedPaperId &&
            selectablePaperQuestions.length > 0 && (
              <button
                type="button"
                className="assessment-picker-bulk"
                onClick={() => {
                  setSelected((current) => {
                    const next = new Map(current);
                    for (const item of selectablePaperQuestions) {
                      if (wholePaperSelected) next.delete(item.key);
                      else next.set(item.key, item);
                    }
                    return next;
                  });
                }}
              >
                {wholePaperSelected
                  ? trans(
                      "adaptiveLearning.assessment.removeWholePaper",
                      "取消整卷选择",
                    )
                  : trans(
                      "adaptiveLearning.assessment.selectWholePaper",
                      "选择整卷题目",
                    )}
              </button>
            )}
          {!loading && sourceKind === "paper" && selectedPaperId && (
            <button
              type="button"
              className="assessment-picker-back"
              onClick={() => {
                setSelectedPaperId("");
                setPaperQuestions([]);
              }}
            >
              {trans(
                "adaptiveLearning.assessment.backToPapers",
                "返回试卷列表",
              )}
            </button>
          )}
          {!loading &&
            !error &&
            sourceKind === "paper" &&
            !selectedPaperId &&
            papers.length === 0 && (
              <p className="assessment-picker-empty">
                {trans(
                  "adaptiveLearning.assessment.noPaperSourceResults",
                  "当前筛选条件下没有可用试卷",
                )}
              </p>
            )}
          {!loading &&
            sourceKind === "paper" &&
            paperQuestions.map((item) => {
              const key = item.key;
              return (
                <AssessmentQuestionSelectionItem
                  key={item.renderKey}
                  item={item}
                  checked={selected.has(key)}
                  existing={existing.has(key)}
                  preferredQuestionType={preferredQuestionType}
                  onToggle={toggle}
                />
              );
            })}
        </div>
        <footer>
          <span>
            {trans(
              "adaptiveLearning.assessment.selectedQuestionCount",
              "已选择 {$count} 题",
              { count: selected.size },
            )}
          </span>
          <div>
            <button
              type="button"
              className="assessment-picker-secondary"
              onClick={onClose}
            >
              {trans("global.cancel", "取消")}
            </button>
            <button
              type="button"
              className="assessment-picker-primary"
              disabled={selected.size === 0}
              onClick={() => onConfirm([...selected.values()])}
            >
              {trans(
                "adaptiveLearning.assessment.addSelectedQuestions",
                "添加所选题目",
              )}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

AssessmentQuestionPickerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  initialSource: PropTypes.oneOf(["question_bank", "paper"]).isRequired,
  questionSourceScope: PropTypes.shape({
    subject: PropTypes.string,
    publisher: PropTypes.string,
    grade: PropTypes.string,
    volume: PropTypes.string,
  }).isRequired,
  existingSourceKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  preferredQuestionType: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};
