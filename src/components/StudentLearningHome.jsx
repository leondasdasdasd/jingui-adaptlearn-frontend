import { useState } from 'react';
import { QuestionPlayer, QuestionPreview } from '@yungu-fed/question-editor';
import {
  AlertTriangle, BookOpen, CheckCircle2, Clock3, FileQuestion, MessageSquareText,
  ShieldCheck, Sparkles, Target, TimerReset,
} from 'lucide-react';
import MathContent from './MathContent';
import QuestionReferenceAnswer from './QuestionReferenceAnswer';
import { choiceLayoutClassName } from '../shared/question-platform/choiceLayout';
import {
  adaptLegacyQuestion, canUseQuestionPlatformEditor, canUseQuestionPlatformPlayer,
  createQuestionPlatformDraft,
} from '../shared/question-platform/legacyQuestionAdapter';
import {
  createSerializedRichContent, getQuestionPlatformTemplate, repairEmbeddedChoiceDescriptions,
} from '../shared/question-platform/questionContract';
import { aiGeneratedErrorReason, aiGeneratedImprovement } from '../student/domain/questionFeedback.js';

const questionTypeLabels = {
  single_choice: '单选题',
  multiple_choice: '多选题',
  fill_blank: '填空题',
  short_answer: '问答题',
  judgement: '判断题',
  ordering: '排序题',
  classification: '分类题', matching: '匹配题', line_connect: '连线题',
  text_marker: '文本标记题', word_builder: '组式题',
};

const difficultyLabels = {
  1: 'D1 基础识别',
  2: 'D2 直接理解',
  3: 'D3 标准应用',
  4: 'D4 变式综合',
  5: 'D5 迁移应用',
};

function percent(value) {
  return value == null || !Number.isFinite(Number(value)) ? '—' : `${Math.round(Number(value))}%`;
}

function dateTime(value, withSeconds = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined, hour12: false,
  }).format(date).replaceAll('/', '-');
}

function duration(seconds = 0) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  if (value < 60) return `${value} 秒`;
  const minutes = Math.floor(value / 60);
  const remain = value % 60;
  return remain ? `${minutes} 分 ${remain} 秒` : `${minutes} 分钟`;
}

function scoreState(score, settled = false) {
  if (!score) return { label: '学习中', text: '学习记录正在同步，证据完整后会生成正式学习结论。' };
  if (score.status === 'READY') {
    return { label: score.reviewStatus === 'PUBLISHED' ? '结论已确认' : '结论待确认', text: score.summary };
  }
  return settled
    ? { label: '证据待补充', text: score.summary }
    : { label: '证据积累中', text: score.summary };
}

function questionType(value) {
  const normalized = normalizedQuestionType(value);
  return questionTypeLabels[normalized] || (value ? String(value) : '题型未知');
}

function normalizedQuestionType(value) {
  return String(value || '').trim().toLowerCase().replaceAll('-', '_');
}

function difficulty(value) {
  const normalized = String(value || '').trim().toUpperCase();
  const level = Number(normalized.replace(/^D/, ''));
  return difficultyLabels[level] || (value ? String(value) : '难度未知');
}

function optionLabel(option, index) {
  return String(option?.label || option?.key || option?.id || String.fromCharCode(65 + index)).trim();
}

function contentText(value) {
  if (Array.isArray(value)) return value.map(contentText).filter(Boolean).join('、');
  if (value && typeof value === 'object') return contentText(value.text ?? value.value ?? '');
  return value == null ? '' : String(value).trim();
}

function answerText(value, options = []) {
  const text = contentText(value);
  if (!text || !options.length) return text;
  const selected = text.split(/[,，、\s]+/).filter(Boolean);
  if (!selected.length) return text;
  const matched = selected.map((choice) => options.find((option, index) => (
    optionLabel(option, index).toUpperCase() === choice.toUpperCase()
  )));
  if (matched.some((option) => !option)) return text;
  return matched.map((option, index) => {
    const originalIndex = options.indexOf(option);
    return `${optionLabel(option, originalIndex)}. ${contentText(option?.text ?? option)}`;
  }).join('；');
}

function scoreText(score, maxScore, result) {
  if (!Number.isFinite(Number(score)) || !Number.isFinite(Number(maxScore))) {
    return result === '进行中' ? '待评分' : '得分暂不可用';
  }
  return `${Number(score)} / ${Number(maxScore)} 分`;
}

function attemptTone(result) {
  if (result === '已通过') return 'success';
  if (result === '进行中') return 'neutral';
  return 'warning';
}

function editorAnswerValue(value, type, stem) {
  if (Array.isArray(value) && [
    'multiple_choice', 'ordering', 'matching', 'line_connect', 'text_marker',
  ].includes(type)) return value;
  if (value && typeof value === 'object' && !Array.isArray(value)
    && ['classification', 'matching', 'line_connect', 'word_builder'].includes(type)) return value;
  const text = contentText(value);
  if (!text) return '';
  if (type === 'multiple_choice') return text.split(/[,，、\s]+/).filter(Boolean);
  const blankCount = String(stem || '').match(/_{2,}/g)?.length || 0;
  if (type === 'fill_blank' && blankCount > 1) return text.split(/[、\n]+/).filter(Boolean);
  return text;
}

function withReviewExtras(question, draft, templates) {
  const extras = [];
  const draftExtras = [];
  const addExtra = (type, name, value) => {
    const text = contentText(value);
    if (!text) return;
    extras.push({ name, type });
    draftExtras.push({ content: createSerializedRichContent(text), type });
  };
  if (question.type === 'short_answer') addExtra('sampleAnswer', '正确答案', question.answer);
  addExtra('solvingProcess', '答案解析', question.analysis);
  return {
    draft: { ...draft, extras: draftExtras },
    templates: templates.map((template, index) => index === 0 ? {
      ...template,
      structure: { ...template.structure, extras },
    } : template),
  };
}

function questionRendererModel(attempt) {
  const source = attempt.question || {};
  const type = normalizedQuestionType(source.type);
  const stem = contentText(source.stem);
  const question = repairEmbeddedChoiceDescriptions({
    id: `attempt-${attempt.sequence}`,
    stem,
    type,
    difficulty: source.difficulty,
    options: (Array.isArray(source.options) ? source.options : []).map((option, index) => ({
      id: optionLabel(option, index),
      text: contentText(option?.text ?? option),
    })),
    categories: (Array.isArray(source.categories) ? source.categories : []).map((item, index) => ({
      id: String(item?.id || `C${index + 1}`), text: contentText(item?.text ?? item),
    })),
    items: (Array.isArray(source.items) ? source.items : []).map((item, index) => ({
      id: String(item?.id || `I${index + 1}`), text: contentText(item?.text ?? item),
    })),
    columns: (Array.isArray(source.columns) ? source.columns : []).map((column, columnIndex) => ({
      id: String(column?.id || `column-${columnIndex + 1}`),
      items: (Array.isArray(column?.items) ? column.items : []).map((item, itemIndex) => ({
        id: String(item?.id || `item-${columnIndex + 1}-${itemIndex + 1}`),
        text: contentText(item?.text ?? item),
      })),
    })),
    segments: (Array.isArray(source.segments) ? source.segments : []).map((segment) => ({
      ...(segment?.markerId ? { markerId: String(segment.markerId) } : {}),
      text: contentText(segment?.text ?? segment),
    })),
    template: contentText(source.template),
    candidateOptions: (Array.isArray(source.candidateOptions) ? source.candidateOptions : []).map(contentText),
    answer: editorAnswerValue(attempt.correctAnswer, type, stem),
    analysis: contentText(source.analysis),
  });
  if (!question.stem) return { question, renderer: null };
  try {
    if (canUseQuestionPlatformPlayer(question)) {
      const adapted = adaptLegacyQuestion(question, editorAnswerValue(attempt.answer, type, stem));
      const review = withReviewExtras(question, adapted.draft, adapted.templates);
      return {
        question,
        renderer: {
          kind: 'player',
          ...adapted,
          ...review,
        },
      };
    }
    if (!canUseQuestionPlatformEditor(question)) return { question, renderer: null };
    const draft = createQuestionPlatformDraft(question);
    const templates = [getQuestionPlatformTemplate(question.type)];
    return {
      question,
      renderer: {
        kind: 'preview',
        ...withReviewExtras(question, draft, templates),
      },
    };
  } catch {
    return { question, renderer: null };
  }
}

function AttemptQuestionRenderer({ attempt, question, renderer }) {
  if (!question.stem) return <p className="student-home-attempt-unavailable">题目内容暂不可用。</p>;
  const isChoiceQuestion = ['single_choice', 'multiple_choice'].includes(question.type);
  const correctAnswer = attempt.correctAnswer ?? question.answer;
  const choiceReference = isChoiceQuestion && contentText(correctAnswer)
    ? <QuestionReferenceAnswer
        question={question}
        correctAnswer={correctAnswer}
        correctAnswerText={answerText(correctAnswer, question.options)}
        analysis={question.analysis}
      />
    : null;
  if (renderer) {
    const renderKey = JSON.stringify([question.type, question.stem, question.options]);
    return <>
      <MathContent as="div" className={`student-home-attempt-question-player ${choiceLayoutClassName(question)}`} renderKey={renderKey}>
        {renderer.kind === 'player' ? <QuestionPlayer
            className="student-home-question-player"
            disabled
            locale="zh-CN"
            onResponseChange={() => {}}
            questionTypeTemplates={renderer.templates}
            response={renderer.response}
            showAnswer={!isChoiceQuestion && Boolean(contentText(attempt.correctAnswer))}
            showExtraAttributes={!isChoiceQuestion && Boolean(question.analysis)}
            value={renderer.draft}
          /> : <QuestionPreview
            className="student-home-question-preview"
            locale="zh-CN"
            questionTypeTemplates={renderer.templates}
            showAnswer={false}
            showExtraAttributes={!isChoiceQuestion && Boolean(question.answer || question.analysis)}
            value={renderer.draft}
          />}
      </MathContent>
      {choiceReference}
    </>;
  }
  return <div className="student-home-attempt-question-fallback">
    <MathContent as="div" className="student-home-attempt-stem" renderKey={`${attempt.sequence}-${question.stem}`}>{question.stem}</MathContent>
    {question.options.length > 0 && <ul className={`student-home-attempt-options ${choiceLayoutClassName(question)}`} aria-label="题目选项">{question.options.map((option, index) => {
      const label = optionLabel(option, index);
      return <li key={`${label}-${index}`}><span>{label}</span><MathContent as="div" renderKey={`${attempt.sequence}-${label}-${option.text}`}>{option.text || '—'}</MathContent></li>;
    })}</ul>}
    {choiceReference}
  </div>;
}

export function StudentAttemptRecord({ attempt, showDetails = false }) {
  const { question, renderer } = questionRendererModel(attempt);
  const options = Array.isArray(question.options) ? question.options : [];
  const submitted = Boolean(attempt.submittedAt);
  const answer = answerText(attempt.answer, options);
  const tone = attemptTone(attempt.result);
  const feedbackGrading = {
    ...attempt,
    feedbackSource: attempt.feedbackSource || (attempt.aiCommentary || attempt.improvements ? 'ai' : ''),
    aiCommentary: attempt.aiCommentary || attempt.feedback || '',
  };
  const errorReason = aiGeneratedErrorReason(question.type, feedbackGrading);
  const improvement = aiGeneratedImprovement(question.type, feedbackGrading);
  const generalFeedback = !errorReason && !improvement ? contentText(attempt.feedback) : '';

  return <article className="student-home-attempt-record">
    <header className="student-home-attempt-summary">
      <div className="student-home-attempt-number"><strong>第 {attempt.sequence} 题</strong><span>{attempt.learningStage}</span></div>
      <div className="student-home-attempt-timing"><time>{dateTime(attempt.submittedAt || attempt.presentedAt, true)}</time><small>{duration(attempt.durationSeconds)}</small></div>
      <b className={`student-home-attempt-result ${tone}`}>{attempt.result}</b>
    </header>
    {showDetails && <div className="student-home-attempt-content">
      <section className="student-home-attempt-question" aria-label={`第 ${attempt.sequence} 题题目`}>
        <div className="student-home-attempt-section-heading">
          <strong>题目</strong>
          <div><span>{questionType(question.type)}</span><span>{difficulty(question.difficulty)}</span></div>
        </div>
        <AttemptQuestionRenderer attempt={attempt} question={question} renderer={renderer} />
      </section>
      <section className="student-home-attempt-answer" aria-label={`第 ${attempt.sequence} 题作答`}>
        <div className="student-home-attempt-section-heading"><strong>学生作答</strong><span className="student-home-attempt-score">{scoreText(attempt.score, attempt.maxScore, attempt.result)}</span></div>
        <MathContent as="div" className={`student-home-attempt-answer-text${answer ? '' : ' empty'}`} renderKey={`${attempt.sequence}-${answer}`}>
          {answer || (submitted ? '作答内容暂不可用。' : '尚未提交作答。')}
        </MathContent>
        {errorReason && <div className="student-home-attempt-feedback error-reason"><span>错误原因</span><MathContent as="p" renderKey={`${attempt.sequence}-${errorReason}`}>{errorReason}</MathContent></div>}
        {improvement && <div className="student-home-attempt-feedback"><span>修改建议</span><MathContent as="p" renderKey={`${attempt.sequence}-${improvement}`}>{improvement}</MathContent></div>}
        {generalFeedback && <div className="student-home-attempt-feedback"><span>批改反馈</span><MathContent as="p" renderKey={`${attempt.sequence}-${generalFeedback}`}>{generalFeedback}</MathContent></div>}
      </section>
    </div>}
  </article>;
}

const tabs = ['timeline', 'attempts', 'support'];

export default function StudentLearningHome({ profile, viewer = 'student', action = null, recordScope = 'session' }) {
  const [tab, setTab] = useState('timeline');
  const summary = profile?.summary || {};
  const timeline = profile?.timeline || [];
  const attempts = profile?.attempts || [];
  const supportActivities = profile?.supportActivities || [];
  const warnings = profile?.warnings || [];
  const current = profile?.currentStatus;
  const showAttemptDetails = viewer === 'teacher' || viewer === 'family';
  const score = scoreState(profile?.score, current?.status === 'SETTLED');
  const scoreValuesVisible = profile?.score?.status === 'READY'
    && (viewer === 'teacher' || profile.score.reviewStatus === 'PUBLISHED');
  const handleTabKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = Math.max(0, tabs.indexOf(tab));
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[nextIndex]);
    event.currentTarget.querySelector(`[data-tab-index="${nextIndex}"]`)?.focus();
  };

  return <div className="authoritative-student-home">
    <section className="student-home-identity">
      <div className="student-home-avatar" aria-hidden="true">{String(profile.student?.displayName || '学').slice(0, 1)}</div>
      <div className="student-home-identity-copy">
        <span>学生个人学习主页</span>
        <h2>{profile.student?.displayName || '当前学生'}</h2>
        <p>{current ? `${current.status === 'ACTIVE' ? '正在学习' : '本次学习已结束'} · 最近更新 ${dateTime(profile.generatedAt)}` : '暂时没有学习记录'}</p>
      </div>
      {action || <span className="student-home-authority"><ShieldCheck size={14} />{viewer === 'family' ? '家长只读' : '权威学习记录'}</span>}
    </section>

    <section className="student-detail-summary" aria-label="学习数据概览">
      <div><span>学习状态</span><strong>{current?.status === 'ACTIVE' ? '正在学习' : current ? '已结束' : '暂无记录'}</strong><small>{current?.lastActivityAt ? `更新于 ${dateTime(current.lastActivityAt)}` : '等待开始学习'}</small></div>
      <div><span>有效学习时间</span><strong>{summary.effectiveLearningMinutes == null ? '待结算' : `${summary.effectiveLearningMinutes} 分钟`}</strong><small>已排除等待与停留</small></div>
      <div><span>掌握率</span><strong>{percent(summary.masteryRate)}</strong><small>基于有效掌握证据</small></div>
      <div><span>已作答</span><strong>{summary.answerCount || 0} 题</strong><small>正确率 {percent(summary.accuracy)}</small></div>
      <div><span>学习支持</span><strong>{summary.supportRounds || 0} 轮</strong><small>学生主动发起</small></div>
    </section>

    <section className={`student-home-score${profile.score?.status === 'READY' ? ' ready' : ''}`}>
      <span className="student-home-score-tag">{score.label}</span>
      {scoreValuesVisible && <div className="student-home-score-metrics">
        <span>掌握率<strong>{percent(profile.score.finalMasteryScore)}</strong></span>
        <span>完成率<strong>{percent(profile.score.taskCompletionRate)}</strong></span>
        <span>进步或保持<strong>{percent(profile.score.progressOrMaintenanceScore)}</strong></span>
      </div>}
      <p>{score.text}</p>
      {scoreValuesVisible && <details><summary>查看结论依据</summary><div>
        <span>结论覆盖率<b>{percent(profile.score.conclusionCoverageRate)}</b></span>
        <span>有效作答率<b>{percent(profile.score.validFirstAttemptRate)}</b></span>
        <span>干预闭环率<b>{percent(profile.score.interventionClosureRate)}</b></span>
      </div></details>}
    </section>

    {warnings.length > 0 && <section className="student-detail-warnings"><header><AlertTriangle size={17} /><strong>当前需要关注</strong></header><div>{warnings.map((warning, index) => <span key={`${warning.type}-${index}`}>{warning.type === 'inactive' ? <TimerReset size={14} /> : <AlertTriangle size={14} />}{warning.label}</span>)}</div></section>}

    <div className="student-detail-tabs" role="tablist" aria-label="学生学习记录" onKeyDown={handleTabKeyDown}>
      <button id="student-home-tab-timeline" data-tab-index="0" role="tab" aria-controls="student-home-panel-timeline" aria-selected={tab === 'timeline'} tabIndex={tab === 'timeline' ? 0 : -1} className={tab === 'timeline' ? 'active' : ''} onClick={() => setTab('timeline')}><BookOpen size={15} />{recordScope === 'all' ? '全部学习记录' : '本次学习记录'} <span>{timeline.length}</span></button>
      <button id="student-home-tab-attempts" data-tab-index="1" role="tab" aria-controls="student-home-panel-attempts" aria-selected={tab === 'attempts'} tabIndex={tab === 'attempts' ? 0 : -1} className={tab === 'attempts' ? 'active' : ''} onClick={() => setTab('attempts')}><CheckCircle2 size={15} />逐题结果 <span>{attempts.length}</span></button>
      <button id="student-home-tab-support" data-tab-index="2" role="tab" aria-controls="student-home-panel-support" aria-selected={tab === 'support'} tabIndex={tab === 'support' ? 0 : -1} className={tab === 'support' ? 'active' : ''} onClick={() => setTab('support')}><MessageSquareText size={15} />学习支持 <span>{supportActivities.length}</span></button>
    </div>

    {tab === 'timeline' && <section id="student-home-panel-timeline" role="tabpanel" aria-labelledby="student-home-tab-timeline" tabIndex={0} className="student-home-record-panel">
      <header><div><Clock3 size={17} /><h3>学习时间线</h3></div><span>{timeline.length} 条记录</span></header>
      {timeline.length ? <div className="student-home-timeline">{timeline.map((item, index) => <article key={`${item.startedAt}-${index}`}><span className="timeline-node">{index + 1}</span><div><div><strong>{item.label}</strong><time>{dateTime(item.startedAt, true)}{item.endedAt ? ` — ${dateTime(item.endedAt, true)}` : ' — 进行中'}</time></div><small><Clock3 size={13} />{duration(item.durationSeconds)}</small></div></article>)}</div> : <div className="student-home-empty">还没有可展示的学习记录。</div>}
    </section>}

    {tab === 'attempts' && <section id="student-home-panel-attempts" role="tabpanel" aria-labelledby="student-home-tab-attempts" tabIndex={0} className="student-home-record-panel">
      <header><div><FileQuestion size={17} /><h3>逐题结果</h3></div><span>{showAttemptDetails ? '题目、作答与批改结果' : `${attempts.length} 条作答记录`}</span></header>
      {attempts.length ? <div className="student-home-attempt-list">{attempts.map((attempt) => <StudentAttemptRecord key={`${attempt.sequence}-${attempt.presentedAt}`} attempt={attempt} showDetails={showAttemptDetails} />)}</div> : <div className="student-home-empty">还没有已确认的作答结果。</div>}
    </section>}

    {tab === 'support' && <section id="student-home-panel-support" role="tabpanel" aria-labelledby="student-home-tab-support" tabIndex={0} className="student-home-record-panel">
      <header><div><Sparkles size={17} /><h3>学习支持记录</h3></div><span>{summary.supportRounds || 0} 轮主动交流</span></header>
      {supportActivities.length ? <div className="student-home-support-list">{supportActivities.map((item, index) => <article key={`${item.occurredAt}-${index}`}><Target size={16} /><strong>{item.state}</strong><time>{dateTime(item.occurredAt, true)}</time></article>)}</div> : <div className="student-home-empty">还没有学习支持记录。</div>}
    </section>}
  </div>;
}
