import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronRight, LoaderCircle, Play, X } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../utils/i18n";
import { useNavigate } from "../routing";
import { course } from "../shared/domain/courseCatalog";
import {
  getLatestLessonVersion,
  getPublishedLessonVersions,
} from "../shared/infrastructure/classroomApi";
import {
  ensureStartClassContent,
  MAX_LINKED_LESSON_COUNT,
} from "../teacher/data/startClassContentRepository";
import { launchLearningPeriod } from "../teacher/data/startClassRepository";
import { buildStartClassLaunch } from "../teacher/domain/startClassLaunch";
import { usePlatformTeachingDirectory } from "../teacher/hooks/usePlatformTeachingDirectory";
import { startClassIssueText } from "../teacher/presentation/startClassPresentation";
import StartClassCourseStep from "./StartClassCourseStep";
import StartClassRosterStep from "./StartClassRosterStep";

const today = () => new Date().toISOString().split("T")[0];

/**
 * 真实开课向导控制器：测验平台提供课程花名册，课堂服务提供内容与课堂会话。
 * @param {object} props 弹窗可见性、关闭动作和入口课时。
 * @param props.open
 * @param props.onClose
 * @param props.initialLessonId
 * @returns {React.ReactElement|null} 开课弹窗。
 */
// 两步向导在一个控制器内统一持有跨步骤状态，分支只负责表单校验和视图切换。
// eslint-disable-next-line complexity
export default function StartClassDialog({
  open,
  onClose,
  initialLessonId = "",
}) {
  const navigate = useNavigate();
  const directory = usePlatformTeachingDirectory(open);
  const [step, setStep] = useState(1);
  const [starting, setStarting] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [versionsByLessonId, setVersionsByLessonId] = useState({});
  const [selectedLessonIds, setSelectedLessonIds] = useState(() =>
    initialLessonId ? [initialLessonId] : [],
  );
  const [activeClassId, setActiveClassId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [classDate, setClassDate] = useState(today);
  const [classTime, setClassTime] = useState("08:30");

  const allLessons = useMemo(
    () =>
      course.chapters.flatMap((chapter) =>
        chapter.sections.map((lesson) => ({
          ...lesson,
          chapterTitle: chapter.title,
        })),
      ),
    [],
  );
  const lessonsById = useMemo(
    () => Object.fromEntries(allLessons.map((lesson) => [lesson.id, lesson])),
    [allLessons],
  );
  const activeClass = useMemo(
    () =>
      directory.classes.find(
        (classroom) => classroom.classId === activeClassId,
      ) || null,
    [activeClassId, directory.classes],
  );
  const selectedCourse = directory.courses.find(
    (item) => item.courseId === directory.selectedCourseId,
  );
  const selectedStudentCount = (activeClass?.students || []).filter((student) =>
    selectedStudentIds.has(student.studentId),
  ).length;
  const displayedError = localError || directory.error;

  useEffect(() => {
    if (!open) return;
    let active = true;
    setStep(1);
    setLocalError("");
    setSearchQuery("");
    setSelectedLessonIds(initialLessonId ? [initialLessonId] : []);
    setContentLoading(true);
    void getPublishedLessonVersions(allLessons.map((lesson) => lesson.id))
      .then(async (summaries) => {
        const entries = await Promise.all(
          (Array.isArray(summaries) ? summaries : []).map(async (summary) => [
            summary.textbookLessonId,
            await getLatestLessonVersion(summary.textbookLessonId),
          ]),
        );
        if (!active) return null;
        const versionMap = Object.fromEntries(
          entries.filter(([, version]) => version?.id),
        );
        setVersionsByLessonId(versionMap);
        setSelectedLessonIds((current) =>
          current.length > 0 ? current : Object.keys(versionMap).slice(0, 1),
        );
        return versionMap;
      })
      .catch(() => {
        if (active) {
          setVersionsByLessonId({});
          setLocalError(
            trans(
              "adaptiveLearning.startClass.publishedLessonsLoadFailed",
              "已发布课时加载失败",
            ),
          );
        }
      })
      .finally(() => {
        if (active) setContentLoading(false);
      });
    return () => {
      active = false;
    };
  }, [allLessons, initialLessonId, open]);

  useEffect(() => {
    const firstClass = directory.classes[0] || null;
    setActiveClassId(firstClass?.classId || "");
    setSelectedStudentIds(
      new Set((firstClass?.students || []).map((student) => student.studentId)),
    );
    setSearchQuery("");
  }, [directory.classes]);

  if (!open) return null;

  const handleToggleLesson = (lessonId) => {
    setLocalError("");
    setSelectedLessonIds((current) => {
      if (current.includes(lessonId)) {
        return current.filter((value) => value !== lessonId);
      }
      if (current.length >= MAX_LINKED_LESSON_COUNT) {
        setLocalError(
          trans(
            "adaptiveLearning.startClass.lessonLimit",
            "最多关联 3 个课时",
          ),
        );
        return current;
      }
      return [...current, lessonId];
    });
  };

  const handleClassChange = (classId) => {
    const classroom = directory.classes.find(
      (item) => item.classId === classId,
    );
    setActiveClassId(classId);
    setSelectedStudentIds(
      new Set((classroom?.students || []).map((student) => student.studentId)),
    );
    setSearchQuery("");
    setLocalError("");
  };

  const handleToggleStudent = (studentId) => {
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleToggleAllStudents = () => {
    const students = activeClass?.students || [];
    const allSelected =
      students.length > 0 &&
      students.every((student) => selectedStudentIds.has(student.studentId));
    setSelectedStudentIds(
      new Set(allSelected ? [] : students.map((student) => student.studentId)),
    );
  };

  const continueToRoster = () => {
    setLocalError("");
    if (!directory.selectedSubjectId || !directory.selectedCourseId) {
      setLocalError(
        trans(
          "adaptiveLearning.startClass.selectCourse",
          "请选择系统课程",
        ),
      );
      return;
    }
    if (selectedLessonIds.length === 0) {
      setLocalError(
        trans(
          "adaptiveLearning.startClass.selectLesson",
          "请至少关联 1 个已发布课时",
        ),
      );
      return;
    }
    if (
      selectedLessonIds.some((lessonId) => !versionsByLessonId[lessonId]?.id)
    ) {
      setLocalError(
        trans(
          "adaptiveLearning.startClass.publishLessons",
          "所选课时需要先发布",
        ),
      );
      return;
    }
    setStep(2);
  };

  const handleStartClass = async () => {
    setStarting(true);
    setLocalError("");
    try {
      const content = await ensureStartClassContent({
        lessonIds: selectedLessonIds,
        lessonsById,
        versionsByLessonId,
      });
      const launch = buildStartClassLaunch({
        teachingCourse: {
          ...selectedCourse,
          subjectId: directory.selectedSubjectId,
          semesterId: directory.semester?.semesterId || "",
          semesterName: directory.semester?.semesterName || "",
        },
        activeClass,
        selectedStudentIds,
        content,
        classDate,
        classTime,
      });
      const { periodId } = await launchLearningPeriod(launch);
      onClose();
      navigate(`/adaptive-learning/teacher/periods/${periodId}/live`);
    } catch (error) {
      setLocalError(startClassIssueText(error));
    } finally {
      setStarting(false);
    }
  };

  const busy = directory.loading || contentLoading;

  return (
    <div className="start-class-dialog-mask" role="presentation">
      <div
        className="start-class-dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-class-title"
      >
        <header className="start-class-dialog-header">
          <div className="start-class-header-title-area">
            <div className="start-class-header-badge">
              <Play size={18} fill="currentColor" />
            </div>
            <div>
              <h2 id="start-class-title">
                {step === 1
                  ? trans(
                      "adaptiveLearning.startClass.courseAndLessons",
                      "课程与课时",
                    )
                  : trans(
                      "adaptiveLearning.startClass.classAndStudents",
                      "班级与学生",
                    )}
              </h2>
              <p>
                {trans(
                  "adaptiveLearning.startClass.liveDataDescription",
                  "使用测验系统真实课程、班级与学生",
                )}
              </p>
            </div>
          </div>
          <div
            className="start-class-step-pills"
            aria-label={trans(
              "adaptiveLearning.startClass.steps",
              "开课步骤",
            )}
          >
            <button
              type="button"
              className={`start-class-step-pill ${step === 1 ? "active" : "completed"}`}
              onClick={() => setStep(1)}
            >
              <span className="step-number">1</span>
              <span>
                {trans(
                  "adaptiveLearning.startClass.contentStep",
                  "课程课时",
                )}
              </span>
            </button>
            <ChevronRight size={14} className="step-arrow" />
            <button
              type="button"
              className={`start-class-step-pill ${step === 2 ? "active" : ""}`}
              onClick={continueToRoster}
            >
              <span className="step-number">2</span>
              <span>
                {trans(
                  "adaptiveLearning.startClass.rosterStep",
                  "班级学生",
                )}
              </span>
            </button>
          </div>
          <button
            type="button"
            className="start-class-close-btn"
            onClick={onClose}
            aria-label={trans("global.close", "关闭")}
          >
            <X size={18} />
          </button>
        </header>

        {displayedError && (
          <div className="start-class-alert-bar" role="alert">
            <AlertCircle size={16} />
            <span>{displayedError}</span>
            {directory.error && (
              <button type="button" onClick={directory.retry}>
                {trans("adaptiveLearning.retry", "重试")}
              </button>
            )}
          </div>
        )}

        <div className="start-class-dialog-body" aria-busy={busy}>
          {step === 1 ? (
            <StartClassCourseStep
              subjects={directory.subjects}
              courses={directory.courses}
              semesterName={directory.semester?.semesterName || ""}
              selectedSubjectId={directory.selectedSubjectId}
              selectedCourseId={directory.selectedCourseId}
              onSubjectChange={directory.setSelectedSubjectId}
              onCourseChange={directory.setSelectedCourseId}
              chapters={course.chapters}
              availableLessonIds={Object.keys(versionsByLessonId)}
              selectedLessonIds={selectedLessonIds}
              onToggleLesson={handleToggleLesson}
              loading={busy}
            />
          ) : (
            <StartClassRosterStep
              classes={directory.classes}
              activeClassId={activeClassId}
              onClassChange={handleClassChange}
              selectedStudentIds={selectedStudentIds}
              onToggleStudent={handleToggleStudent}
              onToggleAllStudents={handleToggleAllStudents}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              classDate={classDate}
              onDateChange={setClassDate}
              classTime={classTime}
              onTimeChange={setClassTime}
            />
          )}
          {busy && (
            <div className="start-class-loading-overlay" role="status">
              <LoaderCircle size={22} className="spin-icon" />
              <span>
                {trans(
                  "adaptiveLearning.startClass.loadingLiveData",
                  "正在读取真实数据",
                )}
              </span>
            </div>
          )}
        </div>

        <footer className="start-class-dialog-footer">
          <div className="footer-summary-left">
            {step === 2 && (
              <button
                type="button"
                className="btn-back-step"
                onClick={() => setStep(1)}
              >
                {trans("global.back", "返回")}
              </button>
            )}
            <span className="footer-stats-text">
              {trans(
                "adaptiveLearning.startClass.lessonCount",
                "{$count} 个课时",
                { count: selectedLessonIds.length },
              )}
              {step === 2 && (
                <>
                  <span className="stat-separator">·</span>
                  {trans(
                    "adaptiveLearning.startClass.classCount",
                    "{$count} 个班级",
                    { count: activeClass ? 1 : 0 },
                  )}
                  <span className="stat-separator">·</span>
                  {trans(
                    "adaptiveLearning.startClass.studentCount",
                    "{$count} 名学生",
                    { count: selectedStudentCount },
                  )}
                </>
              )}
            </span>
          </div>
          <div className="footer-actions-right">
            <button
              type="button"
              className="start-class-btn-cancel"
              onClick={onClose}
            >
              {trans("global.cancel", "取消")}
            </button>
            {step === 1 ? (
              <button
                type="button"
                className="start-class-btn-primary"
                onClick={continueToRoster}
                disabled={busy}
              >
                {trans("adaptiveLearning.startClass.next", "下一步")} {" "}
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                className="start-class-btn-primary launch-glow"
                onClick={() => void handleStartClass()}
                disabled={busy || starting || selectedStudentCount === 0}
                aria-busy={starting}
              >
                {starting ? (
                  <LoaderCircle size={14} className="spin-icon" />
                ) : (
                  <Play size={14} fill="currentColor" />
                )}
                {starting
                  ? trans(
                      "adaptiveLearning.startClass.starting",
                      "正在开课",
                    )
                  : trans(
                      "adaptiveLearning.startClass.start",
                      "开始上课",
                    )}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

StartClassDialog.propTypes = {
  initialLessonId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
};
