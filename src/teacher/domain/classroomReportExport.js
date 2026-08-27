function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function percent(value) {
  return value == null || !Number.isFinite(Number(value)) ? '' : `${Math.round(Number(value))}%`;
}

export function buildClassroomReportCsv(students, knowledgeRows) {
  const rows = [
    ['学生', '有效学习时间（分钟）', '作答数', '正确率', '掌握率', '置信度', '证据状态', '结论'],
  ];
  students.forEach((student) => {
    const score = student.report?.score;
    const determined = (student.report?.masteryResults || [])
      .filter((item) => item.status === 'DETERMINED' && item.mastery != null);
    const mastery = determined.length
      ? determined.reduce((sum, item) => sum + Number(item.mastery), 0) / determined.length
      : null;
    const confidence = determined.length
      ? determined.reduce((sum, item) => sum + (Number(item.confidence) <= 1
        ? Number(item.confidence) * 100 : Number(item.confidence)), 0) / determined.length
      : null;
    rows.push([
      student.name, student.learningMinutes, student.questionCount, percent(student.accuracy),
      percent(mastery), percent(confidence), score?.status || 'WAITING', score?.summary || '',
    ]);
  });
  rows.push([], ['知识点', '平均掌握率', '平均置信度', '有效证据', '暂无法判断人数']);
  knowledgeRows.forEach((item) => rows.push([
    item.name, percent(item.averageMastery), percent(item.averageConfidence), item.evidence, item.unknown,
  ]));
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

export function downloadClassroomReportCsv({ students, knowledgeRows, filename, documentRef = document, urlRef = URL }) {
  const blob = new Blob([buildClassroomReportCsv(students, knowledgeRows)], { type: 'text/csv;charset=utf-8' });
  const href = urlRef.createObjectURL(blob);
  const link = documentRef.createElement('a');
  link.href = href;
  link.download = filename;
  documentRef.body.appendChild(link);
  link.click();
  link.remove();
  urlRef.revokeObjectURL(href);
}
