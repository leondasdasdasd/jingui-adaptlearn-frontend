/**
 *
 * @param value
 */
function csvCell(value) {
  const text = String(value ?? "");
  return /[\n\r",]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 *
 * @param value
 */
function percent(value) {
  return value == null || !Number.isFinite(Number(value))
    ? ""
    : `${Math.round(Number(value))}%`;
}

/**
 *
 * @param students
 * @param knowledgeRows
 */
export function buildClassroomReportCsv(students, knowledgeRows) {
  const rows = [
    [
      "学生",
      "有效学习时间（分钟）",
      "作答数",
      "正确率",
      "掌握率",
      "置信度",
      "证据状态",
      "结论",
    ],
  ];
  for (const student of students) {
    rows.push([
      student.name,
      student.learningMinutes,
      student.questionCount,
      percent(student.accuracy),
      percent(student.postMastery),
      percent(student.confidence),
      student.scoreStatus || "WAITING",
      student.scoreSummary || "",
    ]);
  }
  rows.push(
    [],
    ["知识点", "平均掌握率", "平均置信度", "有效证据", "暂无法判断人数"],
  );
  for (const item of knowledgeRows)
    rows.push([
      item.name,
      percent(item.averageMastery),
      percent(item.averageConfidence),
      item.evidence,
      item.unknown,
    ]);
  return `\uFEFF${rows.map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\r\n")}\r\n`;
}

/**
 *
 * @param root0
 * @param root0.students
 * @param root0.knowledgeRows
 * @param root0.filename
 * @param root0.documentRef
 * @param root0.urlRef
 */
export function downloadClassroomReportCsv({
  students,
  knowledgeRows,
  filename,
  documentRef = document,
  urlRef = URL,
}) {
  const blob = new Blob([buildClassroomReportCsv(students, knowledgeRows)], {
    type: "text/csv;charset=utf-8",
  });
  const href = urlRef.createObjectURL(blob);
  const link = documentRef.createElement("a");
  link.href = href;
  link.download = filename;
  documentRef.body.append(link);
  link.click();
  link.remove();
  urlRef.revokeObjectURL(href);
}
