import React from "react";
import {
  CheckCircle2,
  CircleX,
  Clock3,
  Grid3X3,
  LoaderCircle,
} from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";

const STATUS_ICONS = new Map([
  [
    "running",
    <LoaderCircle
      key="running"
      className="assessment-matrix-spinner"
      size={15}
      aria-hidden="true"
    />,
  ],
  ["success", <CheckCircle2 key="success" size={15} aria-hidden="true" />],
  ["failed", <CircleX key="failed" size={15} aria-hidden="true" />],
  ["pending", <Clock3 key="pending" size={15} aria-hidden="true" />],
  ["stopped", <Clock3 key="stopped" size={15} aria-hidden="true" />],
  ["ready", <Grid3X3 key="ready" size={15} aria-hidden="true" />],
]);

/** 已规划题目插槽的合同与运行状态列表。 */
export default function AssessmentSlotList({ slots }) {
  if (slots.length === 0) return null;
  return (
    <div className="assessment-slot-list">
      {slots.map((slot) => (
        <article
          className={`assessment-slot-item ${slot.status}`}
          key={slot.id}
          title={slot.title}
        >
          <div className="assessment-slot-state-icon">
            {STATUS_ICONS.get(slot.status)}
          </div>
          <div className="assessment-slot-contract">
            <header>
              <strong>{slot.heading}</strong>
              <span>{`${slot.questionTypeLabel} · ${slot.roleLabel}`}</span>
            </header>
            <p>{slot.observableBehavior}</p>
            <dl>
              <div>
                <dt>
                  {trans(
                    "adaptiveLearning.assessment.slotEvidence",
                    "本槽证据",
                  )}
                </dt>
                <dd>{slot.evidenceCriterion}</dd>
              </div>
              <div>
                <dt>
                  {trans(
                    "adaptiveLearning.assessment.variationRequirement",
                    "变化要求",
                  )}
                </dt>
                <dd>{slot.variationRequirement}</dd>
              </div>
            </dl>
          </div>
          <span className="assessment-slot-status">{slot.statusLabel}</span>
        </article>
      ))}
    </div>
  );
}

AssessmentSlotList.propTypes = {
  slots: PropTypes.arrayOf(PropTypes.object).isRequired,
};
