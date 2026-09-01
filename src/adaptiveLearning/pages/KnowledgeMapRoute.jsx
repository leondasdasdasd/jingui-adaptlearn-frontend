import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Circle, Target } from "lucide-react";

import { trans } from "../../utils/i18n";
import AppShell from "../components/AppShell";
import StudentAttemptHistory from "../components/StudentAttemptHistory";
import { routes } from "../routes/routePaths";
import { useNavigate } from "../routing";
import { useLearningSession } from "../session/LearningSessionContext";
import { course } from "../shared/domain/courseCatalog";
import { isMasteredValue } from "../shared/domain/masteryPolicy.js";
import { getStudentLearningProfile } from "../shared/infrastructure/classroomApi";
import { readClassStudentIdentity } from "../student/data/classStudentIdentityRepository";
import { buildKnowledgeMapProfile } from "../student/data/knowledgeProfileRepository";
import { readLocalStudentIdentity } from "../student/data/learningHistoryRepository";
import {
  attemptsFromAuthority,
  knowledgeProfileFromAuthority,
  mergeKnowledgeProfiles,
} from "../student/domain/authoritativeLearningProfile";

import "../student-progress.css";

const statusMeta = {
  mastered: { label: "已掌握", tone: "mastered" },
  needs_review: { label: "需要巩固", tone: "needs-review" },
  studying: { label: "学习中", tone: "studying" },
  not_started: { label: "未开始", tone: "not-started" },
};

/**
 *
 * @param item
 */
function displayStatus(item) {
  if (["learned", "preview", "studying"].includes(item?.status))
    return "studying";
  if (item?.mastery != null) {
    return isMasteredValue(item.mastery) ? "mastered" : "needs_review";
  }
  return item?.status || "not_started";
}

/**
 *
 * @param source
 */
function sourceLabel(source) {
  if (source === "preview") return "本轮学习";
  if (source === "pre_assessment_preview") return "课前诊断";
  if (source === "authoritative") return "学习记录";
  return "学习";
}

/**
 *
 */
export default function KnowledgeMapRoute() {
  const navigate = useNavigate();
  const { session } = useLearningSession();
  const [activeTab, setActiveTab] = useState("mastery");
  const fixedIdentity = readClassStudentIdentity();
  const accessToken =
    fixedIdentity?.accessToken || session.selection?.classroomAccessToken || "";
  const [reload, setReload] = useState(0);
  const [authorityState, setAuthorityState] = useState({
    loading: Boolean(accessToken),
    profile: null,
    errorKind: "",
  });
  useEffect(() => {
    if (!accessToken) {
      setAuthorityState({ loading: false, profile: null, errorKind: "" });
      return;
    }
    const controller = new AbortController();
    setAuthorityState((current) => ({
      ...current,
      loading: true,
      errorKind: "",
    }));
    getStudentLearningProfile("", accessToken, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((profile) =>
        setAuthorityState({ loading: false, profile, errorKind: "" }),
      )
      .catch((error) => {
        if (error.name !== "AbortError") {
          setAuthorityState((current) => ({
            ...current,
            loading: false,
            errorKind: "sync_failed",
          }));
        }
      });
    return () => controller.abort();
  }, [accessToken, reload]);
  const localProfile = useMemo(
    () => buildKnowledgeMapProfile(session),
    [session],
  );
  const authoritativeProfile = useMemo(
    () => knowledgeProfileFromAuthority(authorityState.profile, course),
    [authorityState.profile],
  );
  const profile = useMemo(
    () => mergeKnowledgeProfiles(localProfile, authoritativeProfile),
    [authoritativeProfile, localProfile],
  );
  const authoritativeAttempts = useMemo(
    () => attemptsFromAuthority(authorityState.profile, course),
    [authorityState.profile],
  );
  const allKnowledgePoints = course.chapters.flatMap((chapter) =>
    chapter.sections.flatMap((section) => section.knowledgePoints),
  );
  const studying = allKnowledgePoints.filter(
    (item) => displayStatus(profile[item.id]) === "studying",
  ).length;
  const mastered = allKnowledgePoints.filter(
    (item) => displayStatus(profile[item.id]) === "mastered",
  ).length;
  const reviewing = allKnowledgePoints.filter(
    (item) => displayStatus(profile[item.id]) === "needs_review",
  ).length;
  const studentId =
    fixedIdentity?.studentId ||
    session.selection?.studentId ||
    readLocalStudentIdentity()?.id;

  return (
    <AppShell
      title="学习进度"
      eyebrow={`${course.publisher} · ${course.name}`}
      onBack={() => navigate(routes.directory)}
      headerClassName="knowledge-map-header"
      actions={
        <div
          className="student-progress-tabs"
          role="tablist"
          aria-label="学习进度视图"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "mastery"}
            className={activeTab === "mastery" ? "active" : ""}
            onClick={() => setActiveTab("mastery")}
          >
            知识点掌握
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            className={activeTab === "history" ? "active" : ""}
            onClick={() => setActiveTab("history")}
          >
            做题记录
          </button>
        </div>
      }
    >
      {activeTab === "mastery" ? (
        <div role="tabpanel">
          {authorityState.loading && (
            <div className="student-progress-sync" role="status">
              正在同步服务端学习记录…
            </div>
          )}
          {authorityState.errorKind === "sync_failed" && (
            <div className="student-progress-sync error" role="alert">
              <span>
                {trans(
                  "adaptiveLearning.knowledgeMap.syncFailed",
                  "服务端学习记录同步失败，当前显示本机记录。",
                )}
              </span>
              <button
                type="button"
                onClick={() => setReload((value) => value + 1)}
              >
                {trans(
                  "adaptiveLearning.knowledgeMap.retrySync",
                  "重新同步",
                )}
              </button>
            </div>
          )}
          <section className="knowledge-map-summary">
            <div>
              <BookOpen size={18} />
              <span>全部知识点</span>
              <strong>{allKnowledgePoints.length}</strong>
            </div>
            <div>
              <Target size={18} />
              <span>学习中</span>
              <strong>{studying}</strong>
            </div>
            <div>
              <Check size={18} />
              <span>已掌握</span>
              <strong>{mastered}</strong>
            </div>
            <div>
              <Circle size={18} />
              <span>需要巩固</span>
              <strong>{reviewing}</strong>
            </div>
          </section>
          <div className="knowledge-map-legend" aria-label="图谱状态说明">
            {Object.values(statusMeta).map((item) => (
              <span className={item.tone} key={item.tone}>
                <i />
                {item.label}
              </span>
            ))}
          </div>
          <div className="knowledge-map-board">
            {course.chapters.map((chapter) => (
              <section className="knowledge-map-chapter" key={chapter.id}>
                <header>
                  <span>{chapter.index}</span>
                  <div>
                    <h2>{chapter.title}</h2>
                  </div>
                </header>
                <div className="knowledge-map-lessons">
                  {chapter.sections.map((lesson) => (
                    <article key={lesson.id}>
                      <div className="knowledge-map-lesson-title">
                        <span>{lesson.index}</span>
                        <strong>{lesson.title}</strong>
                        <small>{lesson.knowledgePoints.length} 个知识点</small>
                      </div>
                      <div className="knowledge-map-points">
                        {lesson.knowledgePoints.map((knowledgePoint) => {
                          const item = profile[knowledgePoint.id] || {
                            status: "not_started",
                            mastery: null,
                          };
                          const meta =
                            statusMeta[displayStatus(item)] ||
                            statusMeta.not_started;
                          return (
                            <button
                              type="button"
                              className={`knowledge-map-point ${meta.tone}`}
                              key={knowledgePoint.id}
                              onClick={() =>
                                navigate(
                                  `${routes.knowledgeLearning(knowledgePoint.id)}?returnTo=${encodeURIComponent(routes.knowledgeMap)}`,
                                )
                              }
                            >
                              <i />
                              <span>
                                <strong>{knowledgePoint.name}</strong>
                                <small>{meta.label}</small>
                              </span>
                              <span className="knowledge-map-point-action">
                                <b>
                                  {item.mastery == null
                                    ? "—"
                                    : `${item.mastery}%`}
                                </b>
                                <em>{sourceLabel(item.masterySource)}</em>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <StudentAttemptHistory
          studentId={studentId}
          refreshKey={`${session.selection?.studentSessionId || ""}:${authorityState.profile?.generatedAt || ""}`}
          authoritativeAttempts={authoritativeAttempts}
          loading={authorityState.loading}
          errorKind={authorityState.errorKind}
          onRetry={() => setReload((value) => value + 1)}
          reviewCredentials={
            session.selection?.studentSessionId && accessToken
              ? {
                  studentSessionId: session.selection.studentSessionId,
                  accessToken,
                }
              : null
          }
        />
      )}
    </AppShell>
  );
}
