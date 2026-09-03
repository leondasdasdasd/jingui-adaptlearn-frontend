import React, { useMemo } from "react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import {
  PRACTICE_POOL_APPLICATION_RANGE,
  PRACTICE_POOL_DIFFICULTY_COUNTS,
  PRACTICE_POOL_MIN_SIZE_PER_KNOWLEDGE_POINT,
} from "../../shared/domain/questionPoolPolicy";
import {
  difficultyStarCount,
  localizedDifficultyLabel,
} from "../../shared/presentation/difficultyPresentation";

const DIFFICULTY_LEVELS = Object.freeze([1, 2, 3, 4, 5]);

/**
 * 将单点题池验收口径固定在测试题目顶部，生成前后都保持可见。
 * @param root0
 * @param root0.questions
 */
export default function QuestionPoolRequirements({ questions }) {
  const counts = useMemo(
    () =>
      Object.fromEntries(
        DIFFICULTY_LEVELS.map((level) => [
          level,
          questions.filter(
            (question) => difficultyStarCount(question.difficulty) === level,
          ).length,
        ]),
      ),
    [questions],
  );
  const applicationCount = useMemo(
    () =>
      questions.filter((question) => question.taskCategory === "application")
        .length,
    [questions],
  );

  return (
    <section
      className="question-pool-requirements"
      aria-label={trans(
        "adaptiveLearning.assessment.questionPoolRequirements",
        "单点题池要求",
      )}
    >
      <strong>
        {trans("adaptiveLearning.assessment.knowledgeQuestionPool", "单点题池")}
        ：{questions.length}{" "}
        {trans("adaptiveLearning.assessment.questionUnit", "题")}
        <span>
          （
          {trans(
            "adaptiveLearning.assessment.minimumQuestionCount",
            "至少 {$count} 题",
            {
              count: PRACTICE_POOL_MIN_SIZE_PER_KNOWLEDGE_POINT,
            },
          )}
          ）
        </span>
      </strong>
      <div className="question-pool-requirement-counts">
        {DIFFICULTY_LEVELS.map((level) => (
          <span key={level}>
            {localizedDifficultyLabel(level)} {counts[level]}/
            {PRACTICE_POOL_DIFFICULTY_COUNTS[level]}
          </span>
        ))}
        <span>
          {trans("adaptiveLearning.assessment.applicationQuestions", "应用题")}{" "}
          {applicationCount}（
          {trans(
            "adaptiveLearning.assessment.targetRange",
            "目标 {$minimum}–{$maximum}",
            {
              minimum: PRACTICE_POOL_APPLICATION_RANGE.minimum,
              maximum: PRACTICE_POOL_APPLICATION_RANGE.maximum,
            },
          )}
          ）
        </span>
      </div>
    </section>
  );
}

QuestionPoolRequirements.propTypes = {
  questions: PropTypes.arrayOf(PropTypes.object).isRequired,
};
