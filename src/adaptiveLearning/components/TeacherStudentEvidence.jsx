import React from "react";
import { Brain } from "lucide-react";

import { knowledgePointName } from "../teacher/domain/teacherClassroom";

/**
 *
 * @param value
 */
function timeText(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 *
 * @param root0
 * @param root0.support
 */
export function TeacherTutoringStatus({ support }) {
  if (!support) return null;
  return (
    <section
      className={`student-tutoring-status ${support.state.toLowerCase().replaceAll("_", "-")}`}
    >
      <div>
        <Brain size={18} />
        <span>
          <small>当前学习支持状态</small>
          <strong>{support.label}</strong>
        </span>
      </div>
      <div>
        <small>共性原因</small>
        <p>{support.summary || "学生仍在说明自己的思路"}</p>
      </div>
      <div>
        <small>教师下一步</small>
        <p>{support.nextAction}</p>
      </div>
      <time>{timeText(support.updatedAt)}</time>
    </section>
  );
}

/**
 *
 * @param root0
 * @param root0.masteryResults
 */
export function TeacherMasteryEvidence({ masteryResults = [] }) {
  if (masteryResults.length === 0) return null;
  return (
    <div className="student-mastery-evidence">
      <h3>知识点掌握证据</h3>
      {masteryResults.map((result) => {
        const stages = result.sourceScores || {};
        const missing = [
          ["PRE", "课前测验"],
          ["PRACTICE", "独立练习"],
          ["POST", "学后验证"],
        ]
          .filter(([key]) => stages[key] == null)
          .map(([, label]) => label);
        return (
          <article key={result.knowledgeObjectiveId}>
            <strong>{knowledgePointName(result.knowledgeObjectiveId)}</strong>
            <span>
              {result.mastery == null ? "证据不足" : `${result.mastery}%`}
            </span>
            <small>
              有效证据 {result.evidenceCount || 0} · 课前测验{" "}
              {stages.PRE == null ? "缺失" : "已完成"} · 独立练习{" "}
              {stages.PRACTICE == null ? "缺失" : "已完成"} · 学后验证{" "}
              {stages.POST == null ? "缺失" : "已完成"} · 独立完成{" "}
              {Math.round(Number(result.independenceAverage) * 100)}%
              {missing.length > 0 ? ` · 下一步：补齐${missing.join("、")}` : ""}
            </small>
          </article>
        );
      })}
    </div>
  );
}

const preStatusLabels = {
  provisionally_mastered: "暂定掌握",
  needs_learning: "需要学习",
  uncertain: "暂不确定",
};

const preReasonLabels = {
  RECENT_MASTERY_VERIFIED: "近期掌握记录已通过当前题验证",
  TWO_STRONG_RESPONSES: "连续两题达到要求",
  TWO_CLEAR_GAPS: "连续两题未达到要求",
  CONFLICTING_EVIDENCE_AT_LIMIT: "3 题后证据仍不稳定",
};

/**
 *
 * @param root0
 * @param root0.summary
 */
export function TeacherPreAssessmentEvidence({ summary }) {
  if (!summary?.decisions?.length) return null;
  return (
    <section className="teacher-pre-assessment-evidence">
      <header>
        <div>
          <h3>动态课前诊断</h3>
          <small>
            实际作答 {summary.answeredQuestionCount} 题 ·
            结论仅用于安排本课学习路径
          </small>
        </div>
        {summary.completedAt && <time>{timeText(summary.completedAt)}</time>}
      </header>
      <div>
        {summary.decisions.map((decision) => (
          <article
            className={decision.diagnosisStatus.replaceAll("_", "-")}
            key={decision.knowledgePointId}
          >
            <div>
              <strong>{knowledgePointName(decision.knowledgePointId)}</strong>
              <span>
                {preStatusLabels[decision.diagnosisStatus] || "诊断完成"}
              </span>
            </div>
            {preReasonLabels[decision.stopReason] && (
              <p>{preReasonLabels[decision.stopReason]}</p>
            )}
            <small>
              有效诊断题 {decision.evidenceCount || 0} · 置信度{" "}
              {decision.confidence === "high"
                ? "高"
                : decision.confidence === "medium"
                  ? "中"
                  : "待补充"}
              {decision.historicalEvidenceUsed ? " · 使用近期历史证据" : ""}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}
