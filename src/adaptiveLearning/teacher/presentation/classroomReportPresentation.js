import { trans } from "../../../utils/i18n";

const COPY = {
  missingPeriod: ["missingPeriod", "缺少课堂标识，请返回课堂列表重试"],
  loadFailed: ["loadFailed", "课堂报告加载失败，请重试"],
  back: ["back", "返回"],
  title: ["title", "课堂学习统计"],
  export: ["export", "导出报告"],
  exportResults: ["exportResults", "导出成果报告"],
  loadingTitle: ["loadingTitle", "正在生成课堂学习统计"],
  loadingDescription: [
    "loadingDescription",
    "正在汇总全班学生学前/学后掌握度及作答成果",
  ],
  missingClass: ["missingClass", "未找到可访问的课堂"],
  loadFailedTitle: ["loadFailedTitle", "课堂报告加载失败"],
  missingClassDescription: [
    "missingClassDescription",
    "这个课堂不存在，或当前账号已不能访问。请选择其他课堂。",
  ],
  backToLessons: ["backToLessons", "返回教材课时"],
  reload: ["reload", "重新加载"],
  emptyTitle: ["emptyTitle", "暂无课堂报告数据"],
  emptyDescription: [
    "emptyDescription",
    "当前课堂尚未产生学生学习记录，可稍后重新加载。",
  ],
  duration: ["duration", "课堂时长 {$duration}"],
  minutes: ["minutes", "{$count} 分钟"],
  linkedLessons: ["linkedLessons", "已关联 {$count} 个课时"],
  participants: ["participants", "参与学生"],
  participantDetail: ["participantDetail", "人参与本课"],
  cumulativePractice: ["cumulativePractice", "全部学生累计练习"],
  questionAverage: ["questionAverage", "题（人均 {$average} 题）"],
  cumulativeLearning: ["cumulativeLearning", "全部学生累计学习"],
  minuteAverage: ["minuteAverage", "分钟（人均 {$average} 分钟）"],
  masterySummary: ["masterySummary", "学前 → 学后平均掌握度"],
  analyticsNavigation: ["analyticsNavigation", "学习分析视图导航"],
  studentAnalysis: ["studentAnalysis", "学生分析"],
  knowledgeAnalysis: ["knowledgeAnalysis", "知识点分析"],
  student: ["student", "学生"],
  masteredKnowledge: ["masteredKnowledge", "掌握知识点"],
  masteryComparison: ["masteryComparison", "掌握度（学前 → 学后）"],
  accuracy: ["accuracy", "正确率"],
  questionCount: ["questionCount", "做题数"],
  learningPending: ["learningPending", "学习时长待统计"],
  learningMinutes: ["learningMinutes", "{$count} 分钟学习"],
  knowledgeCount: ["knowledgeCount", "{$count} 个知识点"],
  questions: ["questions", "{$count} 题"],
  noStudentMatch: ["noStudentMatch", "没有检索到匹配的学生学习记录。"],
  knowledgeAnswerSummary: [
    "knowledgeAnswerSummary",
    "{$students} 人作答 · 人均 {$average} 题",
  ],
  prePostMastery: ["prePostMastery", "学前 / 学后掌握度"],
  masteredStudents: ["masteredStudents", "达标人数"],
  masteredCount: ["masteredCount", "{$mastered} / {$total} 人"],
  toggleDetails: ["toggleDetails", "展开或收起学生明细"],
  studentDetails: ["studentDetails", "学生作答明细（{$count} 人）"],
  fullyMastered: ["fullyMastered", "完全掌握"],
  wellMastered: ["wellMastered", "良好掌握"],
  pending: ["pending", "待判断"],
  reinforce: ["reinforce", "需巩固"],
  answerPerformance: ["answerPerformance", "作答表现："],
  answerSummary: ["answerSummary", "{$count} 题 · 正确率 {$accuracy}"],
  noKnowledgeComparison: [
    "noKnowledgeComparison",
    "本堂课结算后将实时生成知识点学习对比。",
  ],
  preMastery: ["preMastery", "学前 {$value}"],
  postMastery: ["postMastery", "学后 {$value}"],
  preMasteryTitle: ["preMasteryTitle", "学前掌握度：{$value}"],
  postMasteryTitle: ["postMasteryTitle", "学后掌握度：{$value}"],
  exportFilename: ["exportFilename", "课堂学习成果统计-{$periodId}.csv"],
};

/** 集中读取教师报告文案，避免页面同时拼接中英文。 */
export function classroomReportText(key, replacements = {}) {
  const [suffix, fallback] = COPY[key] || [key, key];
  return trans(
    `adaptiveLearning.classroomReport.${suffix}`,
    fallback,
    replacements,
  );
}

/** 将掌握状态码映射为单语言展示文案。 */
export function classroomReportMasteryStatus(status) {
  if (status === "EXCELLENT") return classroomReportText("fullyMastered");
  if (status === "GOOD") return classroomReportText("wellMastered");
  if (status === "PENDING") return classroomReportText("pending");
  return classroomReportText("reinforce");
}
