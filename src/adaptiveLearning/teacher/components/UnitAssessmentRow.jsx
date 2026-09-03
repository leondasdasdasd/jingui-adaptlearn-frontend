import React from "react";
import { ChevronRight, Layers3 } from "lucide-react";
import PropTypes from "prop-types";

import { curriculumText } from "../presentation/curriculumPresentation";

/**
 * 章节末尾的单元测试内容入口，不参与课时批量生成与课堂启动。
 * @param root0
 * @param root0.entry
 * @param root0.onOpen
 */
export default function UnitAssessmentRow({ entry, onOpen }) {
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
        <span className="batch-unit-action">
          {curriculumText("editUnitAssessment", "编辑单元测试内容")}
          <ChevronRight size={14} />
        </span>
      </button>
    </article>
  );
}

UnitAssessmentRow.propTypes = {
  entry: PropTypes.shape({
    chapterId: PropTypes.string.isRequired,
    lessonCount: PropTypes.number.isRequired,
    knowledgePointCount: PropTypes.number.isRequired,
  }).isRequired,
  onOpen: PropTypes.func.isRequired,
};
