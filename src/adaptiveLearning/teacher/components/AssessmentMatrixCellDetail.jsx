import React from "react";
import { CheckCircle2 } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import {
  assessmentDomains,
  assessmentLevels,
  assessmentQuestionTypeLabel,
  assessmentRoleMeta,
} from "../presentation/assessmentPresentation";

/** 展示单个矩阵格的证据合同与关联题目。 */
export default function AssessmentMatrixCellDetail({ cell }) {
  const domain = assessmentDomains(trans).find(
    (item) => item.id === cell.domain,
  );
  const level = assessmentLevels(trans).find((item) => item.id === cell.level);
  const role = assessmentRoleMeta(cell.role, trans);
  return (
    <section className="assessment-matrix-detail" aria-live="polite">
      <header>
        <div className="assessment-matrix-detail-title">
          <span className={`assessment-role-tag ${role.className}`}>
            {role.label}
          </span>
          <div>
            <strong>{`${cell.domain}-${cell.level} · ${domain.label} / ${level.label}`}</strong>
            <code>{cell.cellId}</code>
          </div>
        </div>
        <span className="assessment-matrix-evidence-count">
          <CheckCircle2 size={15} aria-hidden="true" />
          {trans(
            "adaptiveLearning.assessment.questionCoverage",
            "{$current} / {$required} 道题型覆盖",
            {
              current: cell.questions.length,
              required: cell.requiredSlotCount,
            },
          )}
        </span>
      </header>

      <div className="assessment-matrix-detail-grid">
        <div className="assessment-matrix-detail-main">
          <section>
            <h4>
              {trans("adaptiveLearning.assessment.targetBehavior", "目标行为")}
            </h4>
            <p>
              {cell.observableBehavior ||
                trans(
                  "adaptiveLearning.assessment.missingTargetBehaviorLong",
                  "尚未填写目标行为",
                )}
            </p>
          </section>
          <section>
            <h4>
              {trans(
                "adaptiveLearning.assessment.evidenceCriteria",
                "证据标准",
              )}
            </h4>
            {cell.evidenceCriteria.length > 0 ? (
              <ul>
                {cell.evidenceCriteria.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="assessment-matrix-empty-copy">
                {trans(
                  "adaptiveLearning.assessment.missingEvidenceCriteria",
                  "尚未填写证据标准",
                )}
              </p>
            )}
          </section>
          {cell.commonMisconceptions.length > 0 && (
            <section>
              <h4>
                {trans(
                  "adaptiveLearning.assessment.commonMisconceptions",
                  "常见误区",
                )}
              </h4>
              <ul>
                {cell.commonMisconceptions.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside>
          <section>
            <h4>
              {trans(
                "adaptiveLearning.assessment.recommendedTypes",
                "建议题型",
              )}
            </h4>
            <div className="assessment-matrix-type-list">
              {cell.recommendedQuestionTypes.length > 0 ? (
                cell.recommendedQuestionTypes.map((questionType) => (
                  <span key={questionType}>
                    {assessmentQuestionTypeLabel(questionType, trans)}
                  </span>
                ))
              ) : (
                <span>
                  {trans("adaptiveLearning.assessment.unspecified", "未指定")}
                </span>
              )}
            </div>
          </section>
          <section>
            <h4>
              {trans("adaptiveLearning.assessment.linkedQuestions", "关联题目")}
            </h4>
            {cell.questions.length > 0 ? (
              <ol className="assessment-matrix-question-list">
                {cell.questions.map((question) => {
                  const questionMeta = [
                    assessmentQuestionTypeLabel(question.type, trans),
                    question.difficulty,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li
                      key={
                        question.id ||
                        `${cell.cellId}-${question.displayNumber}`
                      }
                    >
                      <span>{question.displayNumber}</span>
                      <p>
                        {question.stem ||
                          trans(
                            "adaptiveLearning.assessment.untitledQuestion",
                            "未命名题目",
                          )}
                      </p>
                      <small>{questionMeta}</small>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="assessment-matrix-empty-copy">
                {trans(
                  "adaptiveLearning.assessment.noLinkedQuestions",
                  "暂无关联题目",
                )}
              </p>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

AssessmentMatrixCellDetail.propTypes = {
  cell: PropTypes.shape({
    cellId: PropTypes.string.isRequired,
    domain: PropTypes.string.isRequired,
    level: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
    observableBehavior: PropTypes.string.isRequired,
    evidenceCriteria: PropTypes.arrayOf(PropTypes.string).isRequired,
    commonMisconceptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    recommendedQuestionTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
    requiredSlotCount: PropTypes.number.isRequired,
    questions: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
};
