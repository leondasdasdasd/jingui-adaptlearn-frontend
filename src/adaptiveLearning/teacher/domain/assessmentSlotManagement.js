/**
 *
 * @param values
 */
function uniqueIds(values) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  ];
}

/**
 *
 * @param source
 */
function normalizedAssessmentQuestionSource(source) {
  return {
    ...source,
    kind: String(source?.kind ?? "").trim(),
    questionId: String(source?.questionId ?? "").trim(),
  };
}

/**
 *
 * @param source
 */
export function assessmentQuestionSourceKey(source) {
  const { kind, questionId } = normalizedAssessmentQuestionSource(source);
  if (!kind || !questionId) return "";
  return `${kind}:${questionId}`;
}

/**
 * 题目归属只有一个权威字段，重新分配会原子覆盖旧插槽。
 * @param root0
 * @param root0.questions
 * @param root0.slots
 * @param root0.questionId
 * @param root0.slotId
 */
export function assignQuestionToAssessmentSlot({
  questions,
  slots,
  questionId,
  slotId,
}) {
  if (!slots.some((slot) => String(slot.id) === String(slotId))) {
    throw new Error("目标题目插槽不存在");
  }
  let found = false;
  const next = questions.map((question) => {
    if (String(question.id) !== String(questionId)) return question;
    found = true;
    const slot = slots.find((item) => String(item.id) === String(slotId));
    return {
      ...question,
      blueprintSlotId: String(slot.id),
      assessmentPolicyId:
        slot.assessmentPolicyId || question.assessmentPolicyId || "",
      matrixCellId: slot.matrixCellId || question.matrixCellId || "",
      matrixCellIds: slot.matrixCellId ? [slot.matrixCellId] : [],
      knowledgePointIds: uniqueIds(slot.knowledgePointIds),
    };
  });
  if (!found) throw new Error("题目不存在");
  return next;
}

/**
 *
 * @param questions
 * @param questionId
 */
export function removeQuestionFromAssessmentSlot(questions, questionId) {
  return questions.map((question) =>
    String(question.id) === String(questionId)
      ? {
          ...question,
          blueprintSlotId: null,
          matrixCellId: "",
          matrixCellIds: [],
        }
      : question,
  );
}

/**
 * 导入题目保存不可变快照和来源，并在同一课时按来源去重。
 * @param root0
 * @param root0.questions
 * @param root0.snapshot
 * @param root0.source
 * @param root0.slot
 */
export function appendImportedQuestionSnapshot({
  questions,
  snapshot,
  source,
  slot,
}) {
  const normalizedSource = normalizedAssessmentQuestionSource(source);
  const identity = assessmentQuestionSourceKey(normalizedSource);
  if (!identity) throw new Error("导入题目缺少来源标识");
  if (
    questions.some(
      (question) => assessmentQuestionSourceKey(question.source) === identity,
    )
  ) {
    const error = new Error("该题已加入当前课时");
    error.code = "DUPLICATE_IMPORTED_QUESTION";
    throw error;
  }
  const question = {
    ...snapshot,
    id: String(
      snapshot.id || `${normalizedSource.kind}-${normalizedSource.questionId}`,
    ),
    source: normalizedSource,
    blueprintSlotId: slot ? String(slot.id) : null,
    assessmentPolicyId: slot?.assessmentPolicyId || "",
    matrixCellId: slot?.matrixCellId || "",
    matrixCellIds: slot?.matrixCellId ? [slot.matrixCellId] : [],
    knowledgePointIds: uniqueIds(slot?.knowledgePointIds),
  };
  return [...questions, question];
}

/**
 * 综合插槽按当前已归槽题目的覆盖量补缺。未归槽题目不会进入统计；
 * 多知识点课时让每个综合插槽至少覆盖两个知识点，并保证全集被覆盖。
 * @param root0
 * @param root0.slots
 * @param root0.knowledgePointIds
 * @param root0.questions
 */
export function distributeCompositeSlotKnowledgePoints({
  slots,
  knowledgePointIds,
  questions = [],
}) {
  const ids = uniqueIds(knowledgePointIds);
  if (ids.length === 0) return slots;
  const slotIdSet = new Set(slots.map((slot) => String(slot.id)));
  const coverage = new Map(ids.map((id) => [id, 0]));
  for (const question of questions) {
    if (
      !question.blueprintSlotId ||
      !slotIdSet.has(String(question.blueprintSlotId))
    ) {
      continue;
    }
    for (const id of uniqueIds(question.knowledgePointIds)) {
      if (coverage.has(id)) coverage.set(id, coverage.get(id) + 1);
    }
  }
  return slots.map((slot, index) => {
    const requested = Math.min(ids.length, ids.length > 1 ? 2 : 1);
    const selected = uniqueIds(slot.knowledgePointIds).filter((id) =>
      coverage.has(id),
    );
    while (selected.length < requested) {
      const candidate = [...ids]
        .sort(
          (left, right) =>
            coverage.get(left) - coverage.get(right) ||
            ((ids.indexOf(left) - index + ids.length) % ids.length) -
              ((ids.indexOf(right) - index + ids.length) % ids.length),
        )
        .find((id) => !selected.includes(id));
      if (!candidate) break;
      selected.push(candidate);
    }
    for (const id of selected) coverage.set(id, coverage.get(id) + 1);
    return { ...slot, knowledgePointIds: selected };
  });
}
