import { useEffect, useState } from "react";

import { trans } from "../../../utils/i18n";
import {
  fetchPlatformCourseRoster,
  fetchPlatformCourses,
  fetchPlatformCurrentSemester,
  fetchPlatformSubjects,
} from "../data/platformTeachingDirectoryRepository";

const preferredSubject = (subjects) =>
  subjects.find((item) => /^(?:math|数学)$/i.test(item.subjectName)) ||
  subjects[0];

/**
 * 统一管理测验平台的学科、课程、班级和学生级联加载。
 * 关联的自适应课时不属于该级联，避免换系统课程时覆盖内容范围。
 * @param {boolean} open 开课弹窗是否打开。
 * @returns {object} 平台教学目录与选择动作。
 */
export function usePlatformTeachingDirectory(open) {
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [semester, setSemester] = useState(null);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setSubjectsLoading(true);
    setError("");
    void Promise.all([fetchPlatformSubjects(), fetchPlatformCurrentSemester()])
      .then(([items, currentSemester]) => {
        if (!active) return null;
        setSubjects(items);
        setSemester(currentSemester);
        setSelectedSubjectId(preferredSubject(items)?.subjectId || "");
        if (items.length === 0) {
          setError(
            trans(
              "adaptiveLearning.startClass.noSubjects",
              "没有可用学科",
            ),
          );
        }
        return { items, currentSemester };
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setSubjectsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, reloadVersion]);

  useEffect(() => {
    if (!open || !selectedSubjectId || !semester?.semesterId) return;
    let active = true;
    setCoursesLoading(true);
    setError("");
    setCourses([]);
    setClasses([]);
    setSelectedCourseId("");
    void fetchPlatformCourses(selectedSubjectId, semester.semesterId)
      .then((items) => {
        if (!active) return null;
        setCourses(items);
        setSelectedCourseId(items[0]?.courseId || "");
        if (items.length === 0) {
          setError(
            trans(
              "adaptiveLearning.startClass.noAssignedCourses",
              "当前学期该学科没有可授课课程",
            ),
          );
        }
        return items;
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setCoursesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, reloadVersion, selectedSubjectId, semester?.semesterId]);

  useEffect(() => {
    if (!open || !selectedCourseId || !semester?.semesterId) return;
    let active = true;
    setRosterLoading(true);
    setError("");
    setClasses([]);
    void fetchPlatformCourseRoster(selectedCourseId, semester.semesterId)
      .then((items) => {
        if (!active) return null;
        setClasses(items);
        if (items.length === 0) {
          setError(
            trans(
              "adaptiveLearning.startClass.noClasses",
              "当前课程没有可用班级",
            ),
          );
        }
        return items;
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setRosterLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, reloadVersion, selectedCourseId, semester?.semesterId]);

  return {
    classes,
    courses,
    error,
    loading: subjectsLoading || coursesLoading || rosterLoading,
    selectedCourseId,
    selectedSubjectId,
    semester,
    subjects,
    retry() {
      setError("");
      setSubjects([]);
      setCourses([]);
      setClasses([]);
      setSelectedSubjectId("");
      setSelectedCourseId("");
      setSemester(null);
      setReloadVersion((value) => value + 1);
    },
    setSelectedCourseId,
    setSelectedSubjectId,
  };
}
