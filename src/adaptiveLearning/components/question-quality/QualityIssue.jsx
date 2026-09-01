import React from "react";
import PropTypes from "prop-types";

import {
  qualityText,
  questionQualityCertaintyLabel,
  questionQualityIssueTypeLabel,
  questionQualitySeverityLabel,
} from "../../teacher/presentation/questionQualityPresentation";

const issueValue = (issue, ...keys) => {
  const key = keys.find((item) => issue?.[item]);
  return key ? String(issue[key]) : "";
};

/** 显示单条服务端质检问题，字段兼容仅保留在此展示边界。 */
export default function QualityIssue({ issue, index }) {
  const field =
    issueValue(issue, "field", "location") ||
    qualityText("issue.questionContent", "题目内容");
  const location = issueValue(issue, "location");
  const original = issueValue(issue, "originalText", "original", "excerpt");
  const reason = issueValue(issue, "reason", "message");
  const evidence = issueValue(issue, "evidence");
  const revision = issueValue(
    issue,
    "suggestedRevision",
    "suggestion",
    "correction",
  );
  const corrected = issueValue(issue, "correctedValue");
  const severity = issueValue(issue, "severity");
  const type = issueValue(issue, "type");
  const certainty = issueValue(issue, "certainty");
  const details = [
    ["original", original, ""],
    ["reason", reason, ""],
    ["evidence", evidence, ""],
    ["revision", revision, ""],
    ["corrected", corrected, "qq-corrected"],
  ].filter(([, value]) => value);
  return (
    <article className="qq-issue">
      <header>
        <strong>
          {qualityText("issue.number", "问题 {$index}", { index: index + 1 })}
        </strong>
        <span>{field}</span>
        {location && location !== field && <span>{location}</span>}
        {type && <span>{questionQualityIssueTypeLabel(type)}</span>}
        {severity && (
          <span className={`qq-severity ${severity}`}>
            {questionQualitySeverityLabel(severity)}
          </span>
        )}
        {certainty && (
          <span className={`qq-certainty ${certainty}`}>
            {questionQualityCertaintyLabel(certainty)}
          </span>
        )}
      </header>
      <dl>
        {details.map(([key, value, className]) => (
          <React.Fragment key={key}>
            <dt>{qualityText(`issue.${key}`, key)}</dt>
            <dd className={className || undefined}>{value}</dd>
          </React.Fragment>
        ))}
      </dl>
    </article>
  );
}

QualityIssue.propTypes = {
  index: PropTypes.number.isRequired,
  issue: PropTypes.shape({}).isRequired,
};
