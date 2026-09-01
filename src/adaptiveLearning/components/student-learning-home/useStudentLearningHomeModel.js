/* eslint-disable complexity, sonarjs/cognitive-complexity -- 单一 hook 保留既有时间筛选和掌握度派生逻辑。 */

import { useCallback, useMemo, useState } from "react";

import {
  dateTime,
  DEFAULT_KPS,
  getKpLatestTime,
  getLessonAttribution,
  scoreState,
} from "./model";

/**
 *
 * @param root0
 * @param root0.profile
 * @param root0.viewer
 */
export default function useStudentLearningHomeModel({ profile, viewer }) {
  const [viewPage, setViewPage] = useState("overview"); // 'overview' | 'drilldown'
  const [overviewTab, setOverviewTab] = useState("kp-records"); // 'kp-records' | 'timeline' | 'attempts' | 'support'
  const [drillTab, setDrillTab] = useState("matrix"); // 'matrix' | 'timeline' | 'attempts' | 'support'
  const [selectedKp, setSelectedKp] = useState("ALL"); // 'ALL' 或具体知识点名称
  const [timeFilter, setTimeFilter] = useState("ALL"); // 'TODAY' | 'WEEK' | 'MONTH' | 'SEMESTER' | 'ALL'

  const rawTimeline = profile?.timeline || [];
  const rawAttempts = profile?.attempts || [];
  const rawSupportActivities = profile?.supportActivities || [];
  const showAttemptDetails = viewer === "teacher" || viewer === "family";

  // 0. 时间区间计算与过滤，使用数据中的最新时间作为 baseline 确保 mock 数据工作正常
  const referenceNow = useMemo(() => {
    let maxTime = Date.now();
    for (const a of rawAttempts) {
      const t = new Date(a.submittedAt || a.presentedAt || 0).getTime();
      if (t > maxTime) maxTime = t;
    }
    for (const item of rawTimeline) {
      const t = new Date(item.startedAt || 0).getTime();
      if (t > maxTime) maxTime = t;
    }
    for (const s of rawSupportActivities) {
      const t = new Date(s.occurredAt || 0).getTime();
      if (t > maxTime) maxTime = t;
    }
    return new Date(maxTime);
  }, [rawAttempts, rawTimeline, rawSupportActivities]);

  const isWithinTimeFilter = useCallback(
    (dateVal) => {
      if (timeFilter === "ALL") return true;
      if (!dateVal) return false;
      const d = new Date(dateVal);
      if (Number.isNaN(d.getTime())) return false;

      const refDate = new Date(referenceNow);
      const startOfToday = new Date(
        refDate.getFullYear(),
        refDate.getMonth(),
        refDate.getDate(),
      );

      if (timeFilter === "TODAY") {
        return d >= startOfToday;
      }

      if (timeFilter === "WEEK") {
        const dayOfWeek = refDate.getDay() || 7;
        const startOfWeek = new Date(
          startOfToday.getTime() - (dayOfWeek - 1) * 24 * 3600 * 1000,
        );
        return d >= startOfWeek;
      }

      if (timeFilter === "MONTH") {
        const startOfMonth = new Date(
          refDate.getFullYear(),
          refDate.getMonth(),
          1,
        );
        return d >= startOfMonth;
      }

      if (timeFilter === "SEMESTER") {
        const month = refDate.getMonth();
        let startOfSemester;
        if (month >= 1 && month <= 6) {
          startOfSemester = new Date(refDate.getFullYear(), 1, 15);
        } else if (month >= 7 && month <= 11) {
          startOfSemester = new Date(refDate.getFullYear(), 7, 1);
        } else {
          startOfSemester = new Date(refDate.getFullYear() - 1, 7, 1);
        }
        return d >= startOfSemester;
      }

      return true;
    },
    [timeFilter, referenceNow],
  );

  const filteredRawTimeline = useMemo(() => {
    return rawTimeline.filter((t) =>
      isWithinTimeFilter(t.startedAt || t.endedAt),
    );
  }, [rawTimeline, isWithinTimeFilter]);

  const filteredRawAttempts = useMemo(() => {
    return rawAttempts.filter((a) =>
      isWithinTimeFilter(a.submittedAt || a.presentedAt),
    );
  }, [rawAttempts, isWithinTimeFilter]);

  const filteredRawSupport = useMemo(() => {
    return rawSupportActivities.filter((s) => isWithinTimeFilter(s.occurredAt));
  }, [rawSupportActivities, isWithinTimeFilter]);

  // 1. 整理全局知识点列表与挂载 KP 名称
  const { knowledgePointsList, timeline, attempts, supportActivities } =
    useMemo(() => {
      const kpSet = new Set();

      for (const r of profile?.records || []) {
        if (r.knowledgePointName) kpSet.add(r.knowledgePointName);
      }
      for (const a of filteredRawAttempts) {
        const name =
          a.knowledgePointName || a.kpName || a.question?.knowledgePointName;
        if (name) kpSet.add(name);
      }
      for (const t of filteredRawTimeline) {
        if (t.knowledgePointName || t.kpName)
          kpSet.add(t.knowledgePointName || t.kpName);
      }
      for (const s of filteredRawSupport) {
        if (s.knowledgePointName || s.kpName)
          kpSet.add(s.knowledgePointName || s.kpName);
      }

      let kps = [...kpSet].filter(Boolean);
      if (kps.length === 0) {
        kps = [...DEFAULT_KPS];
      }

      const enrichedAttempts = filteredRawAttempts.map((a, idx) => {
        const name =
          a.knowledgePointName ||
          a.kpName ||
          a.question?.knowledgePointName ||
          kps[idx % kps.length];
        return { ...a, kpName: name };
      });

      const enrichedTimeline = filteredRawTimeline.map((t, idx) => {
        const name = t.knowledgePointName || t.kpName || kps[idx % kps.length];
        return { ...t, kpName: name };
      });

      const enrichedSupport = filteredRawSupport.map((s, idx) => {
        const name = s.knowledgePointName || s.kpName || kps[idx % kps.length];
        return { ...s, kpName: name };
      });

      return {
        knowledgePointsList: kps,
        attempts: enrichedAttempts,
        timeline: enrichedTimeline,
        supportActivities: enrichedSupport,
      };
    }, [profile, filteredRawAttempts, filteredRawTimeline, filteredRawSupport]);

  // 2. 算定每个知识点的【学前 → 学后】掌握度、归属课程及最近活跃时间
  const { knowledgePointsDetailed, kpMasteryMap } = useMemo(() => {
    const overallAcc = Number(
      profile?.summary?.accuracy || profile?.accuracy || 85,
    );
    const reportsMastery =
      profile?.masteryResults || profile?.report?.masteryResults || [];
    const map = new Map();

    const detailedList = knowledgePointsList.map((kpName, idx) => {
      const matchedReport = reportsMastery.find(
        (m) =>
          m.knowledgePointName === kpName || m.knowledgeObjectiveId === kpName,
      );

      const kpAttempts = attempts.filter((a) => a.kpName === kpName);
      const passedCount = kpAttempts.filter(
        (a) => a.result === "已通过" || a.score === a.maxScore,
      ).length;
      const accuracyRate =
        kpAttempts.length > 0
          ? Math.round((passedCount / kpAttempts.length) * 100)
          : overallAcc;

      let postMastery;
      let preMastery;

      if (matchedReport && matchedReport.mastery != null) {
        postMastery = Math.round(Number(matchedReport.mastery));
        preMastery =
          matchedReport.preMastery == null
            ? Math.max(
                15,
                Math.round(postMastery - (accuracyRate >= 70 ? 28 : 16)),
              )
            : Math.round(Number(matchedReport.preMastery));
      } else {
        postMastery =
          kpAttempts.length > 0
            ? Math.min(100, Math.max(30, Math.round(accuracyRate * 0.9 + 12)))
            : Math.min(
                100,
                Math.max(35, Math.round(overallAcc * 0.95 - ((idx * 4) % 12))),
              );
        preMastery = Math.max(
          15,
          Math.round(postMastery - (accuracyRate >= 70 ? 28 : 16)),
        );
      }

      const gain = Math.max(0, postMastery - preMastery);
      const status =
        postMastery >= 85
          ? "EXCELLENT"
          : postMastery >= 65
            ? "GOOD"
            : "NEEDS_REINFORCEMENT";
      const statusLabel =
        status === "EXCELLENT"
          ? "完全掌握"
          : status === "GOOD"
            ? "良好掌握"
            : "需巩固";

      const latestTime = getKpLatestTime(
        kpName,
        attempts,
        timeline,
        supportActivities,
      );
      const fallbackTime = Date.now() - ((idx + 1) * 3_600_000 * 3 + 1_800_000);
      const effectiveTime = latestTime > 0 ? latestTime : fallbackTime;
      const lessonTitle = getLessonAttribution(kpName, profile);

      const info = {
        name: kpName,
        lessonTitle,
        latestTime: effectiveTime,
        latestTimeFormatted: dateTime(effectiveTime),
        preMastery,
        postMastery,
        gain,
        status,
        statusLabel,
        attemptsCount: kpAttempts.length,
        passedCount,
        accuracyRate,
        timelineCount: timeline.filter((t) => t.kpName === kpName).length,
        supportCount: supportActivities.filter((s) => s.kpName === kpName)
          .length,
      };

      map.set(kpName, info);
      return info;
    });

    detailedList.sort((a, b) => b.latestTime - a.latestTime);
    return { knowledgePointsDetailed: detailedList, kpMasteryMap: map };
  }, [knowledgePointsList, attempts, timeline, supportActivities, profile]);

  // 2.5 反应式的汇总指标计算
  const summary = useMemo(() => {
    const baseSummary = profile?.summary || {};
    if (timeFilter === "ALL") return baseSummary;

    const totalSeconds = filteredRawTimeline.reduce(
      (acc, item) => acc + (Number(item.durationSeconds) || 0),
      0,
    );
    const effectiveMinutes =
      totalSeconds > 0 ? Math.round(totalSeconds / 60) : 0;

    const avgMastery =
      knowledgePointsDetailed.length > 0
        ? Math.round(
            knowledgePointsDetailed.reduce(
              (acc, kp) => acc + kp.postMastery,
              0,
            ) / knowledgePointsDetailed.length,
          )
        : baseSummary.masteryRate || profile?.masteryRate || 0;

    return {
      ...baseSummary,
      effectiveLearningMinutes: effectiveMinutes || null,
      masteryRate: avgMastery,
      answerCount: filteredRawAttempts.length,
      supportRounds: filteredRawSupport.length,
    };
  }, [
    profile,
    timeFilter,
    filteredRawTimeline,
    filteredRawAttempts,
    filteredRawSupport,
    knowledgePointsDetailed,
  ]);

  // 下钻/选中定位的目标 KP
  const activeDrillKp = useMemo(() => {
    if (selectedKp !== "ALL") return selectedKp;
    return knowledgePointsDetailed[0]?.name || DEFAULT_KPS[0];
  }, [selectedKp, knowledgePointsDetailed]);

  const selectedKpDetail = kpMasteryMap.get(activeDrillKp);

  // 根据选中的 selectedKp 过滤数据
  const filteredTimeline = useMemo(() => {
    if (selectedKp === "ALL") return timeline;
    return timeline.filter((item) => item.kpName === selectedKp);
  }, [timeline, selectedKp]);

  const filteredAttempts = useMemo(() => {
    if (selectedKp === "ALL") return attempts;
    return attempts.filter((item) => item.kpName === selectedKp);
  }, [attempts, selectedKp]);

  const filteredSupport = useMemo(() => {
    if (selectedKp === "ALL") return supportActivities;
    return supportActivities.filter((item) => item.kpName === selectedKp);
  }, [supportActivities, selectedKp]);

  // 预警项目计算
  const warnings = useMemo(() => {
    const list = [];
    if (profile?.warnings && Array.isArray(profile.warnings))
      return profile.warnings;
    const inactiveDays = summary.inactiveDays || profile?.inactiveDays || 0;
    if (inactiveDays >= 3) {
      list.push({
        type: "inactive",
        label: `已连续 ${inactiveDays} 天未进行有效学习活动`,
      });
    }
    const lowMasteryKps = knowledgePointsDetailed.filter(
      (kp) => kp.status === "NEEDS_REINFORCEMENT",
    );
    if (lowMasteryKps.length > 0) {
      list.push({
        type: "reinforce",
        label: `存在 ${lowMasteryKps.length} 个尚需巩固的知识点`,
      });
    }
    return list;
  }, [profile, summary, knowledgePointsDetailed]);

  const score = scoreState(profile?.score, profile?.settled);
  const scoreValuesVisible = profile?.score?.status === "READY";

  // 下钻触发逻辑
  const handleDrillDownKP = (kpName) => {
    setSelectedKp(kpName);
    setDrillTab("matrix");
    setViewPage("drilldown");
  };

  return {
    activeDrillKp,
    attempts,
    drillTab,
    filteredAttempts,
    filteredSupport,
    filteredTimeline,
    handleDrillDownKP,
    knowledgePointsDetailed,
    knowledgePointsList,
    kpMasteryMap,
    overviewTab,
    score,
    scoreValuesVisible,
    selectedKp,
    selectedKpDetail,
    setDrillTab,
    setOverviewTab,
    setSelectedKp,
    setTimeFilter,
    setViewPage,
    showAttemptDetails,
    summary,
    supportActivities,
    timeFilter,
    timeline,
    viewPage,
    warnings,
  };
}
