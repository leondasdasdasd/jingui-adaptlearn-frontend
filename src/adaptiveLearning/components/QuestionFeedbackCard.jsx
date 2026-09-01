import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleDot,
  CircleX,
  Flame,
  Layers,
  Lightbulb,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

import { MASTERY_THRESHOLD } from "../shared/domain/masteryPolicy.js";
import { buildQuestionFeedback } from "../student/domain/questionFeedback";
import MathContent from "./MathContent";
import {
  adaptiveCueDetail,
  adaptiveCueTitle,
  localizedFeedbackItems,
  masteryChangeLabel,
  masteryFeedbackCopy,
  masteryProgressAria,
  questionFeedbackCopy,
  questionFeedbackScore,
  questionFeedbackTitle,
} from "./question-feedback/questionFeedbackPresentation";

import "../question-feedback.css";

const stateIcons = {
  correct: CheckCircle2,
  partial: CircleDot,
  incorrect: Target,
  retry: Lightbulb,
  correction: Sparkles,
  recorded: CheckCircle2,
};

/**
 *
 * @param props
 */
export default function QuestionFeedbackCard(props) {
  const feedback = buildQuestionFeedback(props);
  if (!feedback) return null;
  const Icon =
    props.outcomeTone === "correct"
      ? CheckCircle2
      : props.outcomeTone === "incorrect"
        ? CircleX
        : stateIcons[feedback.state] || CircleDot;
  const showAchieved =
    feedback.state !== "correct" && feedback.achieved.length > 0;
  const showErrorReason = Boolean(feedback.errorReason);
  const improvementText = localizedFeedbackItems(feedback.improvements);
  const showImprovement = Boolean(improvementText);
  const copy = questionFeedbackCopy();
  const achievedText = feedback.achieved.join(copy.listSeparator);
  return (
    <>
      <section
        className={`question-feedback-card ${feedback.state}${props.outcomeTone ? ` answer-outcome-${props.outcomeTone}` : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <header>
          <span className="question-feedback-icon" aria-hidden="true">
            <Icon size={20} />
          </span>
          <div>
            <strong>{questionFeedbackTitle(feedback)}</strong>
            {feedback.showScore && <b>{questionFeedbackScore(feedback)}</b>}
          </div>
        </header>
        {feedback.recognizedAnswer && (
          <div className="question-feedback-row recognized">
            <span>{copy.aiRecognized}</span>
            <MathContent as="p" renderKey={feedback.recognizedAnswer}>
              {feedback.recognizedAnswer}
            </MathContent>
          </div>
        )}
        {showAchieved && (
          <div className="question-feedback-row achieved">
            <span>{copy.achieved}</span>
            <MathContent as="p" renderKey={achievedText}>
              {achievedText}
            </MathContent>
          </div>
        )}
        {showErrorReason && (
          <div className="question-feedback-row error-reason">
            <span>{copy.errorReason}</span>
            <MathContent as="p" renderKey={feedback.errorReason}>
              {feedback.errorReason}
            </MathContent>
          </div>
        )}
        {showImprovement && (
          <div className="question-feedback-row improvement">
            <span>{copy.improvement}</span>
            <MathContent as="p" renderKey={improvementText}>
              {improvementText}
            </MathContent>
          </div>
        )}
        {feedback.adaptiveCue?.tone === "support" && (
          <div className="question-feedback-adaptive support">
            <strong>{adaptiveCueTitle(feedback.adaptiveCue)}</strong>
            <span>{adaptiveCueDetail(feedback.adaptiveCue)}</span>
          </div>
        )}
      </section>
      {props.masteryFeedback?.length > 0 && (
        <MasteryFeedback
          updates={props.masteryFeedback}
          summary={props.practiceSummary}
          practiceGate={props.practiceGate}
        />
      )}
    </>
  );
}

/**
 *
 * @param root0
 * @param root0.updates
 * @param root0.summary
 * @param root0.practiceGate
 */
function MasteryFeedback({
  updates = [],
  summary = false,
  practiceGate = null,
}) {
  const copy = masteryFeedbackCopy(summary);
  return (
    <section className="question-feedback-mastery" aria-label={copy.ariaLabel}>
      <div className="question-feedback-mastery-list">
        {updates.map((item) => {
          const delta = item.delta;
          const normalizedDelta = delta == null ? null : Number(delta);
          const deltaLabel = Number.isFinite(normalizedDelta)
            ? `${normalizedDelta > 0 ? "+" : ""}${normalizedDelta.toFixed(2)}%`
            : copy.awaitingSettlement;
          const mastery = item.after == null ? null : Number(item.after);
          // Keep the visible percentage consistent with the authoritative
          // stop gate. A value just below the target can otherwise round up and
          // look complete while the practice gate correctly asks the student to
          // continue” message. Once the gate is met, the real rounded value
          // is shown normally.
          const displayMastery = Number.isFinite(mastery)
            ? practiceGate?.targetMasteryReached === false &&
              mastery >= MASTERY_THRESHOLD
              ? MASTERY_THRESHOLD - 0.01
              : mastery
            : null;
          const before = Number(item.before);
          const displayBefore = Number.isFinite(before)
            ? before
            : Number.isFinite(displayMastery) &&
                Number.isFinite(normalizedDelta)
              ? displayMastery - normalizedDelta
              : displayMastery;
          const changed =
            Number.isFinite(normalizedDelta) &&
            Math.abs(normalizedDelta) >= 0.05;
          return (
            <div
              className={`question-feedback-mastery-item${changed ? (normalizedDelta > 0 ? " is-up" : " is-down") : ""}`}
              key={item.knowledgePointId}
            >
              <div className="question-feedback-mastery-heading">
                <strong>{item.knowledgePointName}</strong>
                <small>
                  {copy.confidence}{" "}
                  <b>
                    {item.confidence == null
                      ? "—"
                      : `${Math.round(item.confidence)}%`}
                  </b>
                </small>
              </div>
              {displayMastery == null ? (
                <small className="question-feedback-mastery-pending">
                  {copy.masteryPending}
                </small>
              ) : (
                <MasteryProgress
                  before={displayBefore}
                  after={displayMastery}
                  delta={normalizedDelta}
                  deltaLabel={deltaLabel}
                  changed={changed}
                  correctStreak={item.correctStreak}
                  difficulty={item.difficulty || item.questionDifficulty}
                  streakFactor={item.streakFactor}
                  hasMatrixCoverage={item.hasMatrixCoverage || Boolean(item.matrixCellId || item.matrixCellCode)}
                  matrixCellCode={item.matrixCellCode}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const getDifficultyFactor = (diff) => {
  if (typeof diff === "string") {
    const d = diff.toUpperCase();
    if (d === "D1") return 0.8;
    if (d === "D2") return 0.9;
    if (d === "D3") return 1.0;
    if (d === "D4") return 1.25;
    if (d === "D5") return 1.5;
  }
  const n = Number(diff);
  if (Number.isFinite(n)) {
    if (n <= 1) return 0.8;
    if (n === 2) return 0.9;
    if (n === 3) return 1.0;
    if (n === 4) return 1.25;
    if (n >= 5) return 1.5;
  }
  return 1.0;
};

function getStreakInfo(streak, factor) {
  const n = Number(streak) || 0;
  if (n < 2) return null;
  let title = "渐入佳境";
  let defaultFactor = 1.15;

  if (n === 2) {
    title = "渐入佳境";
    defaultFactor = 1.15;
  } else if (n === 3) {
    title = "势如破竹";
    defaultFactor = 1.30;
  } else if (n === 4) {
    title = "融会贯通";
    defaultFactor = 1.50;
  } else if (n === 5) {
    title = "出神入化";
    defaultFactor = 1.75;
  } else {
    title = "炉火纯青";
    defaultFactor = 2.00;
  }

  const actFactor = Number(factor) > 1.0 ? Number(factor) : defaultFactor;
  return {
    title,
    streak: n,
    factor: actFactor,
    label: `${title} (${n}连对)`,
    valueText: `x${actFactor.toFixed(2)} 🔥`,
  };
}

function buildStages({
  before,
  after,
  delta,
  correctStreak,
  difficulty,
  streakFactor,
  hasMatrixCoverage,
  matrixCellCode,
}) {
  const normBefore = clampProgress(before);
  const normAfter = clampProgress(after);
  const totalDelta = normAfter - normBefore;

  if (Math.abs(totalDelta) < 0.05) {
    return [{ value: normAfter, badges: [] }];
  }

  const dFactor = getDifficultyFactor(difficulty);
  const streakInfo = getStreakInfo(correctStreak, streakFactor);
  const sFactor = streakInfo ? streakInfo.factor : 1.0;
  const isMatrixLit = Boolean(hasMatrixCoverage);
  const mFactor = isMatrixLit ? 1.10 : 1.0;

  if (totalDelta > 0) {
    const hasDiffBonus = Math.abs(dFactor - 1.0) >= 0.05 || Boolean(difficulty);
    const hasStreakBonus = Boolean(streakInfo);

    const totalMultiplier =
      (hasDiffBonus ? dFactor : 1.0) *
      (hasStreakBonus ? sFactor : 1.0) *
      (isMatrixLit ? mFactor : 1.0);

    const baseDelta = totalDelta / totalMultiplier;

    const stages = [];
    stages.push({ value: normBefore, badges: [] });

    // 1. 作答正确 (Correct Answer Base Gain)
    const val1 = Number((normBefore + baseDelta).toFixed(2));
    const badge1 = {
      id: "correct",
      type: "correct",
      icon: CheckCircle2,
      label: "作答正确",
      valueText: `+${baseDelta.toFixed(2)}%`,
    };
    stages.push({ value: val1, badges: [badge1] });

    let currentVal = val1;

    // 2. 难度加成 (Difficulty Bonus)
    if (hasDiffBonus) {
      const diffDelta = baseDelta * (dFactor - 1.0);
      currentVal = Number((currentVal + diffDelta).toFixed(2));
      const diffName = String(difficulty || "D3").toUpperCase();
      const badge2 = {
        id: "difficulty",
        type: "difficulty",
        icon: Target,
        label: `${diffName} 难度加成`,
        valueText: `x${dFactor.toFixed(2)}`,
      };
      stages.push({ value: currentVal, badges: [badge2] });
    }

    // 3. 连对加成 (5 Prompt Words: 渐入佳境 / 势如破竹 / 融会贯通 / 出神入化 / 炉火纯青)
    if (hasStreakBonus && streakInfo) {
      const streakDelta =
        baseDelta * (hasDiffBonus ? dFactor : 1.0) * (sFactor - 1.0);
      currentVal = Number((currentVal + streakDelta).toFixed(2));
      const badge3 = {
        id: "streak",
        type: "streak",
        icon: Flame,
        label: streakInfo.label,
        valueText: streakInfo.valueText,
      };
      stages.push({ value: currentVal, badges: [badge3] });
    }

    // 4. 矩阵点亮 (Matrix Cell Light-Up)
    if (isMatrixLit) {
      const matrixLabel = matrixCellCode
        ? `矩阵节点点亮 [${matrixCellCode}]`
        : "矩阵节点点亮";
      const badge4 = {
        id: "matrix",
        type: "matrix",
        icon: Layers,
        label: matrixLabel,
        valueText: "✨ 节点已点亮",
      };
      stages.push({ value: normAfter, badges: [badge4] });
    }

    stages[stages.length - 1].value = normAfter;
    return stages;
  } else {
    const badge1 = {
      id: "base",
      type: "danger",
      icon: TrendingDown,
      label: "作答未通过",
      valueText: `${totalDelta.toFixed(2)}%`,
    };
    const badges = [badge1];
    if (Number(correctStreak) === 0) {
      badges.push({
        id: "reset",
        type: "warning",
        icon: Sparkles,
        label: "连对中断",
        valueText: "重置",
      });
    }
    return [
      { value: normBefore, badges: [] },
      { value: normAfter, badges },
    ];
  }
}

function MasteryProgress({
  before,
  after,
  delta,
  deltaLabel,
  changed,
  correctStreak,
  difficulty = "D3",
  streakFactor = 1.0,
  hasMatrixCoverage = false,
  matrixCellCode = null,
}) {
  const normAfter = clampProgress(after);
  const normBefore = clampProgress(before ?? after);

  const stages = useMemo(
    () =>
      buildStages({
        before: normBefore,
        after: normAfter,
        delta,
        correctStreak,
        difficulty,
        streakFactor,
        hasMatrixCoverage,
        matrixCellCode,
      }),
    [
      normBefore,
      normAfter,
      delta,
      correctStreak,
      difficulty,
      streakFactor,
      hasMatrixCoverage,
      matrixCellCode,
    ],
  );

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(normBefore);
  const [activeBadges, setActiveBadges] = useState([]);

  useEffect(() => {
    if (!changed || stages.length <= 1) {
      setAnimatedProgress(normAfter);
      setCurrentStageIndex(stages.length - 1);
      setActiveBadges(stages.flatMap((s) => s.badges || []));
      return;
    }

    setAnimatedProgress(normBefore);
    setCurrentStageIndex(0);
    setActiveBadges([]);

    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      setAnimatedProgress(normAfter);
      setCurrentStageIndex(stages.length - 1);
      setActiveBadges(stages.flatMap((s) => s.badges || []));
      return;
    }

    const timers = [];
    const stepDuration = 900; // ms per pulse

    stages.forEach((stage, idx) => {
      if (idx === 0) return;
      const delay = idx * stepDuration;
      const timer = setTimeout(() => {
        setCurrentStageIndex(idx);
        setAnimatedProgress(stage.value);
        if (stage.badges && stage.badges.length > 0) {
          setActiveBadges((prev) => {
            const existingIds = new Set(prev.map((b) => b.id));
            const newBadges = stage.badges.filter(
              (b) => !existingIds.has(b.id),
            );
            return [...prev, ...newBadges];
          });
        }
      }, delay);
      timers.push(timer);
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [changed, normBefore, normAfter, stages]);

  const currentStage = stages[currentStageIndex] || stages[stages.length - 1];
  const displayTargetValue = currentStage?.value ?? normAfter;

  const direction = changed ? (Number(delta) < 0 ? "down" : "up") : "steady";
  const breakthrough =
    changed &&
    normBefore < MASTERY_THRESHOLD &&
    normAfter >= MASTERY_THRESHOLD;
  const TrendIcon = breakthrough
    ? Trophy
    : direction === "down"
      ? TrendingDown
      : TrendingUp;
  const copy = masteryFeedbackCopy(false);
  const changeLabel = masteryChangeLabel({
    breakthrough,
    direction,
    deltaLabel,
  });

  return (
    <div
      className={`question-feedback-mastery-progress ${direction}${breakthrough ? " breakthrough" : ""}`}
    >
      <div className="question-feedback-mastery-score">
        <div>
          <strong>
            <AnimatedMasteryValue
              from={normBefore}
              to={displayTargetValue}
              animate={changed}
            />
            <small>%</small>
          </strong>
        </div>
        {changed && (
          <span className="question-feedback-mastery-delta">
            <TrendIcon size={16} aria-hidden="true" />
            {changeLabel}
          </span>
        )}
      </div>

      <div
        className="question-feedback-mastery-track"
        role="progressbar"
        aria-label={masteryProgressAria(normBefore, normAfter)}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Number(animatedProgress.toFixed(2))}
      >
        <span
          className="question-feedback-mastery-base"
          style={{ width: `${animatedProgress}%` }}
        />
        {changed && direction === "up" && (
          <span
            className="question-feedback-mastery-change"
            style={{
              left: `${Math.min(normBefore, animatedProgress)}%`,
              width: `${Math.abs(animatedProgress - normBefore)}%`,
            }}
          />
        )}
        <span
          className="question-feedback-mastery-fill"
          style={{ width: `${animatedProgress}%` }}
        />
        {changed && (
          <i
            className="question-feedback-mastery-before"
            style={{ left: `${normBefore}%` }}
            aria-hidden="true"
          />
        )}
        <i className="question-feedback-mastery-target" aria-hidden="true" />
        <i
          className="question-feedback-mastery-endpoint"
          style={{ left: `${animatedProgress}%` }}
          aria-hidden="true"
        >
          {changed && <Sparkles size={15} />}
        </i>
      </div>

      {activeBadges.length > 0 && (
        <div className="question-feedback-mastery-breakdown" aria-label="计算加成明细">
          {activeBadges.map((badge) => {
            const BadgeIconComponent = badge.icon || Sparkles;
            return (
              <span
                key={badge.id}
                className={`mastery-breakdown-chip ${badge.type}`}
              >
                <BadgeIconComponent size={13} className="chip-icon" />
                <span className="chip-label">{badge.label}</span>
                <strong className="chip-value">{badge.valueText}</strong>
              </span>
            );
          })}
        </div>
      )}

      <div className="question-feedback-mastery-scale" aria-hidden="true">
        <span>0%</span>
        <span>{copy.masteryThreshold}</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function AnimatedMasteryValue({ from, to, animate }) {
  const [value, setValue] = useState(animate ? from : to);

  useEffect(() => {
    if (
      !animate ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(to);
      return;
    }

    const startVal = value;
    const endVal = to;
    if (Math.abs(startVal - endVal) < 0.01) return;

    let frame;
    const duration = 750;
    const startedAt = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(startVal + (endVal - startVal) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, to]);

  return Number(value).toFixed(2);
}

/**
 *
 * @param value
 */
function clampProgress(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}
