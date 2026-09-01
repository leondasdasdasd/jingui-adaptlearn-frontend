import React from "react";
import { Calendar, Clock, Search, Users, X } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../utils/i18n";

/**
 * 开课第二步：从所选系统课程的真实班级中选择一个班级及学生。
 * @param {object} props 花名册、选择状态与交互动作。
 * @param props.classes
 * @param props.activeClassId
 * @param props.onClassChange
 * @param props.selectedStudentIds
 * @param props.onToggleStudent
 * @param props.onToggleAllStudents
 * @param props.searchQuery
 * @param props.onSearchChange
 * @param props.classDate
 * @param props.onDateChange
 * @param props.classTime
 * @param props.onTimeChange
 * @returns {React.ReactElement} 班级学生选择视图。
 */
export default function StartClassRosterStep({
  classes,
  activeClassId,
  onClassChange,
  selectedStudentIds,
  onToggleStudent,
  onToggleAllStudents,
  searchQuery,
  onSearchChange,
  classDate,
  onDateChange,
  classTime,
  onTimeChange,
}) {
  const activeClass =
    classes.find((classroom) => classroom.classId === activeClassId) || null;
  const students = activeClass?.students || [];
  const selectedCount = students.filter((student) =>
    selectedStudentIds.has(student.studentId),
  ).length;
  const allSelected = students.length > 0 && selectedCount === students.length;
  const partiallySelected = selectedCount > 0 && !allSelected;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleStudents = students.filter(
    (student) =>
      !normalizedQuery ||
      student.studentName.toLowerCase().includes(normalizedQuery) ||
      student.studentCode.toLowerCase().includes(normalizedQuery),
  );

  return (
    <div className="start-class-step2-container">
      <div className="start-class-step2-top-bar">
        <div className="start-class-time-group">
          <span className="time-label">
            {trans("adaptiveLearning.startClass.startTime", "开课时间")}
          </span>
          <div className="date-input-wrap">
            <input
              aria-label={trans(
                "adaptiveLearning.startClass.startDate",
                "开课日期",
              )}
              type="date"
              value={classDate}
              onChange={(event) => onDateChange(event.target.value)}
            />
            <Calendar size={15} className="date-icon" />
          </div>
          <div className="time-input-wrap">
            <input
              aria-label={trans(
                "adaptiveLearning.startClass.startTime",
                "开课时间",
              )}
              type="time"
              value={classTime}
              onChange={(event) => onTimeChange(event.target.value)}
            />
            <Clock size={15} className="time-icon" />
          </div>
        </div>
        <div className="start-class-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="search"
            aria-label={trans(
              "adaptiveLearning.startClass.searchStudents",
              "搜索学生",
            )}
            placeholder={trans(
              "adaptiveLearning.startClass.searchStudentPlaceholder",
              "搜索姓名或学号",
            )}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange("")}
              aria-label={trans(
                "adaptiveLearning.startClass.clearSearch",
                "清除搜索",
              )}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="start-class-dual-panel">
        <div className="start-class-left-classes">
          <div className="left-panel-header">
            <span>
              {trans("adaptiveLearning.startClass.liveClasses", "真实班级")}
            </span>
            <small>
              {trans(
                "adaptiveLearning.startClass.classCount",
                "{$count} 个班级",
                { count: classes.length },
              )}
            </small>
          </div>
          <div className="left-classes-list" role="radiogroup">
            {classes.length === 0 && (
              <div className="start-class-empty-state">
                {trans(
                  "adaptiveLearning.startClass.noClasses",
                  "当前课程暂无班级",
                )}
              </div>
            )}
            {classes.map((classroom) => {
              const active = classroom.classId === activeClassId;
              return (
                <button
                  key={classroom.classId}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`class-nav-item${active ? " active" : ""}`}
                  onClick={() => onClassChange(classroom.classId)}
                >
                  <span className="class-radio-indicator" aria-hidden="true" />
                  <span className="class-nav-info">
                    <strong className="class-name">
                      {classroom.className ||
                        trans(
                          "adaptiveLearning.startClass.untitledClass",
                          "未命名班级",
                        )}
                    </strong>
                    <span className="class-count">
                      {trans(
                        "adaptiveLearning.startClass.studentCount",
                        "{$count} 名学生",
                        { count: classroom.studentCount },
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="start-class-right-students">
          <div className="right-panel-header-row">
            <label className="select-all-row-label">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(element) => {
                  if (element) element.indeterminate = partiallySelected;
                }}
                onChange={onToggleAllStudents}
              />
              <span className="custom-checkbox" />
              <span className="select-all-info">
                <Users size={16} className="text-primary" />
                <strong>
                  {trans(
                    "adaptiveLearning.startClass.selectAllClass",
                    "全选本班",
                  )}
                </strong>
              </span>
            </label>
            <div className="right-header-counter">
              <span>
                {trans("adaptiveLearning.startClass.selected", "已选")} {" "}
              </span>
              <strong>{selectedCount}</strong>
              <span className="total-denom"> / {students.length}</span>
            </div>
          </div>

          <div className="students-scroll-area">
            {visibleStudents.length === 0 ? (
              <div className="no-students-found">
                {trans(
                  "adaptiveLearning.startClass.noStudentsFound",
                  "未找到学生",
                )}
              </div>
            ) : (
              <div className="students-grid-list">
                {visibleStudents.map((student) => {
                  const selected = selectedStudentIds.has(student.studentId);
                  return (
                    <label
                      key={student.studentId}
                      className={`student-item-card${selected ? " selected" : ""}`}
                    >
                      <span className="student-checkbox-wrap">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => onToggleStudent(student.studentId)}
                        />
                        <span className="custom-checkbox" />
                      </span>
                      <span className="student-avatar-circle">
                        {student.avatarUrl ? (
                          <img src={student.avatarUrl} alt="" />
                        ) : (
                          (student.studentName ||
                            trans(
                              "adaptiveLearning.startClass.untitledStudent",
                              "未命名学生",
                            )).slice(0, 1)
                        )}
                      </span>
                      <span className="student-card-details">
                        <span className="student-name-text">
                          {student.studentName ||
                            trans(
                              "adaptiveLearning.startClass.untitledStudent",
                              "未命名学生",
                            )}
                        </span>
                        <span className="student-code-text">
                          {student.studentCode}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

StartClassRosterStep.propTypes = {
  activeClassId: PropTypes.string.isRequired,
  classes: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  classDate: PropTypes.string.isRequired,
  classTime: PropTypes.string.isRequired,
  onClassChange: PropTypes.func.isRequired,
  onDateChange: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onTimeChange: PropTypes.func.isRequired,
  onToggleAllStudents: PropTypes.func.isRequired,
  onToggleStudent: PropTypes.func.isRequired,
  searchQuery: PropTypes.string.isRequired,
  selectedStudentIds: PropTypes.instanceOf(Set).isRequired,
};
