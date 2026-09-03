import React from "react";
import { CheckCircle2, ChevronRight, CircleDashed, Layers3 } from "lucide-react";
import PropTypes from "prop-types";

import {
  curriculumContentStatus,
  curriculumText,
} from "../presentation/curriculumPresentation";

/**
 * 章节末尾的单元测试内容入口，不参与课时批量生成与课堂启动。
 * @param root0
 * @param root0.entry
 * @param root0.onOpen
 */
export default function UnitAssessmentRow({ entry, onOpen }) {
  const contentStatus = entry.status || "published";
  const contentMeta = curriculumContentStatus(contentStatus);
  const versionNumber = entry.publishedVersionNumber || 1;

  return (
    <article className="batch-unit-row" role="listitem">
      <span className="batch-unit-icon" aria-hidden="true">
        <Layers3 size={17} />
      </span>
      <button className="batch-unit-link" type="button" onClick={onOpen}>
        <span>
          <strong>{curriculumText("unitAssessment", "单元测试")}</strong>
          <small>
            {curriculumText(
              "unitAssessmentSummary",
              "覆盖本章 {$lessonCount} 个课时、{$knowledgeCount} 个知识点",
              {
                lessonCount: entry.lessonCount,
                knowledgeCount: entry.knowledgePointCount,
              },
            )}
          </small>
        </span>
      </button>
      <span className={`batch-content-status ${contentMeta.tone}`}>
        {contentStatus === "published" ? (
          <CheckCircle2 size={14} />
        ) : (
          <CircleDashed size={14} />
        )}
        {contentMeta.label}
      </span>
      <span className="batch-version">
        {versionNumber ? `V${versionNumber}` : "—"}
      </span>
      <div className="batch-row-actions">
        <button className="batch-review-link" type="button" onClick={onOpen}>
          <span>{curriculumText("editContent", "编辑内容")}</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </article>
  );
}

UnitAssessmentRow.propTypes = {
  entry: PropTypes.shape({
    chapterId: PropTypes.string.isRequired,
    lessonCount: PropTypes.number.isRequired,
    knowledgePointCount: PropTypes.number.isRequired,
    status: PropTypes.string,
    publishedVersionNumber: PropTypes.number,
  }).isRequired,
  onOpen: PropTypes.func.isRequired,
};
