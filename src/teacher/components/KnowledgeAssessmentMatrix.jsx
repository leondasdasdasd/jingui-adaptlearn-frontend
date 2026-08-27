import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Grid3X3, Link2 } from 'lucide-react';
import './KnowledgeAssessmentMatrix.css';

const DOMAINS = [
  { id: 'CR', label: '概念与符号' },
  { id: 'PJ', label: '程序、推理与论证' },
  { id: 'M', label: '模型与不变结构' },
  { id: 'SF', label: '总结、交流与反思' },
];

const LEVELS = [
  { id: 'A', label: '识别与再现' },
  { id: 'B', label: '理解与转换' },
  { id: 'C', label: '选择与执行' },
  { id: 'D', label: '关联与论证' },
  { id: 'E', label: '迁移与建构' },
];

const ROLE_META = {
  CORE: { label: '核心', className: 'core' },
  SUPPORT: { label: '支撑', className: 'support' },
  EXTENSION: { label: '拓展', className: 'extension' },
  NOT_APPLICABLE: { label: '不适用', className: 'not-applicable' },
};

const QUESTION_TYPE_LABELS = {
  single_choice: '单选题',
  multiple_choice: '多选题',
  fill_blank: '填空题',
  short_answer: '问答题',
  judgement: '判断题',
  ordering: '排序题',
  classification: '分类题',
  matching: '匹配题',
  line_connect: '连线题',
  text_marker: '文本标记题',
  word_builder: '组式题',
};

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function normalizedRole(role) {
  const value = String(role || '').trim().toUpperCase();
  if (['CORE', 'SUPPORT', 'EXTENSION', 'NOT_APPLICABLE'].includes(value)) return value;
  if (['NA', 'N/A', 'NONE'].includes(value)) return 'NOT_APPLICABLE';
  return 'SUPPORT';
}

function normalizeCell(cell, knowledgePointId) {
  const domain = String(cell?.domain || '').toUpperCase();
  const level = String(cell?.targetLevel || cell?.level || '').toUpperCase();
  if (!DOMAINS.some((item) => item.id === domain) || !LEVELS.some((item) => item.id === level)) return null;
  return {
    ...cell,
    cellId: String(cell.cellId || cell.matrixCellId || `${knowledgePointId}:${domain}:${level}`),
    domain,
    level,
    role: normalizedRole(cell.role || cell.applicability),
    observableBehavior: String(cell.observableBehavior || cell.targetBehavior || '').trim(),
    evidenceCriteria: list(cell.evidenceCriteria || cell.evidence),
    commonMisconceptions: list(cell.commonMisconceptions || cell.misconceptions),
    recommendedQuestionTypes: list(cell.recommendedQuestionTypes || cell.questionTypes),
    minimumIndependentEvidence: Math.max(0, Number(cell.minimumIndependentEvidence || cell.minimumEvidence || 0)),
  };
}

function normalizeMatrices(assessmentMatrices, knowledgePoints) {
  const source = Array.isArray(assessmentMatrices)
    ? assessmentMatrices
    : Object.entries(assessmentMatrices || {}).map(([knowledgePointId, matrix]) => ({
        ...(matrix || {}),
        knowledgePointId: matrix?.knowledgePointId || knowledgePointId,
      }));
  const byKnowledgePoint = new Map(source.map((matrix) => [
    String(matrix?.knowledgePointId || matrix?.knowledgeObjectiveId || matrix?.id || ''),
    matrix,
  ]));
  return knowledgePoints.map((knowledgePoint) => {
    const matrix = byKnowledgePoint.get(String(knowledgePoint.id)) || {};
    return {
      ...matrix,
      knowledgePointId: knowledgePoint.id,
      knowledgePointName: knowledgePoint.name,
      cells: list(matrix.cells).map((cell) => normalizeCell(cell, knowledgePoint.id)).filter(Boolean),
    };
  });
}

function questionCellIds(question) {
  return new Set([
    question?.matrixCellId,
    question?.assessmentMatrixCellId,
    question?.blueprint?.matrixCellId,
    ...list(question?.matrixCellIds),
  ].filter(Boolean).map(String));
}

function coverageByCell(questions) {
  const result = new Map();
  questions.forEach((question, index) => {
    questionCellIds(question).forEach((cellId) => {
      if (!result.has(cellId)) result.set(cellId, []);
      result.get(cellId).push({ ...question, displayNumber: index + 1 });
    });
  });
  return result;
}

function CellDetail({ cell, questions }) {
  const domain = DOMAINS.find((item) => item.id === cell.domain);
  const level = LEVELS.find((item) => item.id === cell.level);
  const role = ROLE_META[cell.role];
  return (
    <section className="assessment-matrix-detail" aria-live="polite">
      <header>
        <div className="assessment-matrix-detail-title">
          <span className={`assessment-role-tag ${role.className}`}>{role.label}</span>
          <div>
            <strong>{`${cell.domain}-${cell.level} · ${domain.label} / ${level.label}`}</strong>
            <code>{cell.cellId}</code>
          </div>
        </div>
        <span className="assessment-matrix-evidence-count">
          <CheckCircle2 size={15} aria-hidden="true" />
          {`${questions.length} / ${cell.minimumIndependentEvidence || 0} 条题目证据`}
        </span>
      </header>

      <div className="assessment-matrix-detail-grid">
        <div className="assessment-matrix-detail-main">
          <section>
            <h4>目标行为</h4>
            <p>{cell.observableBehavior || '尚未填写目标行为'}</p>
          </section>
          <section>
            <h4>证据标准</h4>
            {cell.evidenceCriteria.length ? (
              <ul>{cell.evidenceCriteria.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
            ) : <p className="assessment-matrix-empty-copy">尚未填写证据标准</p>}
          </section>
          {cell.commonMisconceptions.length > 0 && (
            <section>
              <h4>常见误区</h4>
              <ul>{cell.commonMisconceptions.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
            </section>
          )}
        </div>
        <aside>
          <section>
            <h4>建议题型</h4>
            <div className="assessment-matrix-type-list">
              {cell.recommendedQuestionTypes.length
                ? cell.recommendedQuestionTypes.map((type) => <span key={type}>{QUESTION_TYPE_LABELS[type] || type}</span>)
                : <span>未指定</span>}
            </div>
          </section>
          <section>
            <h4>关联题目</h4>
            {questions.length ? (
              <ol className="assessment-matrix-question-list">
                {questions.map((question) => (
                  <li key={question.id || `${cell.cellId}-${question.displayNumber}`}>
                    <span>{question.displayNumber}</span>
                    <p>{question.stem || '未命名题目'}</p>
                    <small>{QUESTION_TYPE_LABELS[question.type] || question.type || '题目'}</small>
                  </li>
                ))}
              </ol>
            ) : <p className="assessment-matrix-empty-copy">暂无关联题目</p>}
          </section>
        </aside>
      </div>
    </section>
  );
}

export default function KnowledgeAssessmentMatrix({ assessmentMatrices, knowledgePoints = [], questions = [] }) {
  const matrices = useMemo(
    () => normalizeMatrices(assessmentMatrices, knowledgePoints),
    [assessmentMatrices, knowledgePoints],
  );
  const coverage = useMemo(() => coverageByCell(questions), [questions]);
  const [selectedKnowledgePointId, setSelectedKnowledgePointId] = useState(() => knowledgePoints[0]?.id || '');
  const selectedMatrix = matrices.find((matrix) => matrix.knowledgePointId === selectedKnowledgePointId) || matrices[0];
  const firstApplicableCellId = selectedMatrix?.cells.find((cell) => cell.role !== 'NOT_APPLICABLE')?.cellId || '';
  const [selectedCellId, setSelectedCellId] = useState(firstApplicableCellId);

  useEffect(() => {
    if (!matrices.some((matrix) => matrix.knowledgePointId === selectedKnowledgePointId)) {
      setSelectedKnowledgePointId(matrices[0]?.knowledgePointId || '');
    }
  }, [matrices, selectedKnowledgePointId]);

  useEffect(() => {
    const currentExists = selectedMatrix?.cells.some((cell) => cell.cellId === selectedCellId && cell.role !== 'NOT_APPLICABLE');
    if (!currentExists) setSelectedCellId(firstApplicableCellId);
  }, [firstApplicableCellId, selectedCellId, selectedMatrix]);

  if (!knowledgePoints.length) return null;

  const cellsByCoordinate = new Map((selectedMatrix?.cells || []).map((cell) => [`${cell.domain}:${cell.level}`, cell]));
  const applicableCells = (selectedMatrix?.cells || []).filter((cell) => cell.role !== 'NOT_APPLICABLE');
  const selectedCell = applicableCells.find((cell) => cell.cellId === selectedCellId) || applicableCells[0] || null;
  const evidenceSatisfiedCells = applicableCells.filter((cell) => (
    (coverage.get(cell.cellId) || []).length >= cell.minimumIndependentEvidence
  )).length;
  const coreCells = applicableCells.filter((cell) => cell.role === 'CORE').length;
  const hasGeneratedMatrix = (selectedMatrix?.cells || []).length > 0;
  const moveKnowledgePointFocus = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = Math.max(0, matrices.findIndex((matrix) => matrix.knowledgePointId === selectedMatrix?.knowledgePointId));
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? matrices.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + matrices.length) % matrices.length;
    setSelectedKnowledgePointId(matrices[nextIndex].knowledgePointId);
    event.currentTarget.querySelectorAll('[role="tab"]')[nextIndex]?.focus();
  };

  return (
    <section className="knowledge-assessment-matrix" aria-labelledby="assessment-matrix-title">
      <header className="assessment-matrix-header">
        <div>
          <span className="assessment-matrix-icon"><Grid3X3 size={17} aria-hidden="true" /></span>
          <div>
            <h2 id="assessment-matrix-title">知识点评估矩阵</h2>
            <p>{hasGeneratedMatrix
              ? `${applicableCells.length} 个适用格 · ${coreCells} 个核心格 · ${selectedMatrix.generationSource === 'SERVER_FALLBACK' ? '系统保底' : '豆包生成'} · ${selectedMatrix.reviewStatus === 'APPROVED' ? '已确认' : '待发布确认'}`
              : '当前知识点尚未生成评估矩阵'}</p>
          </div>
        </div>
        {hasGeneratedMatrix && (
          <div className="assessment-matrix-coverage-summary" aria-label={`${evidenceSatisfiedCells} 个适用格达到最低题目证据要求，共 ${applicableCells.length} 个`}>
            <span>证据达标</span>
            <strong>{evidenceSatisfiedCells}<small>{` / ${applicableCells.length}`}</small></strong>
          </div>
        )}
      </header>

      <div className="assessment-matrix-kp-tabs" role="tablist" aria-label="选择知识点" onKeyDown={moveKnowledgePointFocus}>
        {matrices.map((matrix) => (
          <button
            id={`matrix-kp-tab-${matrix.knowledgePointId}`}
            key={matrix.knowledgePointId}
            type="button"
            role="tab"
            aria-selected={matrix.knowledgePointId === selectedMatrix?.knowledgePointId}
            aria-controls="assessment-matrix-panel"
            tabIndex={matrix.knowledgePointId === selectedMatrix?.knowledgePointId ? 0 : -1}
            onClick={() => setSelectedKnowledgePointId(matrix.knowledgePointId)}
          >
            <strong>{matrix.knowledgePointName}</strong>
            <span>{matrix.cells.length ? `${matrix.cells.filter((cell) => cell.role !== 'NOT_APPLICABLE').length} 个适用格` : '待生成'}</span>
          </button>
        ))}
      </div>

      <div
        id="assessment-matrix-panel"
        className="assessment-matrix-panel"
        role="tabpanel"
        aria-labelledby={`matrix-kp-tab-${selectedMatrix?.knowledgePointId}`}
      >
        {hasGeneratedMatrix ? (
          <>
            {(selectedMatrix.targetStatement || selectedMatrix.rationale) && (
              <div className="assessment-matrix-context">
                <div><strong>评估目标</strong><p>{selectedMatrix.targetStatement || '—'}</p></div>
                <div><strong>矩阵取舍</strong><p>{selectedMatrix.rationale || '—'}</p></div>
              </div>
            )}
            <div className="assessment-matrix-legend" aria-label="矩阵角色图例">
              {Object.entries(ROLE_META).map(([role, meta]) => (
                <span key={role}><i className={meta.className} aria-hidden="true" />{meta.label}</span>
              ))}
            </div>
            <div className="assessment-matrix-table-scroll" tabIndex={0} aria-label="评估矩阵，可横向滚动">
              <table className="assessment-matrix-table">
                <thead>
                  <tr>
                    <th scope="col">领域</th>
                    {LEVELS.map((level) => <th key={level.id} scope="col"><strong>{level.id}</strong><span>{level.label}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {DOMAINS.map((domain) => (
                    <tr key={domain.id}>
                      <th scope="row"><strong>{domain.id}</strong><span>{domain.label}</span></th>
                      {LEVELS.map((level) => {
                        const cell = cellsByCoordinate.get(`${domain.id}:${level.id}`);
                        const role = ROLE_META[cell?.role || 'NOT_APPLICABLE'];
                        const cellQuestions = cell ? coverage.get(cell.cellId) || [] : [];
                        if (!cell || cell.role === 'NOT_APPLICABLE') {
                          return <td key={level.id}><div className="assessment-matrix-cell not-applicable" aria-label={`${domain.id}-${level.id} 不适用`}><span>—</span><small>不适用</small></div></td>;
                        }
                        return (
                          <td key={level.id}>
                            <button
                              type="button"
                              className={`assessment-matrix-cell ${role.className}${selectedCell?.cellId === cell.cellId ? ' selected' : ''}`}
                              aria-pressed={selectedCell?.cellId === cell.cellId}
                              aria-label={`${cell.domain}-${cell.level} ${role.label}，关联 ${cellQuestions.length} 道题`}
                              onClick={() => setSelectedCellId(cell.cellId)}
                            >
                              <strong>{`${cell.domain}-${cell.level}`}</strong>
                              <span>{role.label}</span>
                              <small><Link2 size={12} aria-hidden="true" />{cellQuestions.length}</small>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedCell && <CellDetail cell={selectedCell} questions={coverage.get(selectedCell.cellId) || []} />}
          </>
        ) : (
          <div className="assessment-matrix-empty" role="status">
            <Grid3X3 size={24} aria-hidden="true" />
            <strong>尚未生成评估矩阵</strong>
            <span>完成整课生成后将在此显示该知识点的适用格与题目覆盖。</span>
          </div>
        )}
      </div>
    </section>
  );
}
