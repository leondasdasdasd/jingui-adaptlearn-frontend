import React from "react";
import { ChevronDown } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../utils/i18n";

/**
 * 开课第一步：系统课程与自适应内容课时分别选择。
 * @param {object} props 目录、选择状态与配置动作。
 * @param props.subjects
 * @param props.courses
 * @param props.semesterName
 * @param props.selectedSubjectId
 * @param props.selectedCourseId
 * @param props.onSubjectChange
 * @param props.onCourseChange
 * @param props.chapters
 * @param props.availableLessonIds
 * @param props.selectedLessonIds
 * @param props.onToggleLesson
 * @param props.loading
 * @returns {React.ReactElement} 课程和课时配置视图。
 */
export default function StartClassCourseStep({
  subjects,
  courses,
  semesterName,
  selectedSubjectId,
  selectedCourseId,
  onSubjectChange,
  onCourseChange,
  chapters,
  availableLessonIds,
  selectedLessonIds,
  onToggleLesson,
  loading,
}) {
  return (
    <div className="start-class-step1-container">
      <div className="start-class-form-grid">
        <div className="start-class-form-field">
          <label htmlFor="start-class-subject">
            <span>
              {trans("adaptiveLearning.startClass.systemSubject", "系统学科")}
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

        <div className="start-class-form-field">
          <label htmlFor="start-class-course">
            <span>
              {trans("adaptiveLearning.startClass.systemCourse", "系统课程")}
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

        <fieldset className="start-class-lesson-scope full-width">
          <legend>
            {trans(
              "adaptiveLearning.startClass.linkedLessons",
              "关联内容课时",
            )}
            <strong className="required-star">*</strong>
          </legend>
          <p>
            {trans(
              "adaptiveLearning.startClass.linkedLessonsDescription",
              "可跨章节选择 1–3 个已发布课时；系统课程变化不会覆盖此范围。",
            )}
          </p>
          <div className="start-class-lesson-chapters">
            {chapters.map((chapter) => (
              <section key={chapter.id} className="start-class-lesson-chapter">
                <header>
                  <strong>
                    {chapter.index} {chapter.title}
                  </strong>
                  <span>
                    {trans(
                      "adaptiveLearning.startClass.lessonCount",
                      "{$count} 个课时",
                      { count: chapter.sections.length },
                    )}
                  </span>
                </header>
                <div className="start-class-lesson-options">
                  {chapter.sections.map((lesson) => {
                    const checked = selectedLessonIds.includes(lesson.id);
                    const published = availableLessonIds.includes(lesson.id);
                    return (
                      <label
                        key={lesson.id}
                        htmlFor={`start-class-lesson-${lesson.id}`}
                        className={`start-class-lesson-option${checked ? " selected" : ""}${published ? "" : " disabled"}`}
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
              </section>
            ))}
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
  onSubjectChange: PropTypes.func.isRequired,
  onToggleLesson: PropTypes.func.isRequired,
  selectedCourseId: PropTypes.string.isRequired,
  selectedLessonIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedSubjectId: PropTypes.string.isRequired,
  semesterName: PropTypes.string.isRequired,
  subjects: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};
