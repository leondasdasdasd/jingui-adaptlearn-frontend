import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Compass,
  Filter,
  Grid3X3,
  History,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";

import { trans } from "../../utils/i18n";
import AppShell from "../components/AppShell";
import StudentAttemptHistory from "../components/StudentAttemptHistory";
import StudentAssessmentMatrixModal from "../components/StudentAssessmentMatrixModal";
import {
  createDefaultContent,
  getMockLessonContent,
} from "../shared/domain/defaultLessonContent";
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

import "../student-progress.css";
import "../styles/student-assessment-matrix-modal.css";

const statusMeta = {
  mastered: {
    label: "已掌握",
    tone: "mastered",
    icon: CheckCircle2,
    actionText: "强化提升",
  },
  studying: {
    label: "学习中",
    tone: "studying",
    icon: Compass,
    actionText: "继续学习",
  },
  needs_review: {
    label: "需要巩固",
    tone: "needs_review",
    icon: AlertCircle,
    actionText: "去巩固",
  },
  not_started: {
    label: "未开始",
    tone: "not_started",
    icon: Circle,
    actionText: "去学习",
  },
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
  return item?.status === "needs_review"
    ? "needs_review"
    : item?.status || "not_started";
}

/**
 * 计算单个知识点的矩阵点亮格数与总格数
 */
function getKnowledgePointMatrixStats(lesson, knowledgePoint, profile, attempts) {
  if (!knowledgePoint) return { lighted: 0, total: 5, rate: 0 };
  const kpId = knowledgePoint.id;
  const studentKpItem = profile[kpId] || { status: "not_started", mastery: null };
  const kpMastery = studentKpItem.mastery;

  let matrixCells = [];
  try {
    const defaultContent = createDefaultContent();
    const lessonContent = defaultContent[lesson?.id] || getMockLessonContent(lesson?.id);
    const matrices = lessonContent?.assessmentMatrices || {};
    const raw = matrices[kpId] || Object.values(matrices).find(m => m.knowledgePointId === kpId || m.knowledgePointName === knowledgePoint.name);
    if (raw && Array.isArray(raw.cells) && raw.cells.length > 0) {
      matrixCells = raw.cells.filter(c => c.role !== "NOT_APPLICABLE" && c.role !== "NA");
    }
  } catch {
    // fallback
  }

  if (matrixCells.length === 0) {
    matrixCells = [
      { domain: "CR", targetLevel: "A", role: "CORE" },
      { domain: "CR", targetLevel: "B", role: "SUPPORT" },
      { domain: "PJ", targetLevel: "C", role: "CORE" },
      { domain: "M", targetLevel: "B", role: "SUPPORT" },
      { domain: "SF", targetLevel: "D", role: "EXTENSION" },
    ];
  }

  const kpAttempts = (attempts || []).filter(a =>
    a.kpId === kpId || a.kpName === knowledgePoint.name || a.knowledgePointId === kpId
  );

  let lighted = 0;
  const total = matrixCells.length;

  for (const cell of matrixCells) {
    const dom = cell.domain || cell.domainId;
    const lvl = cell.targetLevel || cell.level;
    const cellId = cell.matrixCellId;

    const matchedAttempts = kpAttempts.filter(a => {
      const matchCellId = a.matrixCellId === cellId || a.question?.matrixCellId === cellId;
      const matchCode = a.matrixCellCode === `${dom}-${lvl}` || a.matrixCellCode === `${dom}:${lvl}`;
      const matchDomainLevel = (a.domain === dom || a.question?.domain === dom) && (a.targetLevel === lvl || a.level === lvl);
      return matchCellId || matchCode || matchDomainLevel;
    });

    const passed = matchedAttempts.some(a => a.result === "已通过" || a.score === a.maxScore || (a.score / (a.maxScore || 1) >= 0.7));

    let isLighted = false;
    if (passed) {
      isLighted = true;
    } else if (kpMastery != null) {
      if (cell.role === "CORE" && kpMastery >= 70) isLighted = true;
      else if (cell.role === "SUPPORT" && kpMastery >= 80) isLighted = true;
      else if (cell.role === "EXTENSION" && kpMastery >= 90) isLighted = true;
    }

    if (isLighted) lighted += 1;
  }

  const rate = total > 0 ? Math.round((lighted / total) * 100) : 0;
  return { lighted, total, rate };
}

/**
 *
 * @param source
 */
function sourceLabel(source) {
  if (source === "preview") return "本轮学习";
  if (source === "pre_assessment_preview") return "课前诊断";
  if (source === "authoritative") return "学习记录";
  if (source === "recommendation" || source === "recommended")
    return "系统推荐";
  return "";
}

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

  const handleContinuePractice = () => {
    // 优先寻找正在学习或需巩固的知识点，其次是未开始的知识点
    const allKps = activeCourse.chapters.flatMap((chapter) =>
      chapter.sections.flatMap((section) => section.knowledgePoints),
    );
    const targetKp =
      allKps.find((kp) => {
        const item = profile[kp.id];
        const status = displayStatus(item);
        return status === "studying" || status === "needs_review";
      }) ||
      allKps.find((kp) => {
        const item = profile[kp.id];
        const status = displayStatus(item);
        return status === "not_started";
      }) ||
      allKps[0];

    if (targetKp) {
      navigate(
        `${routes.knowledgeLearning(targetKp.id)}?returnTo=${encodeURIComponent(
          routes.knowledgeMap,
        )}`,
      );
    } else {
      navigate(routes.directory);
    }
  };

  const studentId =
    fixedIdentity?.studentId ||
    session.selection?.studentId ||
    readLocalStudentIdentity()?.id;

  return (
    <AppShell
      title="学习进度"
      onBack={() => navigate(routes.directory)}
      showUserMenu={false}
      actions={
        <div className="km-header-actions">
          <div
            className="km-header-tab-strip"
            role="tablist"
            aria-label="学习进度视图"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "mastery"}
              className={`km-header-tab-btn ${activeTab === "mastery" ? "active" : ""}`}
              onClick={() => setActiveTab("mastery")}
            >
              <Sparkles size={14} />
              <span>知识点掌握</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "history"}
              className={`km-header-tab-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <History size={14} />
              <span>学习记录</span>
            </button>
          </div>
          <button
            type="button"
            className="km-header-continue-btn"
            onClick={handleContinuePractice}
            title="继续自适应练习"
          >
            <Play size={14} />
            <span>继续练习</span>
          </button>
        </div>
      }
    >
      <div className="km-page-wrapper">
        {activeTab === "mastery" ? (
          <div className="knowledge-map-container" role="tabpanel">
            {/* 同步状态提醒 */}
            {authorityState.loading && (
              <div className="student-progress-sync" role="status">
                正在同步云端认知档案与学习记录…
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
                    <span className="km-mastery-title-label">掌握率</span>
                    <span className="km-mastery-percent-number">
                      {overallMasteryRate}%
                    </span>
                    <span className="km-mastery-count-label">
                      ({masteredCount}/{totalCount})
                    </span>
                  </div>
                  <div
                    className="km-mastery-micro-bar"
                    title={`已掌握 ${masteredCount}，学习中 ${studyingCount}，需巩固 ${needsReviewCount}，未开始 ${notStartedCount}`}
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
                  aria-label="状态筛选"
                >
                  <button
                    type="button"
                    className={`km-filter-btn ${statusFilter === "all" ? "active" : ""}`}
                    onClick={() => setStatusFilter("all")}
                  >
                    <span>全部</span>
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
                    <span>已掌握</span>
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
                    <span>学习中</span>
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
                    <span>需巩固</span>
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
                    <span>未开始</span>
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
                      placeholder="搜索知识点、课时或关键词..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="km-search-btn-clear"
                        onClick={() => setSearchQuery("")}
                        aria-label="清空搜索"
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
                      <span>重置 ({totalMatchedPoints})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="km-btn-compact"
                    onClick={toggleAllChapters}
                  >
                    <span>{isAllCollapsed ? "展开全部" : "折叠全部"}</span>
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
                              掌握率 <strong>{chapterMasteryPct}%</strong> (
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
                                  title={`查看《${lesson.title}》全课时考核矩阵与点亮状态`}
                                >
                                  <Grid3X3 size={13} />
                                  <span>课时矩阵</span>
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
                                    const meta =
                                      statusMeta[statusKey] ||
                                      statusMeta.not_started;
                                    const IconComponent = meta.icon;
                                    const masteryValue = item.mastery;
                                    const matrixStats = getKnowledgePointMatrixStats(
                                      lesson,
                                      knowledgePoint,
                                      profile,
                                      authoritativeAttempts,
                                    );

                                    return (
                                      <div
                                        key={knowledgePoint.id}
                                        className={`km-point-card ${meta.tone}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() =>
                                          navigate(
                                            `${routes.knowledgeLearning(
                                              knowledgePoint.id,
                                            )}?returnTo=${encodeURIComponent(
                                              routes.knowledgeMap,
                                            )}`,
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" ||
                                            e.key === " "
                                          ) {
                                            e.preventDefault();
                                            navigate(
                                              `${routes.knowledgeLearning(
                                                knowledgePoint.id,
                                              )}?returnTo=${encodeURIComponent(
                                                routes.knowledgeMap,
                                              )}`,
                                            );
                                          }
                                        }}
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

                                        {/* 卡片中部：认知矩阵查看入口与来源 */}
                                        <div className="km-point-card-middle">
                                          <button
                                            type="button"
                                            className="km-point-matrix-btn"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setMatrixModalState({
                                                isOpen: true,
                                                mode: "knowledgePoint",
                                                lesson,
                                                knowledgePoint,
                                              });
                                            }}
                                            title="查看该知识点的认知考核矩阵与点亮情况"
                                          >
                                            <Grid3X3 size={12} />
                                            <span>认知矩阵</span>
                                          </button>
                                          {sourceLabel(item.masterySource) ? (
                                            <span className="km-point-source-tag">
                                              {sourceLabel(item.masterySource)}
                                            </span>
                                          ) : null}
                                        </div>

                                        {/* 卡片底部：双指标（掌握率 + 矩阵点亮数/总量）与行动入口 */}
                                        <div className="km-point-card-bottom-dual">
                                          <div className="km-point-dual-metrics">
                                            {/* 指标1：掌握率 */}
                                            <div className="km-metric-item" title={`掌握度：${masteryValue == null ? "未开始" : masteryValue + "%"}`}>
                                              <span className="km-metric-lbl">掌握率</span>
                                              <div className="km-metric-track">
                                                <div
                                                  className="km-metric-fill mastery"
                                                  style={{
                                                    width:
                                                      masteryValue == null
                                                        ? "0%"
                                                        : `${Math.min(
                                                            100,
                                                            Math.max(0, masteryValue),
                                                          )}%`,
                                                  }}
                                                />
                                              </div>
                                              <span className="km-metric-val">
                                                {masteryValue == null ? "—" : `${masteryValue}%`}
                                              </span>
                                            </div>

                                            {/* 指标2：矩阵点亮数量与总量 */}
                                            <div
                                              className="km-metric-item"
                                              title={`认知矩阵点亮：${matrixStats.lighted}/${matrixStats.total} 格 (${matrixStats.rate}%)`}
                                            >
                                              <span className="km-metric-lbl">矩阵点亮</span>
                                              <div className="km-metric-track">
                                                <div
                                                  className="km-metric-fill matrix"
                                                  style={{
                                                    width: `${matrixStats.rate}%`,
                                                  }}
                                                />
                                              </div>
                                              <span className="km-metric-val matrix-highlight">
                                                <strong>{matrixStats.lighted}</strong>/{matrixStats.total}格
                                              </span>
                                            </div>
                                          </div>

                                          <span className="km-point-action-hint">
                                            <span>{meta.actionText}</span>
                                            <ArrowRight size={13} />
                                          </span>
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
                <h3 className="km-empty-title">未找到匹配的知识点</h3>
                <p className="km-empty-desc">
                  当前筛选或搜索条件下没有找到知识点，请尝试更换关键词或清除筛选条件。
                </p>
                <button
                  type="button"
                  className="km-empty-btn"
                  onClick={resetFilters}
                >
                  清除所有筛选条件
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
          onStartPractice={(kpId) => {
            navigate(
              `${routes.knowledgeLearning(kpId)}?returnTo=${encodeURIComponent(
                routes.knowledgeMap,
              )}`,
            );
          }}
        />
      </div>
    </AppShell>
  );
}
