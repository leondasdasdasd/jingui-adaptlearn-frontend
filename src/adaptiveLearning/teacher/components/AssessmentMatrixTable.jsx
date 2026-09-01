import React from "react";
import { Link2 } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import {
  assessmentDomains,
  assessmentLevels,
  assessmentRoleMeta,
} from "../presentation/assessmentPresentation";

/** 渲染规范化后的单个知识点评估矩阵。 */
export default function AssessmentMatrixTable({
  cells,
  selectedCellId,
  onSelectCell,
}) {
  const domains = assessmentDomains(trans);
  const levels = assessmentLevels(trans);
  const cellsByCoordinate = new Map(
    cells.map((cell) => [`${cell.domain}:${cell.level}`, cell]),
  );
  return (
    <div
      className="assessment-matrix-table-scroll"
      role="region"
      aria-label={trans(
        "adaptiveLearning.assessment.matrixScrollable",
        "评估矩阵，可横向滚动",
      )}
    >
      <table className="assessment-matrix-table">
        <thead>
          <tr>
            <th scope="col">
              {trans("adaptiveLearning.assessment.domain", "领域")}
            </th>
            {levels.map((level) => (
              <th key={level.id} scope="col">
                <strong>{level.id}</strong>
                <span>{level.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {domains.map((domain) => (
            <tr key={domain.id}>
              <th scope="row">
                <strong>{domain.id}</strong>
                <span>{domain.label}</span>
              </th>
              {levels.map((level) => {
                const cell = cellsByCoordinate.get(`${domain.id}:${level.id}`);
                const role = assessmentRoleMeta(
                  cell?.role || "NOT_APPLICABLE",
                  trans,
                );
                if (!cell || cell.role === "NOT_APPLICABLE") {
                  return (
                    <td key={level.id}>
                      <div
                        className="assessment-matrix-cell not-applicable"
                        aria-label={trans(
                          "adaptiveLearning.assessment.cellNotApplicable",
                          "{$cell} 不适用",
                          { cell: `${domain.id}-${level.id}` },
                        )}
                      >
                        <span>—</span>
                        <small>{role.label}</small>
                      </div>
                    </td>
                  );
                }
                return (
                  <td key={level.id}>
                    <button
                      type="button"
                      className={`assessment-matrix-cell ${role.className}${selectedCellId === cell.cellId ? " selected" : ""}`}
                      aria-pressed={selectedCellId === cell.cellId}
                      aria-label={trans(
                        "adaptiveLearning.assessment.cellAria",
                        "{$cell} {$role}，关联 {$count} 道题",
                        {
                          cell: `${cell.domain}-${cell.level}`,
                          role: role.label,
                          count: cell.questions.length,
                        },
                      )}
                      onClick={() => onSelectCell(cell.cellId)}
                    >
                      <strong>{`${cell.domain}-${cell.level}`}</strong>
                      <span>{role.label}</span>
                      <small>
                        <Link2 size={12} aria-hidden="true" />
                        {cell.questions.length}
                      </small>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

AssessmentMatrixTable.propTypes = {
  cells: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedCellId: PropTypes.string.isRequired,
  onSelectCell: PropTypes.func.isRequired,
};
