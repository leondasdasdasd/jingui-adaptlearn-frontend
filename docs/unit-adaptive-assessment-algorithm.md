# 单元自适应前测算法方案

> 状态：后端待实现。当前前端只生成并展示单元测试的内容规划，不生成真实题目，不写入学生掌握度。

## 1. 目标与边界

单元测试是一个覆盖章节全部知识点的测试内容集合，不是试卷对象。它不包含试卷总分、答题卡、固定题序或发布流程。算法可复用单知识点前测的作答判定与掌握度更新能力，但选题范围从单知识点扩展为整个单元，并允许一道题同时提供多个知识点的证据。

完成单元前测必须同时满足：

- 单元知识点覆盖率为 100%。
- 每个知识点的掌握度不低于 90%。
- 每个单元主知识点锚点至少有 2 道有效题目提供证据；其他知识点可作为次知识点被混合题覆盖。
- 连续答错 3 题的知识点直接判定为“不会”，不再继续消耗该知识点的诊断题量。

“判定不会”属于有效完成状态，因此单元测试可以高效结束；但“完成 100% 的单元前测”不等于所有知识点都掌握。最终结果必须分别返回已掌握、不会和证据不足的知识点。

## 2. 输入合同

```ts
interface UnitAssessmentPlanRequest {
  unitId: string;
  mode: "unit_test" | "unit_pre_assessment";
  knowledgePoints: Array<{
    id: string;
    name: string;
    prerequisiteIds: string[];
    importance: "primary" | "supporting";
  }>;
  constraints: {
    requiredCoverage: 100;
    masteryThreshold: 0.9;
    minimumQuestionsPerPrimaryPoint: 2;
    consecutiveWrongLimit: 3;
  };
}
```

章节目录是知识点范围的权威来源。题库检索只能在这个集合内建立知识点关联，不能通过题目标签把单元外知识点追加到完成条件中。

## 3. 题目与证据合同

```ts
interface UnitAssessmentQuestionCandidate {
  questionId: string;
  primaryKnowledgePointId: string;
  evidence: Array<{
    knowledgePointId: string;
    weight: number; // 同一道题内合计为 1
    requiredStepIds: string[];
  }>;
  difficulty: "D1" | "D2" | "D3" | "D4" | "D5";
  questionType: string;
  qualityScore: number;
}
```

一道多知识点题必须指定唯一主知识点。只有完整命中该知识点必要解题步骤的作答，才能为关联知识点增加正向证据；最终答案正确但相关步骤缺失时，不得把所有关联知识点一起判为掌握。错误证据只归因到可识别的错误步骤；无法归因时只更新主知识点，避免一次错误污染多个知识点。

## 4. 知识点运行状态

```ts
type PointStatus = "unseen" | "probing" | "mastered" | "not_mastered";

interface KnowledgePointAssessmentState {
  knowledgePointId: string;
  status: PointStatus;
  masteryProbability: number;
  attemptedCount: number;
  primaryEvidenceCount: number;
  consecutiveWrongCount: number;
  lastAssessedAt: string | null;
}
```

后端为每个知识点独立维护状态。多知识点题会向多个状态写入证据，但只能增加主知识点的 `primaryEvidenceCount`。

## 5. 选题策略

每轮只通过一个权威选题器产生下一题：

1. 优先选择仍为 `unseen` 的主知识点，先完成 100% 首轮覆盖。
2. 再选择主证据少于 2 道、且未被判定为不会的知识点。
3. 再选择掌握度低于 90%、且仍有信息增益空间的知识点。
4. 候选题优先覆盖 2 至 3 个当前未完成知识点；质量和区分度相近时，选择预计单位作答时间更短的题。
5. 某知识点答错后，将它移到待测队列后部，下一题优先测试其他未完成知识点。
6. 只有其他知识点完成一轮或没有合格候选题时，才重新回到刚答错的知识点。
7. 某知识点连续错 3 题，立即标记 `not_mastered`，停止继续推送以它为主知识点的题。

切换知识点不是忽略错误。错误仍更新掌握度和连续错误计数，只是不在同一个薄弱点上连续耗题。

## 6. 掌握度更新

建议复用现有前测的贝叶斯或 IRT 更新器，输入增加知识点证据权重：

```text
effectiveEvidence = correctness × stepEvidence × knowledgeWeight
newMastery = update(previousMastery, difficulty, effectiveEvidence)
```

- 完全正确：按题目证据权重为已命中的知识点增加正向证据。
- 部分正确：按步骤命中率拆分证据，不把整题粗暴映射成 0 或 1。
- 完全错误：更新可归因知识点；不可归因时只更新主知识点。
- 猜测风险高或题目质量不足：降低证据权重，必要时不计入达标证据数。

知识点达到 90% 且主证据题数不少于 2 后标记 `mastered`。后续多知识点题可以携带该知识点，但不再为了它单独选题。

## 7. 完成条件

### 单元测试内容

内容规划严格分两步：先生成单元认知矩阵，再用矩阵格、主/次知识点组合、题型和难度生成插槽。每个课时或教材显式标记的主知识点作为锚点至少进入 2 个插槽；其余知识点不要求各自成为主知识点，但必须至少作为次知识点进入一个混合插槽。这样避免把 N 个知识点机械扩张成 2N 道题。

综合内容与单元内容复用同一套矩阵、插槽和题目结构；唯一业务差异是综合内容可以同时拥有学习内容，单元测试不生成学习内容。两者共用知识点覆盖查询，查询结果按知识点返回主知识点题数、次知识点题数以及 D1-D5 难度题数。

### 单元前测运行

运行完成条件：每个知识点都处于 `mastered` 或 `not_mastered`，且所有知识点至少被有效测到一次。若存在 `unseen`、`probing` 或证据不足的知识点，前测不能返回 100% 完成。

只有所有知识点均为 `mastered` 时，才返回“单元已掌握”。存在 `not_mastered` 时仍可返回“前测已完成”，同时给出后续学习清单。

## 8. 核心伪代码

```text
while not every point is mastered or not_mastered:
  candidates = points where status is unseen
  if candidates is empty:
    candidates = points where primaryEvidenceCount < 2 and status != not_mastered
  if candidates is empty:
    candidates = points where masteryProbability < 0.9 and status != not_mastered

  target = rotate_after_recent_error(candidates)
  question = select_high_information_multi_point_question(target, candidates)
  answer = present_and_grade(question)

  update_attributed_evidence(question, answer)
  for each attributed point:
    if answer is wrong for point:
      point.consecutiveWrongCount += 1
      move point to the back of pending queue
    else:
      point.consecutiveWrongCount = 0

    if point.consecutiveWrongCount >= 3:
      point.status = not_mastered
    else if point.masteryProbability >= 0.9 and point.primaryEvidenceCount >= 2:
      point.status = mastered
    else:
      point.status = probing
```

## 9. 运行事件与响应

每次作答后返回完整进度快照，前端不自行推断知识点状态：

```ts
interface UnitAssessmentProgress {
  unitId: string;
  completionRate: number;
  coverageRate: number;
  currentQuestionId: string | null;
  knowledgePointStates: KnowledgePointAssessmentState[];
  nextAction: "continue" | "complete" | "insufficient_candidates";
}
```

当题库无法满足多知识点题或最少主证据数时，返回 `insufficient_candidates` 和缺口知识点 ID；不得降低覆盖标准后静默完成。

## 10. 验收样例

- 6 个知识点均至少作为主知识点出现 2 次，内容规划为 12 个或更多题目槽。
- A 知识点首题答错后，下一题主知识点切换到 B，而不是继续推 A。
- A 在后续轮次累计连续错 3 题后被标记为不会，不再出现以 A 为主的题。
- 一道同时覆盖 B、C 的题只有 B 的必要步骤正确时，只给 B 正向证据。
- 所有知识点首次有效作答前，完成率不能为 100%。
- 所有知识点达到 90% 且主证据数达标时，单元前测结果为“完成且已掌握”。
- 部分知识点连续错 3 题时，结果可为“前测完成”，但必须显示这些知识点未掌握并进入后续学习。
