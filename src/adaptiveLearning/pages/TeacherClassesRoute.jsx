import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, RefreshCw, Users } from "lucide-react";

import { locale, trans } from "../../utils/i18n";
import StatePanel from "../components/StatePanel";
import TeacherShell from "../components/TeacherShell";
import { useNavigate } from "../routing";
import {
  fetchTeacherClasses,
  rememberCurrentClass,
} from "../teacher/data/classroomApiRepository";
import directoryViewState from "../teacher/presentation/directoryViewState";
import { classStatus } from "../teacher/presentation/teacherDirectoryPresentation";

import "../class-roster.css";

/**
 *
 */
export default function TeacherClassesRoute() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, classes: [], error: "" });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      setState({
        loading: false,
        classes: await fetchTeacherClasses(),
        error: "",
      });
    } catch {
      setState((current) => ({
        ...current,
        loading: false,
        error: trans(
          "adaptiveLearning.directory.classLoadFailed",
          "班级列表加载失败",
        ),
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const classes = useMemo(
    () =>
      [...state.classes].sort((left, right) =>
        String(left.className || left.classId).localeCompare(
          String(right.className || right.classId),
          locale(),
        ),
      ),
    [state.classes],
  );

  const openClass = (classId) => {
    rememberCurrentClass(classId);
    navigate(
      `/adaptive-learning/teacher/classes/${encodeURIComponent(classId)}/students`,
    );
  };
  const viewState = directoryViewState(state, classes.length);

  return (
    <TeacherShell
      title={trans("adaptiveLearning.directory.classesTitle", "班级学生")}
    >
      {viewState === "loading" && (
        <StatePanel
          tone="loading"
          title={trans(
            "adaptiveLearning.directory.loadingClasses",
            "正在加载班级",
          )}
          description={trans(
            "adaptiveLearning.directory.loadingClassesDescription",
            "正在读取当前账号可访问的班级",
          )}
        />
      )}
      {viewState === "error" && (
        <StatePanel
          tone="error"
          title={trans(
            "adaptiveLearning.directory.classLoadFailed",
            "班级列表加载失败",
          )}
          description={state.error}
          action={
            <button className="teacher-primary" type="button" onClick={load}>
              <RefreshCw size={15} />
              <span>
                {trans("adaptiveLearning.directory.reload", "重新加载")}
              </span>
            </button>
          }
        />
      )}
      {viewState === "empty" && (
        <StatePanel
          title={trans(
            "adaptiveLearning.directory.noClasses",
            "暂无可访问的班级",
          )}
          description={trans(
            "adaptiveLearning.directory.noClassesDescription",
            "请先在测验系统中维护班级花名册和任课权限，完成后返回这里刷新。",
          )}
        />
      )}
      {viewState === "ready" && (
        <section
          className="teacher-class-directory"
          aria-label={trans(
            "adaptiveLearning.directory.accessibleClasses",
            "可访问班级",
          )}
        >
          <header>
            <h2>
              {trans(
                "adaptiveLearning.directory.accessibleClasses",
                "可访问班级",
              )}
            </h2>
            <span>
              {trans(
                "adaptiveLearning.directory.classCount",
                "共 {$count} 个",
                { count: classes.length },
              )}
            </span>
          </header>
          <div className="teacher-class-directory-scroll">
            <table>
              <thead>
                <tr>
                  <th>{trans("adaptiveLearning.directory.class", "班级")}</th>
                  <th>
                    {trans(
                      "adaptiveLearning.directory.presetStudents",
                      "预设学生",
                    )}
                  </th>
                  <th>{trans("global.status", "状态")}</th>
                  <th
                    aria-label={trans(
                      "adaptiveLearning.directory.actions",
                      "操作",
                    )}
                  />
                </tr>
              </thead>
              <tbody>
                {classes.map((classInfo) => {
                  const status = classStatus(classInfo);
                  return (
                    <tr key={classInfo.classId}>
                      <td>
                        <strong>
                          {classInfo.className ||
                            trans(
                              "adaptiveLearning.directory.untitledClass",
                              "未命名班级",
                            )}
                        </strong>
                      </td>
                      <td>
                        <span className="teacher-class-student-count">
                          <Users size={15} />
                          {trans(
                            "adaptiveLearning.directory.studentCount",
                            "{$count} 人",
                            { count: classInfo.studentCount },
                          )}
                        </span>
                      </td>
                      <td>
                        <span className={`teacher-status ${status.tone}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <button
                          className="teacher-class-open"
                          type="button"
                          disabled={!status.active}
                          onClick={() => openClass(classInfo.classId)}
                        >
                          {trans(
                            "adaptiveLearning.directory.useClass",
                            "使用班级",
                          )}
                          <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </TeacherShell>
  );
}
