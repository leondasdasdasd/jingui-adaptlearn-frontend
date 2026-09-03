import React from "react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";

const DIFFICULTIES = ["D1", "D2", "D3", "D4", "D5"];

/**
 * 综合与单元共用的知识点题目覆盖查询结果。
 * @param root0
 * @param root0.rows
 */
export default function AssessmentKnowledgeCoverageQuery({ rows }) {
  return (
    <section className="assessment-knowledge-coverage" aria-live="polite">
      <div className="assessment-knowledge-coverage-table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                {trans("adaptiveLearning.assessment.knowledgePoint", "知识点")}
              </th>
              <th>
                {trans(
                  "adaptiveLearning.assessment.primaryQuestionCount",
                  "主知识点题数",
                )}
              </th>
              <th>
                {trans(
                  "adaptiveLearning.assessment.secondaryQuestionCount",
                  "次知识点题数",
                )}
              </th>
              {DIFFICULTIES.map((item, index) => (
                <th key={item}>{index + 1}★</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.name}</strong>
                </td>
                <td>{row.primaryQuestionCount}</td>
                <td>{row.secondaryQuestionCount}</td>
                {DIFFICULTIES.map((item) => (
                  <td key={item}>{row.difficultyCounts[item]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

AssessmentKnowledgeCoverageQuery.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      primaryQuestionCount: PropTypes.number.isRequired,
      secondaryQuestionCount: PropTypes.number.isRequired,
      difficultyCounts: PropTypes.objectOf(PropTypes.number).isRequired,
    }),
  ).isRequired,
};
