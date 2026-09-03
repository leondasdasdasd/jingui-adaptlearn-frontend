import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Compass,
  Filter,
  Grid3X3,
  History,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";

import { trans } from "../../utils/i18n";
import AppShell from "../components/AppShell";
import StudentAssessmentMatrixModal from "../components/StudentAssessmentMatrixModal";
import StudentAttemptHistory from "../components/StudentAttemptHistory";
import { routes } from "../routes/routePaths";
import { useNavigate } from "../routing";
import { useLearningSession } from "../session/LearningSessionContext";
import { getCourseById } from "../shared/domain/courseCatalog";
import { isMasteredValue } from "../shared/domain/masteryPolicy.js";
import { getStudentLearningProfile } from "../shared/infrastructure/classroomApi";
import { readClassStudentIdentity } from "../student/data/classStudentIdentityRepository";
import { buildKnowledgeMapProfile } from "../student/data/knowledgeProfileRepository";
import { readLocalStudentIdentity } from "../student/data/learningHistoryRepository";
import { readSelectedCoursePreference } from "../student/data/studentPreferencesRepository";
import {
  attemptsFromAuthority,
  knowledgeProfileFromAuthority,
  mergeKnowledgeProfiles,
} from "../student/domain/authoritativeLearningProfile";
import {
  knowledgeMapSourceLabel,
  knowledgeMapStatusCopy,
  knowledgeMapText,
} from "../student/presentation/knowledgeMapPresentation";
import { getKnowledgePointMatrixStats } from "../student/presentation/studentAssessmentMatrix";

import "../student-progress.css";
import "../styles/student-assessment-matrix-modal.css";

const statusMeta = {
  mastered: {
    tone: "mastered",
    icon: CheckCircle2,
  },
  studying: {
    tone: "studying",
    icon: Compass,
  },
  needs_review: {
    tone: "needs_review",
    icon: AlertCircle,
  },
  not_started: {
    tone: "not_started",
    icon: Circle,
  },
};

/**
 *
 * @param status
 */
function statusPresentation(status) {
  const meta = statusMeta[status] || statusMeta.not_started;
  return {
    ...meta,
    ...knowledgeMapStatusCopy(status),
  };
}

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
  return item?.status === "needs_review"
    ? "needs_review"
    : item?.status || "not_started";
}

/**
 *
 * @param source
 */
/**
 *
 */
export default function KnowledgeMapRoute() {
  const navigate = useNavigate();
  const { session } = useLearningSession();
  const activeCourse = useMemo(
    () => getCourseById(readSelectedCoursePreference()),
    [],
  );
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

  // 搜索、筛选与章节折叠状态
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [collapsedChapters, setCollapsedChapters] = useState({});

  // 评估矩阵弹窗状态（课时矩阵 / 知识点认知矩阵）
  const [matrixModalState, setMatrixModalState] = useState({
    isOpen: false,
    mode: "lesson", // "lesson" | "knowledgePoint"
    lesson: null,
    knowledgePoint: null,
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
    () => knowledgeProfileFromAuthority(authorityState.profile, activeCourse),
    [activeCourse, authorityState.profile],
  );
  const profile = useMemo(
    () => mergeKnowledgeProfiles(localProfile, authoritativeProfile),
    [authoritativeProfile, localProfile],
  );
  const authoritativeAttempts = useMemo(
    () => attemptsFromAuthority(authorityState.profile, activeCourse),
    [activeCourse, authorityState.profile],
  );

  const allKnowledgePoints = useMemo(
    () =>
      activeCourse.chapters.flatMap((chapter) =>
        chapter.sections.flatMap((section) => section.knowledgePoints),
      ),
    [activeCourse],
  );

  // 统计数据
  const totalCount = allKnowledgePoints.length;
  const studyingCount = useMemo(
    () =>
      allKnowledgePoints.filter(
        (item) => displayStatus(profile[item.id]) === "studying",
      ).length,
    [allKnowledgePoints, profile],
  );
  const masteredCount = useMemo(
    () =>
      allKnowledgePoints.filter(
        (item) => displayStatus(profile[item.id]) === "mastered",
      ).length,
    [allKnowledgePoints, profile],
  );
  const needsReviewCount = useMemo(
    () =>
      allKnowledgePoints.filter(
        (item) => displayStatus(profile[item.id]) === "needs_review",
      ).length,
    [allKnowledgePoints, profile],
  );
  const notStartedCount = useMemo(
    () =>
      allKnowledgePoints.filter(
        (item) => displayStatus(profile[item.id]) === "not_started",
      ).length,
    [allKnowledgePoints, profile],
  );

  const overallMasteryRate =
    totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  // 过滤后的章节与知识点列表
  const filteredChapters = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return activeCourse.chapters
      .map((chapter) => {
        const filteredSections = chapter.sections
          .map((section) => {
            const filteredPoints = section.knowledgePoints.filter((kp) => {
              const item = profile[kp.id] || {
                status: "not_started",
                mastery: null,
              };
              const status = displayStatus(item);

              // 状态筛选
              if (statusFilter !== "all" && status !== statusFilter) {
                return false;
              }

              // 关键词搜索
              if (query) {
                const matchName = kp.name.toLowerCase().includes(query);
                const matchSection = section.title
                  .toLowerCase()
                  .includes(query);
                const matchChapter = chapter.title
                  .toLowerCase()
                  .includes(query);
                if (!matchName && !matchSection && !matchChapter) {
                  return false;
                }
              }

              return true;
            });

            return {
              ...section,
              filteredKnowledgePoints: filteredPoints,
            };
          })
          .filter((section) => section.filteredKnowledgePoints.length > 0);

        // 计算该章节的统计
        const chapterAllKp = chapter.sections.flatMap((s) => s.knowledgePoints);
        const chapterMasteredKp = chapterAllKp.filter(
          (kp) => displayStatus(profile[kp.id]) === "mastered",
        );

        return {
          ...chapter,
          filteredSections,
          totalPointsInChapter: chapterAllKp.length,
          masteredInChapter: chapterMasteredKp.length,
          matchedPointsCount: filteredSections.reduce(
            (sum, s) => sum + s.filteredKnowledgePoints.length,
            0,
          ),
        };
      })
      .filter((chapter) => chapter.filteredSections.length > 0);
  }, [activeCourse, profile, searchQuery, statusFilter]);

  const totalMatchedPoints = useMemo(
    () => filteredChapters.reduce((sum, ch) => sum + ch.matchedPointsCount, 0),
    [filteredChapters],
  );

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all";

  const toggleChapterCollapse = (chapterId) => {
    setCollapsedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  const isAllCollapsed = useMemo(() => {
    if (filteredChapters.length === 0) return false;
    return filteredChapters.every((ch) => collapsedChapters[ch.id]);
  }, [collapsedChapters, filteredChapters]);

  const toggleAllChapters = () => {
    const nextState = !isAllCollapsed;
    const update = {};
    for (const ch of filteredChapters) {
      update[ch.id] = nextState;
    }
    setCollapsedChapters((prev) => ({ ...prev, ...update }));
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const studentId =
    fixedIdentity?.studentId ||
    session.selection?.studentId ||
    readLocalStudentIdentity()?.id;

  return (
    <AppShell
      title={knowledgeMapText("title", "学习进度")}
      onBack={() => navigate(routes.directory)}
      showUserMenu={false}
      actions={
        <div className="km-header-actions">
          <div
            className="km-header-tab-strip"
            role="tablist"
            aria-label={knowledgeMapText("viewAria", "学习进度视图")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "mastery"}
              className={`km-header-tab-btn ${activeTab === "mastery" ? "active" : ""}`}
              onClick={() => setActiveTab("mastery")}
            >
              <Sparkles size={14} />
              <span>{knowledgeMapText("masteryTab", "知识点掌握")}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "history"}
              className={`km-header-tab-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <History size={14} />
              <span>{knowledgeMapText("historyTab", "学习记录")}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="km-page-wrapper">
        {activeTab === "mastery" ? (
          <div className="knowledge-map-container" role="tabpanel">
            {/* 同步状态提醒 */}
            {authorityState.loading && (
              <div className="student-progress-sync" role="status">
                {knowledgeMapText("syncing", "正在同步云端认知档案与学习记录…")}
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
                  {trans("adaptiveLearning.knowledgeMap.retrySync", "重新同步")}
                </button>
              </div>
            )}

            {/* 紧凑一体化控制台：高度精简，统计与筛选合一 */}
            <div className="km-compact-console">
              {/* 上排：精炼掌握度 + 状态统计/筛选交互胶囊 */}
              <div className="km-console-top">
                {/* 左侧掌握度精炼指标 */}
                <div className="km-mastery-summary-pill">
                  <div className="km-mastery-icon-badge">
                    <TrendingUp size={15} />
                  </div>
                  <div className="km-mastery-info-group">
                    <span className="km-mastery-title-label">
                      {knowledgeMapText("masteryRate", "掌握率")}
                    </span>
                    <span className="km-mastery-percent-number">
                      {overallMasteryRate}%
                    </span>
                    <span className="km-mastery-count-label">
                      ({masteredCount}/{totalCount})
                    </span>
                  </div>
                  <div
                    className="km-mastery-micro-bar"
                    title={knowledgeMapText(
                      "progressBreakdown",
                      "已掌握 {$mastered}，学习中 {$studying}，需巩固 {$review}，未开始 {$notStarted}",
                      {
                        mastered: masteredCount,
                        studying: studyingCount,
                        review: needsReviewCount,
                        notStarted: notStartedCount,
                      },
                    )}
                  >
                    <div
                      className="km-micro-bar-seg mastered"
                      style={{
                        width: `${totalCount ? (masteredCount / totalCount) * 100 : 0}%`,
                      }}
                    />
                    <div
                      className="km-micro-bar-seg studying"
                      style={{
                        width: `${totalCount ? (studyingCount / totalCount) * 100 : 0}%`,
                      }}
                    />
                    <div
                      className="km-micro-bar-seg needs_review"
                      style={{
                        width: `${totalCount ? (needsReviewCount / totalCount) * 100 : 0}%`,
                      }}
                    />
                    <div
                      className="km-micro-bar-seg not_started"
                      style={{
                        width: `${totalCount ? (notStartedCount / totalCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 右侧状态筛选胶囊群（直接显示数量与比例，支持点击筛选） */}
                <div
                  className="km-filter-strip"
                  role="radiogroup"
                  aria-label={knowledgeMapText("statusFilterAria", "状态筛选")}
                >
                  <button
                    type="button"
                    className={`km-filter-btn ${statusFilter === "all" ? "active" : ""}`}
                    onClick={() => setStatusFilter("all")}
                  >
                    <span>{knowledgeMapText("status.all", "全部")}</span>
                    <span className="km-filter-num">{totalCount}</span>
                  </button>
                  <button
                    type="button"
                    className={`km-filter-btn mastered ${statusFilter === "mastered" ? "active" : ""}`}
                    onClick={() =>
                      setStatusFilter((prev) =>
                        prev === "mastered" ? "all" : "mastered",
                      )
                    }
                  >
                    <span className="km-filter-dot" />
                    <span>{knowledgeMapText("status.mastered", "已掌握")}</span>
                    <span className="km-filter-num">{masteredCount}</span>
                    <span className="km-filter-pct">
                      (
                      {totalCount
                        ? Math.round((masteredCount / totalCount) * 100)
                        : 0}
                      %)
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`km-filter-btn studying ${statusFilter === "studying" ? "active" : ""}`}
                    onClick={() =>
                      setStatusFilter((prev) =>
                        prev === "studying" ? "all" : "studying",
                      )
                    }
                  >
                    <span className="km-filter-dot" />
                    <span>{knowledgeMapText("status.studying", "学习中")}</span>
                    <span className="km-filter-num">{studyingCount}</span>
                    <span className="km-filter-pct">
                      (
                      {totalCount
                        ? Math.round((studyingCount / totalCount) * 100)
                        : 0}
                      %)
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`km-filter-btn needs_review ${statusFilter === "needs_review" ? "active" : ""}`}
                    onClick={() =>
                      setStatusFilter((prev) =>
                        prev === "needs_review" ? "all" : "needs_review",
                      )
                    }
                  >
                    <span className="km-filter-dot" />
                    <span>
                      {knowledgeMapText("status.reviewShort", "需巩固")}
                    </span>
                    <span className="km-filter-num">{needsReviewCount}</span>
                    <span className="km-filter-pct">
                      (
                      {totalCount
                        ? Math.round((needsReviewCount / totalCount) * 100)
                        : 0}
                      %)
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`km-filter-btn not_started ${statusFilter === "not_started" ? "active" : ""}`}
                    onClick={() =>
                      setStatusFilter((prev) =>
                        prev === "not_started" ? "all" : "not_started",
                      )
                    }
                  >
                    <span className="km-filter-dot" />
                    <span>
                      {knowledgeMapText("status.notStarted", "未开始")}
                    </span>
                    <span className="km-filter-num">{notStartedCount}</span>
                    <span className="km-filter-pct">
                      (
                      {totalCount
                        ? Math.round((notStartedCount / totalCount) * 100)
                        : 0}
                      %)
                    </span>
                  </button>
                </div>
              </div>

              {/* 下排：搜索框与折叠控制 */}
              <div className="km-console-bottom">
                <div className="km-controls-left">
                  <div className="km-search-wrap">
                    <Search className="km-search-wrap-icon" size={14} />
                    <input
                      type="text"
                      className="km-search-field"
                      placeholder={knowledgeMapText(
                        "searchPlaceholder",
                        "搜索知识点、课时或关键词...",
                      )}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="km-search-btn-clear"
                        onClick={() => setSearchQuery("")}
                        aria-label={knowledgeMapText("clearSearch", "清空搜索")}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="km-controls-right">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="km-btn-compact reset"
                      onClick={resetFilters}
                    >
                      <RotateCcw size={12} />
                      <span>
                        {knowledgeMapText("reset", "重置")} (
                        {totalMatchedPoints})
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="km-btn-compact"
                    onClick={toggleAllChapters}
                  >
                    <span>
                      {isAllCollapsed
                        ? knowledgeMapText("expandAll", "展开全部")
                        : knowledgeMapText("collapseAll", "折叠全部")}
                    </span>
                    <ChevronDown
                      size={13}
                      style={{
                        transform: isAllCollapsed
                          ? "rotate(0deg)"
                          : "rotate(180deg)",
                        transition: "transform 0.2s ease",
                      }}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* 3. 知识图谱章节与课时卡片架构 */}
            {filteredChapters.length > 0 ? (
              <div className="km-board">
                {filteredChapters.map((chapter) => {
                  const isCollapsed = Boolean(collapsedChapters[chapter.id]);
                  const chapterMasteryPct = chapter.totalPointsInChapter
                    ? Math.round(
                        (chapter.masteredInChapter /
                          chapter.totalPointsInChapter) *
                          100,
                      )
                    : 0;

                  return (
                    <section
                      className={`km-chapter-card ${isCollapsed ? "" : "expanded"}`}
                      key={chapter.id}
                    >
                      {/* 章节头部 */}
                      <header
                        className="km-chapter-header"
                        onClick={() => toggleChapterCollapse(chapter.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleChapterCollapse(chapter.id);
                          }
                        }}
                        aria-expanded={!isCollapsed}
                      >
                        <div className="km-chapter-header-left">
                          <span className="km-chapter-badge">
                            {chapter.index}
                          </span>
                          <h2 className="km-chapter-title">{chapter.title}</h2>
                        </div>
                        <div className="km-chapter-header-right">
                          <div className="km-chapter-stats">
                            <span className="km-chapter-stat-text">
                              {knowledgeMapText("masteryRate", "掌握率")}{" "}
                              <strong>{chapterMasteryPct}%</strong> (
                              {chapter.masteredInChapter}/
                              {chapter.totalPointsInChapter})
                            </span>
                            <div className="km-chapter-mini-progress">
                              <div
                                className="km-chapter-mini-progress-fill"
                                style={{ width: `${chapterMasteryPct}%` }}
                              />
                            </div>
                          </div>
                          <div
                            className="km-chapter-chevron"
                            aria-hidden="true"
                          >
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </header>

                      {/* 章节展开内容 */}
                      {!isCollapsed && (
                        <div className="km-chapter-body">
                          {chapter.filteredSections.map((lesson) => (
                            <article
                              className="km-lesson-group"
                              key={lesson.id}
                            >
                              <div className="km-lesson-header">
                                <div className="km-lesson-header-left">
                                  <span className="km-lesson-index-tag">
                                    {lesson.index}
                                  </span>
                                  <h3 className="km-lesson-title">
                                    {lesson.title}
                                  </h3>
                                </div>
                                <button
                                  type="button"
                                  className="km-lesson-matrix-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMatrixModalState({
                                      isOpen: true,
                                      mode: "lesson",
                                      lesson,
                                      knowledgePoint: null,
                                    });
                                  }}
                                  title={knowledgeMapText(
                                    "lessonMatrixTitle",
                                    "查看《{$lesson}》全课时考核矩阵与点亮状态",
                                    { lesson: lesson.title },
                                  )}
                                >
                                  <Grid3X3 size={13} />
                                  <span>
                                    {knowledgeMapText(
                                      "lessonMatrix",
                                      "课时矩阵",
                                    )}
                                  </span>
                                </button>
                              </div>

                              {/* 知识点卡片网格 */}
                              <div className="km-points-grid">
                                {lesson.filteredKnowledgePoints.map(
                                  (knowledgePoint) => {
                                    const item = profile[knowledgePoint.id] || {
                                      status: "not_started",
                                      mastery: null,
                                    };
                                    const statusKey = displayStatus(item);
                                    const meta = statusPresentation(statusKey);
                                    const IconComponent = meta.icon;
                                    const masteryValue = item.mastery;
                                    const masterySourceLabel =
                                      knowledgeMapSourceLabel(
                                        item.masterySource,
                                      );
                                    const matrixStats =
                                      getKnowledgePointMatrixStats({
                                        lesson,
                                        knowledgePoint,
                                        profile,
                                        attempts: authoritativeAttempts,
                                        assessmentMatrices:
                                          lesson.id ===
                                          session.selection?.section?.id
                                            ? session.publishedContent
                                                ?.assessmentMatrices
                                            : {},
                                      });

                                    return (
                                      <div
                                        key={knowledgePoint.id}
                                        className={`km-point-card ${meta.tone}`}
                                      >
                                        {/* 卡片顶部：先展示知识点名称，再展示状态指标 */}
                                        <div className="km-point-card-top-v2">
                                          <h4
                                            className="km-point-name"
                                            title={knowledgePoint.name}
                                          >
                                            {knowledgePoint.name}
                                          </h4>
                                          <span
                                            className={`km-point-status-indicator ${meta.tone}`}
                                            title={meta.label}
                                          >
                                            <IconComponent size={12} />
                                            <span>{meta.label}</span>
                                          </span>
                                        </div>

                                        {/* 卡片中部：掌握度来源标签（若存在） */}
                                        {masterySourceLabel ? (
                                          <div className="km-point-card-middle">
                                            <span className="km-point-source-tag">
                                              {masterySourceLabel}
                                            </span>
                                          </div>
                                        ) : null}

                                        {/* 卡片底部：双指标（掌握率 + 矩阵点亮数/总量）与行动入口 */}
                                        <div className="km-point-card-bottom-dual">
                                          <div className="km-point-dual-metrics">
                                            {/* 指标1：掌握率 */}
                                            <div
                                              className="km-metric-item"
                                              title={knowledgeMapText(
                                                "masteryMetricTitle",
                                                "掌握度：{$value}",
                                                {
                                                  value:
                                                    masteryValue == null
                                                      ? knowledgeMapText(
                                                          "status.notStarted",
                                                          "未开始",
                                                        )
                                                      : `${masteryValue}%`,
                                                },
                                              )}
                                            >
                                              <span className="km-metric-lbl">
                                                {knowledgeMapText(
                                                  "masteryRate",
                                                  "掌握率",
                                                )}
                                              </span>
                                              <div className="km-metric-track">
                                                <div
                                                  className="km-metric-fill mastery"
                                                  style={{
                                                    width:
                                                      masteryValue == null
                                                        ? "0%"
                                                        : `${Math.min(
                                                            100,
                                                            Math.max(
                                                              0,
                                                              masteryValue,
                                                            ),
                                                          )}%`,
                                                  }}
                                                />
                                              </div>
                                              <span className="km-metric-val">
                                                {masteryValue == null
                                                  ? "—"
                                                  : `${masteryValue}%`}
                                              </span>
                                            </div>

                                            {/* 指标2：矩阵点亮数量与总量 */}
                                            <div
                                              className="km-metric-item"
                                              title={knowledgeMapText(
                                                "matrixLightingTitle",
                                                "认知矩阵点亮：{$lighted}/{$total} 格 ({$rate}%)",
                                                {
                                                  lighted: matrixStats.lighted,
                                                  total: matrixStats.total,
                                                  rate: matrixStats.rate,
                                                },
                                              )}
                                            >
                                              <span className="km-metric-lbl">
                                                {knowledgeMapText(
                                                  "matrixLighting",
                                                  "矩阵点亮",
                                                )}
                                              </span>
                                              <div className="km-metric-track">
                                                <div
                                                  className="km-metric-fill matrix"
                                                  style={{
                                                    width: `${matrixStats.rate}%`,
                                                  }}
                                                />
                                              </div>
                                              <span className="km-metric-val matrix-highlight">
                                                <strong>
                                                  {matrixStats.lighted}
                                                </strong>
                                                /{matrixStats.total}
                                                {knowledgeMapText(
                                                  "cells",
                                                  "格",
                                                )}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : (
              /* 4. 空搜索结果状态 */
              <div className="km-empty-state">
                <div className="km-empty-icon">
                  <Search size={26} />
                </div>
                <h3 className="km-empty-title">
                  {knowledgeMapText("emptyTitle", "未找到匹配的知识点")}
                </h3>
                <p className="km-empty-desc">
                  {knowledgeMapText(
                    "emptyDescription",
                    "当前筛选或搜索条件下没有找到知识点，请尝试更换关键词或清除筛选条件。",
                  )}
                </p>
                <button
                  type="button"
                  className="km-empty-btn"
                  onClick={resetFilters}
                >
                  {knowledgeMapText("clearFilters", "清除所有筛选条件")}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="km-history-container" role="tabpanel">
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
          </div>
        )}

        {/* 课时评估矩阵与知识点认知矩阵弹窗 */}
        <StudentAssessmentMatrixModal
          isOpen={matrixModalState.isOpen}
          onClose={() =>
            setMatrixModalState((prev) => ({ ...prev, isOpen: false }))
          }
          mode={matrixModalState.mode}
          lesson={matrixModalState.lesson}
          knowledgePoint={matrixModalState.knowledgePoint}
          profile={profile}
          attempts={authoritativeAttempts}
          assessmentMatrices={
            matrixModalState.lesson?.id === session.selection?.section?.id
              ? session.publishedContent?.assessmentMatrices
              : {}
          }
        />
      </div>
    </AppShell>
  );
}
