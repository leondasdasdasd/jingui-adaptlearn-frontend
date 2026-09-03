import React from "react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import AssessmentSlotItem from "./AssessmentSlotItem";

/**
 *
 * @param root0
 * @param root0.slots
 */
export default function AssessmentSlotList({ slots, ...actions }) {
  if (slots.length === 0) return null;
  const groups = [];
  const groupByCellId = new Map();
  for (const slot of slots) {
    const cellId = slot.matrixCellId || slot.matrixCode || "unassigned";
    let group = groupByCellId.get(cellId);
    if (!group) {
      group = { id: cellId, matrixCode: slot.matrixCode, slots: [] };
      groupByCellId.set(cellId, group);
      groups.push(group);
    }
    group.slots.push(slot);
  }
  return (
    <div className="assessment-slot-list">
      {groups.map((group) => (
        <section className="assessment-slot-cell-group" key={group.id}>
          <header className="assessment-slot-cell-group-header">
            <button
              type="button"
              className="assessment-slot-group-matrix-code"
              onClick={() => actions.onOpenMatrixCell?.(group.id)}
              aria-label={trans(
                "adaptiveLearning.assessment.openMatrixSlot",
                "查看矩阵格 {$code} 的要求",
                { code: group.matrixCode },
              )}
            >
              <strong>{group.matrixCode}</strong>
            </button>
            <span>
              {trans(
                "adaptiveLearning.assessment.typeSlotCount",
                "{$count} 个题型槽",
                { count: group.slots.length },
              )}
            </span>
          </header>
          {group.slots.map((slot) => (
            <AssessmentSlotItem key={slot.id} slot={slot} {...actions} />
          ))}
        </section>
      ))}
    </div>
  );
}

AssessmentSlotList.propTypes = {
  slots: PropTypes.arrayOf(PropTypes.object).isRequired,
  expansionMode: PropTypes.oneOf(["default", "all", "none"]).isRequired,
  disabled: PropTypes.bool.isRequired,
  onSelectQuestion: PropTypes.func,
  onCreateQuestion: PropTypes.func,
  onGenerateQuestion: PropTypes.func,
  onRemoveQuestion: PropTypes.func,
  onOpenMatrixCell: PropTypes.func,
};
