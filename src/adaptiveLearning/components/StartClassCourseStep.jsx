import React, { useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../utils/i18n";

const GRADE_OPTIONS = [
  { id: "grade-7", name: "七年级" },
  { id: "grade-8", name: "八年级" },
  { id: "grade-9", name: "九年级" },
  { id: "grade-10", name: "预备十年级" },
  { id: "grade-11", name: "高一" },
  { id: "grade-12", name: "高二" },
];

/**
 * 开课第一步：系统课程与自适应内容课时选择。
 * @param {object} props 目录、选择状态与配置动作。
 * @returns {React.ReactElement} 课程和课时配置视图。
 */
export default function StartClassCourseStep({
  subjects,
  courses,
  semesterName,
  selectedSubjectId,
  selectedCourseId,
  selectedGradeId = "grade-7",
  onGradeChange,
  onSubjectChange,
  onCourseChange,
  chapters,
  availableLessonIds,
  selectedLessonIds,
  onToggleLesson,
  loading,
}) {
  // 默认不展开课程列表（收起状态），按需点击展开
  const [expandedChapterIds, setExpandedChapterIds] = useState(() => new Set());

  const toggleChapterExpand = (chapterId) => {
    setExpandedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const toggleAllChapters = () => {
    if (expandedChapterIds.size === chapters.length) {
      setExpandedChapterIds(new Set());
    } else {
      setExpandedChapterIds(new Set(chapters.map((c) => c.id)));
    }
  };

  return (
    <div className="start-class-step1-container">
      <div className="start-class-form-grid">
        {/* 年级选择 */}
        <div className="start-class-form-field">
          <label htmlFor="start-class-grade">
            <span>{trans("adaptiveLearning.startClass.grade", "年级")}</span>
            <strong className="required-star">*</strong>
          </label>
          <div className="start-class-select-wrap">
            <select
              id="start-class-grade"
              disabled={loading}
              value={selectedGradeId}
              onChange={(event) => onGradeChange && onGradeChange(event.target.value)}
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="select-chevron" />
          </div>
        </div>

        {/* 学科选择 */}
        <div className="start-class-form-field">
          <label htmlFor="start-class-subject">
            <span>
              {trans("adaptiveLearning.startClass.subject", "学科")}
            </span>
            <strong className="required-star">*</strong>
          </label>
          <div className="start-class-select-wrap">
            <select
              id="start-class-subject"
              disabled={loading || subjects.length === 0}
              value={selectedSubjectId}
              onChange={(event) => onSubjectChange(event.target.value)}
            >
              {subjects.map((subject) => (
                <option key={subject.subjectId} value={subject.subjectId}>
                  {subject.subjectName ||
                    trans(
                      "adaptiveLearning.startClass.untitledSubject",
                      "未命名学科",
                    )}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="select-chevron" />
          </div>
        </div>

        {/* 所属课程选择 */}
        <div className="start-class-form-field full-width">
          <label htmlFor="start-class-course">
            <span>
              {trans("adaptiveLearning.startClass.course", "课程")}
            </span>
            <strong className="required-star">*</strong>
          </label>
          <div className="start-class-select-wrap">
            <select
              id="start-class-course"
              disabled={loading || courses.length === 0}
              value={selectedCourseId}
              onChange={(event) => onCourseChange(event.target.value)}
            >
              {courses.map((courseItem) => (
                <option key={courseItem.courseId} value={courseItem.courseId}>
                  {courseItem.courseName ||
                    trans(
                      "adaptiveLearning.startClass.untitledCourse",
                      "未命名课程",
                    )}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="select-chevron" />
          </div>
          <small className="start-class-field-message">
            {semesterName
              ? `${semesterName} · ${trans(
                  "adaptiveLearning.startClass.assignedCourses",
                  "当前教师课程",
                )}`
              : trans(
                  "adaptiveLearning.startClass.assignedCourses",
                  "当前教师课程",
                )}
          </small>
        </div>

        {/* 关联/选择课时列表 - 默认收起列表 */}
        <fieldset className="start-class-lesson-scope full-width">
          <legend className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1">
              {trans("adaptiveLearning.startClass.selectDirectoryHint", "点击下拉选择课程目录。支持多选，")}
              <strong className="required-star">*</strong>
            </span>
            <button
              type="button"
              className="text-xs text-blue-600 hover:text-blue-800 font-normal cursor-pointer bg-transparent border-0"
              onClick={toggleAllChapters}
            >
              {expandedChapterIds.size === chapters.length ? "收起全部" : "展开全部"}
            </button>
          </legend>
          <div className="start-class-lesson-chapters">
            {chapters.map((chapter) => {
              const isExpanded = expandedChapterIds.has(chapter.id);
              const selectedInChapterCount = chapter.sections.filter((s) =>
                selectedLessonIds.includes(s.id),
              ).length;

              return (
                <section key={chapter.id} className="start-class-lesson-chapter">
                  <header
                    onClick={() => toggleChapterExpand(chapter.id)}
                    className="cursor-pointer select-none hover:bg-slate-50 transition-colors"
                  >
                    <strong className="flex items-center gap-2">
                      {isExpanded ? (
                        <FolderOpen size={16} className="text-blue-600" />
                      ) : (
                        <Folder size={16} className="text-slate-400" />
                      )}
                      <span>
                        {chapter.index} {chapter.title}
                      </span>
                      {selectedInChapterCount > 0 && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-semibold">
                          已选 {selectedInChapterCount}
                        </span>
                      )}
                    </strong>
                    <div className="flex items-center gap-2">
                      <span>
                        {trans(
                          "adaptiveLearning.startClass.lessonCount",
                          "{$count} 个课时",
                          { count: chapter.sections.length },
                        )}
                      </span>
                      <ChevronRight
                        size={15}
                        className={`text-slate-400 transition-transform duration-200 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </header>

                  {isExpanded && (
                    <div className="start-class-lesson-options">
                      {chapter.sections.map((lesson) => {
                        const checked = selectedLessonIds.includes(lesson.id);
                        const published = availableLessonIds.includes(lesson.id);
                        return (
                          <label
                            key={lesson.id}
                            htmlFor={`start-class-lesson-${lesson.id}`}
                            className={`start-class-lesson-option${
                              checked ? " selected" : ""
                            }${published ? "" : " disabled"}`}
                          >
                            <span className="sr-only">
                              {trans(
                                "adaptiveLearning.startClass.chooseLesson",
                                "选择课时",
                              )}
                            </span>
                            <input
                              id={`start-class-lesson-${lesson.id}`}
                              type="checkbox"
                              checked={checked}
                              disabled={!published}
                              onChange={() => onToggleLesson(lesson.id)}
                            />
                            <span className="custom-checkbox" />
                            <span className="lesson-option-copy">
                              <strong>
                                {lesson.index} {lesson.title}
                              </strong>
                              <small>
                                {published
                                  ? trans("global.publishedStatus", "已发布")
                                  : trans(
                                      "adaptiveLearning.startClass.notPublished",
                                      "未发布",
                                    )}
                              </small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

StartClassCourseStep.propTypes = {
  availableLessonIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  chapters: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  courses: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  loading: PropTypes.bool.isRequired,
  onCourseChange: PropTypes.func.isRequired,
  onGradeChange: PropTypes.func,
  onSubjectChange: PropTypes.func.isRequired,
  onToggleLesson: PropTypes.func.isRequired,
  selectedCourseId: PropTypes.string.isRequired,
  selectedGradeId: PropTypes.string,
  selectedLessonIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedSubjectId: PropTypes.string.isRequired,
  semesterName: PropTypes.string.isRequired,
  subjects: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
