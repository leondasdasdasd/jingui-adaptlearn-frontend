import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Save, Star, Trash2, X } from 'lucide-react';
import { QuestionContentEditor, QuestionPreview } from '@yungu-fed/question-editor';
import {
  canUseQuestionPlatformEditor,
  createQuestionPlatformDraft,
  readQuestionPlatformDraft,
} from '../shared/question-platform/legacyQuestionAdapter';
import { getQuestionPlatformTemplate } from '../shared/question-platform/questionContract';
import { knowledgeEvidenceProfile } from '../shared/domain/questionEvidence';
import { choiceLayoutClassName } from '../shared/question-platform/choiceLayout';
import MathContent from './MathContent';
import QuestionReferenceAnswer from './QuestionReferenceAnswer';

const typeLabels = {
  single_choice: '单选题',
  multiple_choice: '多选题',
  fill_blank: '题干内填空',
  short_answer: '问答题',
  judgement: '判断题',
  ordering: '排序题',
  classification: '分类题', matching: '匹配题', line_connect: '连线题',
  text_marker: '文本标记题', word_builder: '组式题',
};
const difficultyLabels = {
  1: 'D1 基础识别', 2: 'D2 直接理解', 3: 'D3 标准应用', 4: 'D4 变式综合', 5: 'D5 迁移应用',
  D1: 'D1 基础识别', D2: 'D2 直接理解', D3: 'D3 标准应用', D4: 'D4 变式综合', D5: 'D5 迁移应用',
};

const structuredArrayAnswerTypes = new Set([
  'multiple_choice', 'ordering', 'matching', 'line_connect', 'text_marker',
]);
const structuredObjectAnswerTypes = new Set(['classification', 'word_builder']);

function hasReferenceAnswer(question) {
  const answer = question?.answer;
  if (structuredArrayAnswerTypes.has(question?.type)) {
    return Array.isArray(answer) && answer.length > 0;
  }
  if (structuredObjectAnswerTypes.has(question?.type)) {
    return Boolean(answer) && !Array.isArray(answer) && typeof answer === 'object'
      && Object.keys(answer).length > 0;
  }
  if (Array.isArray(answer)) return answer.some((item) => String(item ?? '').trim());
  return typeof answer === 'boolean' || Boolean(String(answer ?? '').trim());
}

function emptyAnswerForType(type) {
  if (structuredArrayAnswerTypes.has(type)) return [];
  if (structuredObjectAnswerTypes.has(type)) return {};
  return '';
}

function resetTypeSpecificFields(question, type) {
  return {
    ...question,
    type,
    answer: emptyAnswerForType(type),
    options: ['single_choice', 'multiple_choice', 'ordering'].includes(type)
      ? question.options || []
      : [],
    categories: type === 'classification' ? [] : undefined,
    items: type === 'classification' ? [] : undefined,
    columns: ['matching', 'line_connect'].includes(type) ? [] : undefined,
    segments: type === 'text_marker' ? [] : undefined,
    template: type === 'word_builder' ? '' : undefined,
    candidateOptions: type === 'word_builder' ? [] : undefined,
    platformQuestion: null,
  };
}

function PlatformQuestionPreview({ question, showAnswer }) {
  const isChoiceQuestion = ['single_choice', 'multiple_choice'].includes(question.type);
  const value = useMemo(() => createQuestionPlatformDraft(question), [question]);
  const questionTypeTemplates = useMemo(
    () => [getQuestionPlatformTemplate(question.type)],
    [question.type],
  );
  const mathRenderKey = useMemo(() => JSON.stringify([
    question.id, question.stem, question.options, question.answer, question.platformQuestion, showAnswer,
  ]), [question, showAnswer]);
  return (
    <>
      <MathContent as="div" renderKey={mathRenderKey}>
        <QuestionPreview
          className="teacher-question-platform-preview"
          locale="zh-CN"
          questionTypeTemplates={questionTypeTemplates}
          showAnswer={showAnswer && !isChoiceQuestion}
          showExtraAttributes={showAnswer && question.type === 'short_answer'}
          value={value}
        />
      </MathContent>
      {showAnswer && isChoiceQuestion && <QuestionReferenceAnswer
        question={question}
        correctAnswer={question.answer}
        correctAnswerText={Array.isArray(question.answer) ? question.answer.join('、') : String(question.answer || '—')}
        analysis={question.analysis}
      />}
      {showAnswer && question.analysis && question.type !== 'short_answer' && !isChoiceQuestion && (
        <MathContent as="small" className="teacher-question-analysis" renderKey={question.analysis}>
          <b>参考解析：</b>{question.analysis}
        </MathContent>
      )}
    </>
  );
}

function ReadonlyQuestionPreview({ question, showAnswer }) {
  if (canUseQuestionPlatformEditor(question)) {
    return <PlatformQuestionPreview question={question} showAnswer={showAnswer} />;
  }
  return (
    <div className="teacher-question-fallback-preview">
      <MathContent as="strong" renderKey={question.stem}>{question.stem}</MathContent>
      {showAnswer && <QuestionReferenceAnswer
        question={question}
        correctAnswer={question.answer}
        correctAnswerText={Array.isArray(question.answer) ? question.answer.join('、') : String(question.answer || '—')}
        analysis={question.analysis}
      />}
    </div>
  );
}

function emptyQuestion(mode, knowledgePointId) {
  return {
    id: `teacher-question-${Date.now()}`,
    purpose: mode === 'pre' ? 'pre' : 'post',
    phase: mode === 'pre' ? 'diagnostic' : 'knowledge',
    type: 'single_choice',
    difficulty: 2,
    stem: '',
    options: [
      { id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' },
    ],
    answer: 'A',
    acceptableAnswers: [],
    analysis: '',
    maxScore: 2,
    rubric: [],
    knowledgePointIds: knowledgePointId ? [knowledgePointId] : [],
    primaryKnowledgePointId: knowledgePointId || '',
    knowledgePointWeights: knowledgePointId ? { [knowledgePointId]: 1 } : {},
  };
}

function optionsText(question) {
  return (question.options || []).map((option) => `${option.id}. ${option.text}`).join('\n');
}

function parseOptions(text) {
  return text.split('\n').map((line, index) => {
    const match = line.trim().match(/^([A-D])[.、．:]?\s*(.*)$/i);
    return { id: (match?.[1] || ['A', 'B', 'C', 'D'][index] || String(index + 1)).toUpperCase(), text: match?.[2] || line.trim() };
  }).filter((item) => item.text).slice(0, 4);
}

export default function TeacherQuestionReview({
  mode,
  questions,
  knowledgePoints,
  onChange,
  initialScope,
  disabled = false,
}) {
  const isReviewPool = initialScope === 'review';
  const [selectedKp, setSelectedKp] = useState(initialScope || (mode === 'practice' ? knowledgePoints[0]?.id || 'all' : 'all'));
  const [editing, setEditing] = useState(null);
  const [expandedQuestionIds, setExpandedQuestionIds] = useState(() => new Set());
  const [optionDraft, setOptionDraft] = useState('');
  const [platformDraft, setPlatformDraft] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const editingId = editing?.id;
  const dialogTitleId = useId();
  const questionTabsId = useId();
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const knowledgePointTabRefs = useRef([]);
  const visible = useMemo(() => questions.filter((item) => {
    if (selectedKp === 'all') return true;
    if (selectedKp === 'review') return item.phase === 'review';
    return item.phase !== 'review' && item.knowledgePointIds?.includes(selectedKp);
  }), [questions, selectedKp]);
  const visibleDifficultyCounts = useMemo(() => ({
    1: visible.filter((item) => Number(item.difficulty) === 1 || item.difficulty === 'D1').length,
    2: visible.filter((item) => Number(item.difficulty) === 2 || item.difficulty === 'D2').length,
    3: visible.filter((item) => Number(item.difficulty) === 3 || item.difficulty === 'D3').length,
    4: visible.filter((item) => Number(item.difficulty) === 4 || item.difficulty === 'D4').length,
    5: visible.filter((item) => Number(item.difficulty) === 5 || item.difficulty === 'D5').length,
  }), [visible]);
  const visibleApplicationCount = useMemo(
    () => visible.filter((item) => item.taskCategory === 'application').length,
    [visible],
  );
  const visibleApplicationRange = useMemo(() => {
    const publishablePoolSize = Math.max(15, visible.length);
    return {
      minimum: Math.ceil(publishablePoolSize * 0.45),
      maximum: Math.floor(publishablePoolSize * 0.6),
    };
  }, [visible.length]);
  const selectedKnowledgePointIndex = knowledgePoints.findIndex((kp) => kp.id === selectedKp);
  const selectedKnowledgePointTabId = selectedKnowledgePointIndex >= 0
    ? `${questionTabsId}-tab-${selectedKnowledgePointIndex}`
    : undefined;

  const openEditor = (question) => {
    if (disabled) return;
    openerRef.current = document.activeElement;
    const fallbackKnowledgePointId = selectedKp === 'all' || selectedKp === 'review' ? knowledgePoints[0]?.id : selectedKp;
    const value = question || {
      ...emptyQuestion(mode, fallbackKnowledgePointId),
      ...(isReviewPool ? {
        phase: 'review',
        knowledgePointIds: knowledgePoints.map((knowledgePoint) => knowledgePoint.id),
        primaryKnowledgePointId: knowledgePoints[0]?.id,
      } : {}),
    };
    setEditing({ ...value });
    setOptionDraft(optionsText(value));
    setPlatformDraft(canUseQuestionPlatformEditor(value) ? createQuestionPlatformDraft(value) : null);
    setValidationErrors({});
  };

  const closeEditor = useCallback(() => {
    setEditing(null);
    setPlatformDraft(null);
    setValidationErrors({});
    window.setTimeout(() => openerRef.current?.focus?.(), 0);
  }, []);

  useEffect(() => {
    if (disabled && editingId) closeEditor();
  }, [closeEditor, disabled, editingId]);

  useEffect(() => {
    if (!editingId) return undefined;
    const dialog = dialogRef.current;
    window.setTimeout(() => dialog?.querySelector('textarea, select, input, [contenteditable="true"]')?.focus(), 0);
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeEditor();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeEditor, editingId]);

  const saveQuestion = () => {
    if (disabled) return;
    const platformContent = platformDraft && canUseQuestionPlatformEditor(editing)
      ? readQuestionPlatformDraft(platformDraft, editing.type, editing)
      : null;
    const content = platformContent ? { ...editing, ...platformContent } : editing;
    const nextErrors = {};
    if (!String(content?.stem || '').trim()) nextErrors.stem = '请输入题干';
    if (!hasReferenceAnswer(content)) nextErrors.answer = '请输入参考答案';
    if (['single_choice', 'multiple_choice'].includes(content?.type) && !platformContent && parseOptions(optionDraft).length < 2) nextErrors.options = '至少填写两个有效选项';
    if (Object.keys(nextErrors).length) {
      setValidationErrors(nextErrors);
      return;
    }
    const phase = isReviewPool ? 'review' : editing.phase;
    const kpId = editing.knowledgePointIds?.[0] || knowledgePoints[0]?.id;
    const reviewIds = knowledgePoints.map((kp) => kp.id);
    const primaryKnowledgePointId = phase === 'review'
      ? (reviewIds.includes(editing.primaryKnowledgePointId) ? editing.primaryKnowledgePointId : reviewIds[0])
      : kpId;
    const evidenceProfile = knowledgeEvidenceProfile({
      ...editing,
      phase,
      knowledgePointIds: phase === 'review' ? reviewIds : [kpId],
      primaryKnowledgePointId,
    });
    const next = {
      ...content, phase,
      options: platformContent ? platformContent.options : ['single_choice', 'multiple_choice'].includes(content.type) ? parseOptions(optionDraft) : [],
      knowledgePointIds: phase === 'review' ? reviewIds : [kpId],
      primaryKnowledgePointId: evidenceProfile.primaryKnowledgePointId,
      knowledgePointWeights: evidenceProfile.knowledgePointWeights,
    };
    const exists = questions.some((item) => item.id === next.id);
    onChange(exists ? questions.map((item) => item.id === next.id ? next : item) : [...questions, next]);
    closeEditor();
  };

  const changeQuestionType = (type) => {
    const next = resetTypeSpecificFields(editing, type);
    setEditing(next);
    setPlatformDraft(canUseQuestionPlatformEditor(next) ? createQuestionPlatformDraft(next) : null);
  };

  const deleteQuestion = (id) => {
    if (disabled) return;
    if (!window.confirm('确定删除这道题吗？')) return;
    onChange(questions.filter((item) => item.id !== id));
  };

  const toggleAnswer = (id) => {
    setExpandedQuestionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleKnowledgePointTabKeyDown = (event, index) => {
    if (!knowledgePoints.length) return;
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % knowledgePoints.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + knowledgePoints.length) % knowledgePoints.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = knowledgePoints.length - 1;
    else return;
    event.preventDefault();
    setSelectedKp(knowledgePoints[nextIndex].id);
    window.requestAnimationFrame(() => knowledgePointTabRefs.current[nextIndex]?.focus());
  };

  const kpName = (question) => {
    const names = knowledgePoints
      .filter((kp) => question.knowledgePointIds?.includes(kp.id))
      .map((kp) => kp.name);
    if (question.phase === 'review') {
      const primary = knowledgePoints.find((kp) => kp.id === knowledgeEvidenceProfile(question).primaryKnowledgePointId)?.name;
      const secondary = names.filter((name) => name !== primary);
      return `课时综合 · 主：${primary || '未标注'}${secondary.length ? ` · 次：${secondary.join('、')}` : ''}`;
    }
    return names[0] || '未关联知识点';
  };

  return (
    <section className="question-review-workspace">
      <header className="question-review-toolbar">
        <div>
          <strong>{mode === 'pre' ? '课前测验题' : isReviewPool ? '综合练习题' : '知识点练习题'}</strong>
        </div>
        <div className="question-review-actions">
          <button className="teacher-neutral" type="button" disabled={disabled} onClick={() => openEditor(null)}><Plus size={15} />新增题目</button>
        </div>
      </header>

      {mode === 'practice' && !isReviewPool && (
        <>
          <div className="question-kp-tabs" role="tablist" aria-label="知识点题池">
            {knowledgePoints.map((kp, index) => <button
              key={kp.id}
              ref={(node) => { knowledgePointTabRefs.current[index] = node; }}
              id={`${questionTabsId}-tab-${index}`}
              role="tab"
              aria-controls={`${questionTabsId}-panel`}
              aria-selected={selectedKp === kp.id}
              tabIndex={selectedKp === kp.id ? 0 : -1}
              className={selectedKp === kp.id ? 'active' : ''}
              type="button"
              onClick={() => setSelectedKp(kp.id)}
              onKeyDown={(event) => handleKnowledgePointTabKeyDown(event, index)}
            >{kp.name}<span>{questions.filter((q) => q.phase !== 'review' && q.knowledgePointIds?.includes(kp.id)).length}</span></button>)}
          </div>
          <div className="question-generation-status">
            单点题池：{visible.length} 题（至少 15 题） · D1 {visibleDifficultyCounts[1]}/3 · D2 {visibleDifficultyCounts[2]}/3 · D3 {visibleDifficultyCounts[3]}/4 · D4 {visibleDifficultyCounts[4]}/3 · D5 {visibleDifficultyCounts[5]}/2 · 应用题 {visibleApplicationCount}（目标 {visibleApplicationRange.minimum}–{visibleApplicationRange.maximum}）
          </div>
        </>
      )}

      <div
        className="question-review-list"
        id={mode === 'practice' && !isReviewPool ? `${questionTabsId}-panel` : undefined}
        role={mode === 'practice' && !isReviewPool ? 'tabpanel' : undefined}
        aria-labelledby={mode === 'practice' && !isReviewPool ? selectedKnowledgePointTabId : undefined}
      >
        {visible.map((question, index) => (
          <article className="teacher-question-row" key={question.id}>
            <div className="teacher-question-row-header">
              <span className="teacher-question-index" aria-label={`第 ${index + 1} 题`}>{index + 1}</span>
              <div className="teacher-question-meta">
                <span className="teacher-question-type">{typeLabels[question.type] || question.type}</span>
                  <span className="teacher-question-difficulty" aria-label={`${difficultyLabels[question.difficulty] || 'D3 标准应用'}难度`}>
                  <span>难度</span>
                  <span className="teacher-question-difficulty-stars" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((level) => {
                      const numericDifficulty = String(question.difficulty || 'D3').replace(/^D/i, '');
                      const filledLevel = Math.max(1, Math.min(5, Number(numericDifficulty) || 3));
                      return <Star key={level} className={level <= filledLevel ? 'filled' : 'empty'} size={13} />;
                    })}
                  </span>
                </span>
                <span className="teacher-question-knowledge">知识点：{kpName(question)}</span>
              </div>
              <div className="teacher-question-actions">
                <button type="button" aria-label={expandedQuestionIds.has(question.id) ? '收起答案解析' : '查看答案解析'} onClick={() => toggleAnswer(question.id)}>
                  {expandedQuestionIds.has(question.id) ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button type="button" aria-label="编辑题目" disabled={disabled} onClick={() => openEditor(question)}><Pencil size={15} /></button>
                <button type="button" aria-label="删除题目" disabled={disabled} onClick={() => deleteQuestion(question.id)}><Trash2 size={15} /></button>
              </div>
            </div>
            <div className={`teacher-question-preview-wrap ${choiceLayoutClassName(question)}`}>
              <ReadonlyQuestionPreview question={question} showAnswer={expandedQuestionIds.has(question.id)} />
            </div>
          </article>
        ))}
        {!visible.length && <div className="teacher-empty">当前范围还没有题目</div>}
      </div>

      {editing && (
        <div className="question-editor-modal" role="dialog" aria-modal="true" aria-labelledby={dialogTitleId}>
          <button className="question-editor-mask" type="button" aria-label="关闭题目编辑" onClick={closeEditor} />
          <section ref={dialogRef}>
            <header><div><small>{questions.some((item) => item.id === editing.id) ? '编辑题目' : '新增题目'}</small><h2 id={dialogTitleId}>题目内容</h2></div><button type="button" aria-label="关闭题目编辑" onClick={closeEditor}><X size={18} /></button></header>
            <div className="question-editor-form">
              {Object.keys(validationErrors).length > 0 && <div className="question-editor-validation-summary" role="alert">请检查标红的必填内容</div>}
              <label><span>题型</span><select value={editing.type} onChange={(event) => changeQuestionType(event.target.value)}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>难度</span><select value={String(editing.difficulty || '3').replace(/^D/i, '')} onChange={(event) => setEditing({ ...editing, difficulty: Number(event.target.value) })}>{Object.entries(difficultyLabels).filter(([value]) => /^\d$/.test(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {mode === 'practice' && <label><span>所属范围</span>{isReviewPool
                ? <select value="review" disabled><option value="review">综合练习</option></select>
                : <select value={editing.knowledgePointIds?.[0]} onChange={(event) => setEditing({ ...editing, phase: 'knowledge', knowledgePointIds: [event.target.value], primaryKnowledgePointId: event.target.value })}>{knowledgePoints.map((kp) => <option key={kp.id} value={kp.id}>{kp.name}</option>)}</select>}</label>}
              {mode === 'practice' && isReviewPool && <label><span>主要知识点</span><select value={editing.primaryKnowledgePointId || knowledgePoints[0]?.id} onChange={(event) => setEditing({ ...editing, primaryKnowledgePointId: event.target.value })}>{knowledgePoints.map((kp) => <option key={kp.id} value={kp.id}>{kp.name}</option>)}</select></label>}
              {platformDraft && canUseQuestionPlatformEditor(editing) ? (
                <div className="wide question-platform-content-editor" aria-invalid={Boolean(validationErrors.stem || validationErrors.answer)}>
                  <QuestionContentEditor
                    locale="zh-CN"
                    onChange={setPlatformDraft}
                    questionTypeTemplates={[getQuestionPlatformTemplate(editing.type)]}
                    value={platformDraft}
                  />
                  {(validationErrors.stem || validationErrors.answer) && <small className="field-error">请填写题干并设置参考答案</small>}
                </div>
              ) : (
                <>
                  <label className="wide"><span>题干</span><textarea rows={4} aria-invalid={Boolean(validationErrors.stem)} value={editing.stem} onChange={(event) => { setEditing({ ...editing, stem: event.target.value }); setValidationErrors((current) => ({ ...current, stem: '' })); }} />{validationErrors.stem && <small className="field-error">{validationErrors.stem}</small>}</label>
                  {['single_choice', 'multiple_choice'].includes(editing.type) && <label className="wide"><span>选项（每行一项）</span><textarea rows={5} aria-invalid={Boolean(validationErrors.options)} value={optionDraft} onChange={(event) => { setOptionDraft(event.target.value); setValidationErrors((current) => ({ ...current, options: '' })); }} placeholder={'A. 选项一\nB. 选项二'} />{validationErrors.options && <small className="field-error">{validationErrors.options}</small>}</label>}
                  <label className="wide"><span>参考答案</span><textarea rows={3} aria-invalid={Boolean(validationErrors.answer)} value={Array.isArray(editing.answer) ? editing.answer.join(',') : editing.answer} onChange={(event) => { setEditing({ ...editing, answer: editing.type === 'multiple_choice' ? event.target.value.split(/[,，、\s]+/).filter(Boolean).map((v) => v.toUpperCase()) : event.target.value }); setValidationErrors((current) => ({ ...current, answer: '' })); }} />{validationErrors.answer && <small className="field-error">{validationErrors.answer}</small>}</label>
                </>
              )}
              {editing.type !== 'short_answer' && <label className="wide"><span>解析</span><textarea rows={3} value={editing.analysis || ''} onChange={(event) => setEditing({ ...editing, analysis: event.target.value })} /></label>}
            </div>
            <footer><button className="teacher-neutral" type="button" onClick={closeEditor}>取消</button><button className="teacher-primary" type="button" onClick={saveQuestion}><Save size={15} />保存题目</button></footer>
          </section>
        </div>
      )}
    </section>
  );
}
