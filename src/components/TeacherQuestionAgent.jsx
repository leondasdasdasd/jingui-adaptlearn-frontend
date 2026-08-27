import { useEffect, useId, useRef, useState } from 'react';
import {
  Bot,
  ChevronRight,
  LoaderCircle,
  Send,
  Sparkles,
  Square,
} from 'lucide-react';
import LessonContentGenerationPanel from './LessonContentGenerationPanel';
import TeacherAgentPlan from './TeacherAgentPlan';
import { executeTeacherAgentPlan } from '../lib/teacherAgentPlanRunner';
import {
  readTeacherAgentSession,
  writeTeacherAgentSession,
} from '../teacher/data/teacherAgentSessionRepository.js';

const COMPOSER_MIN_HEIGHT = 32;
const COMPOSER_MAX_HEIGHT = 160;
const BACKGROUND_STEP_KINDS = new Set([
  'generate_whole_lesson', 'complete_missing_content', 'repair_quality_issues',
]);

function planWithIdentity(plan) {
  return {
    ...plan,
    executionId: plan.executionId || `teacher-agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: plan.createdAt || new Date().toISOString(),
  };
}

function backendPlanStepStatus(status) {
  if (['queued', 'running', 'quality_check', 'repairing'].includes(status)) return 'submitted';
  if (['awaiting_review', 'published'].includes(status)) return 'completed';
  if (['failed', 'canceled', 'cancelled'].includes(status)) return 'failed';
  return '';
}

function resizeComposer(textarea) {
  textarea.style.height = `${COMPOSER_MIN_HEIGHT}px`;
  const nextHeight = Math.min(textarea.scrollHeight, COMPOSER_MAX_HEIGHT);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > COMPOSER_MAX_HEIGHT ? 'auto' : 'hidden';
}

function inspectResultMessage(result) {
  if (!result || typeof result !== 'object' || typeof result.passed !== 'boolean') return '';
  const issues = Array.isArray(result.issues) ? result.issues.filter((issue) => issue?.message) : [];
  if (result.passed || !issues.length) {
    return '检查完成：没有发现阻碍发布的问题，本次只读检查没有修改课时内容。';
  }
  return [
    `检查完成：发现 ${issues.length} 项需要处理，本次只读检查没有修改课时内容。`,
    ...issues.map((issue, index) => `${index + 1}. ${issue.message}`),
    '如果需要我处理，可以继续说“修复这些问题”；我会先列出写入计划，等你确认后再提交返修。',
  ].join('\n');
}

const backgroundToolTitles = {
  generate_whole_lesson: '整课生成',
  complete_missing_content: '自动补全',
  repair_quality_issues: '问题返修',
};

function backgroundToolReceipt({ kind, task, modules = [] }) {
  const title = backgroundToolTitles[kind] || '后台处理';
  const issues = Array.isArray(task?.issues) ? task.issues.filter((issue) => issue?.message) : [];
  const completedModules = modules.filter((module) => module?.complete).map((module) => module.label).filter(Boolean);
  const status = task?.backendStatus || task?.phase;
  if (['awaiting_review', 'published'].includes(status) && !issues.length) {
    return [
      `${title}已完成：已按教师确认的要求处理内容，并通过复检。`,
      completedModules.length ? `当前已就绪：${completedModules.join('、')}。` : '',
      status === 'awaiting_review'
        ? '修改已保存为待确认内容，请预览后再发布；教师智能体不会代替你发布。'
        : '内容已由教师确认发布。',
      '如果结果还不符合要求，可以继续说“还是没处理好，保留……，只修改……”。',
    ].filter(Boolean).join('\n');
  }
  return [
    `${title}未全部完成：${task?.message || '还有内容需要处理'}。`,
    ...issues.map((issue, index) => `${index + 1}. ${issue.message}`),
    '已完成的内容会保留。你可以继续说“修复这些问题”，或补充保留项和禁改项；我会重新列出写入计划等你确认。',
  ].join('\n');
}

function questionLabel(question) {
  if (question?.section === 'pre') return `课前测验第 ${question.number} 题`;
  if (question?.section === 'review') return `综合练习第 ${question.number} 题`;
  return `单点题池第 ${question?.number || ''} 题`.replace('第  题', '中的命中题目');
}

function fallbackQuestionLabel(questionId) {
  const id = String(questionId || '');
  if (id.includes('__pre-assessment__')) return '课前测验中的命中题目';
  if (id.includes('__composite-review__')) return '综合练习中的命中题目';
  if (id.includes('__knowledge-questions')) return '单点题池中的命中题目';
  return '命中题目';
}

function teacherFacingMessage(value, questions = []) {
  let text = String(value || '');
  [...questions]
    .filter((question) => question?.id)
    .sort((left, right) => String(right.id).length - String(left.id).length)
    .forEach((question) => {
      const id = String(question.id);
      const label = questionLabel(question);
      text = text.split(`题目 ${id}`).join(label).split(id).join(label);
    });
  text = text.replace(/题目\s+([a-zA-Z0-9_-]+(?:__[a-zA-Z0-9_-]+)+)/g, (_match, id) => fallbackQuestionLabel(id));
  return text;
}

function scopeCopy(scope) {
  if (scope === 'whole') {
    return {
      title: '教材课时内容',
      welcome: '我可以理解你的自然语言，检查、生成、补全或修改整课内容；涉及写入时会先列出执行计划。',
      placeholder: '例如：处理一下当前问题；检查并修复重复题；只重做第 4 题…',
    };
  }
  if (scope === 'pre') {
    return {
      title: '课前测验',
      welcome: '这里的调整会保存为未发布修改，完成后可由老师发布。',
      placeholder: '例如：增加两道能区分基准理解的题，减少直接记忆题…',
      success: '课前测验题已经生成并保存为未发布修改。',
    };
  }
  if (scope === 'review') {
    return {
      title: '综合练习',
      welcome: '仅调整综合练习；生成内容先进入草稿。',
      placeholder: '例如：增加两道跨知识点综合题，并拉开难度梯度…',
      success: '综合练习已经生成并保存为未发布修改。',
    };
  }
  return {
    title: '单点题池',
    welcome: '仅调整单点题池；生成内容先进入草稿。',
    placeholder: '例如：每个知识点补一题进阶问答题，并保留明显难度梯度…',
    success: '单点题池已经生成并保存为未发布修改。',
  };
}

function lessonAgentStatus(task, modules, publishing) {
  const phase = task?.phase || 'idle';
  const hasIssues = Boolean(task?.issues?.length);
  if (publishing) {
    return { label: '教师确认发布中', tone: 'running', running: true };
  }
  if (phase === 'ready' && !hasIssues) {
    return { label: '待教师确认', tone: 'warning', running: false };
  }
  if (['generating', 'validating', 'repairing'].includes(phase)) {
    return { label: '处理中', tone: 'running', running: true };
  }
  if (phase === 'published') return { label: '已发布', tone: 'success', running: false };
  if (phase === 'failed' || hasIssues) return { label: '需处理', tone: 'danger', running: false };
  if (phase === 'dirty') return { label: '有修改', tone: 'warning', running: false };
  if (['stopped', 'canceled', 'cancelled'].includes(phase)) {
    return { label: '已停止', tone: 'warning', running: false };
  }
  const allReady = Boolean(modules?.length) && modules.every((module) => module.complete);
  return allReady
    ? { label: '内容已就绪', tone: 'success', running: false }
    : { label: '尚未完成', tone: 'muted', running: false };
}

export default function TeacherQuestionAgent({
  lessonId,
  scope,
  open,
  onOpen,
  onClose,
  onPlanInstruction,
  onExecuteStep,
  onValidatePlan,
  generating,
  generationStatus,
  lessonModules,
  lessonTask,
  onCancelLesson,
  lessonActionsDisabled = false,
  questions = [],
}) {
  const copy = scopeCopy(scope);
  const titleId = useId();
  const inputId = useId();
  const textareaRef = useRef(null);
  const contentRef = useRef(null);
  const followLatestRef = useRef(true);
  const restoredSession = useRef(readTeacherAgentSession(lessonId));
  const notifiedRunPhasesRef = useRef(new Set(
    Object.values(restoredSession.current.runLinksByScope || {})
      .filter((link) => link?.runId && link?.notifiedPhase)
      .map((link) => `${link.runId}:${link.notifiedPhase}`),
  ));
  const [drafts, setDrafts] = useState(restoredSession.current.drafts);
  const [messagesByScope, setMessagesByScope] = useState(restoredSession.current.messagesByScope);
  const [errorsByScope, setErrorsByScope] = useState(restoredSession.current.errorsByScope);
  const [planningScope, setPlanningScope] = useState('');
  const [executingScope, setExecutingScope] = useState('');
  const [pendingPlansByScope, setPendingPlansByScope] = useState(restoredSession.current.plansByScope);
  const [stepStatusesByScope, setStepStatusesByScope] = useState(restoredSession.current.stepStatusesByScope);
  const [runLinksByScope, setRunLinksByScope] = useState(restoredSession.current.runLinksByScope);
  const draft = drafts[scope] || '';
  const messages = messagesByScope[scope] || [];
  const lastError = errorsByScope[scope] || '';
  const pendingPlan = pendingPlansByScope[scope] || null;
  const stepStatuses = stepStatusesByScope[scope] || {};
  const runLink = runLinksByScope[scope] || null;
  const busy = generating || planningScope === scope || executingScope === scope;
  const lessonRunning = ['generating', 'validating', 'repairing'].includes(lessonTask.phase);
  const agentStatus = lessonAgentStatus(lessonTask, lessonModules, lessonActionsDisabled);
  const agentProcessing = busy || agentStatus.running;
  const wholeLessonComposerBlocked = scope === 'whole' && lessonRunning;
  const stopLessonFromComposer = wholeLessonComposerBlocked && !lessonActionsDisabled && Boolean(onCancelLesson);
  const visibleAgentStatus = busy
    ? { label: '处理中', tone: 'running', running: true }
    : agentStatus;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      writeTeacherAgentSession(lessonId, {
        drafts,
        messagesByScope,
        errorsByScope,
        plansByScope: pendingPlansByScope,
        stepStatusesByScope,
        runLinksByScope,
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [drafts, errorsByScope, lessonId, messagesByScope, pendingPlansByScope, runLinksByScope, stepStatusesByScope]);

  useEffect(() => {
    if (!open) return undefined;
    const focusTimer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 180);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open, scope]);

  useEffect(() => {
    if (!contentRef.current || !followLatestRef.current) return;
    contentRef.current.scrollTop = contentRef.current.scrollHeight;
  }, [agentProcessing, generationStatus, lessonTask, messages, scope]);

  const appendAssistantMessage = (targetScope, text) => {
    if (!text) return;
    setMessagesByScope((current) => ({
      ...current,
      [targetScope]: [
        ...(current[targetScope] || []),
        { id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role: 'assistant', text },
      ],
    }));
  };

  useEffect(() => {
    if (scope !== 'whole' || !pendingPlan) return;
    const backgroundStep = pendingPlan.steps?.find((step) => BACKGROUND_STEP_KINDS.has(step.kind));
    if (!backgroundStep) return;
    if (runLink?.executionId && pendingPlan.executionId
      && runLink.executionId !== pendingPlan.executionId) return;
    const currentStepStatus = stepStatuses[backgroundStep.id] || 'pending';
    // Do not associate a newly confirmed plan with the previous lesson run
    // while the POST that creates its own run is still in flight.
    const runId = runLink?.runId || (currentStepStatus === 'submitted' ? lessonTask.runId : '');
    if (!runId || (runLink?.runId && lessonTask.runId && runLink.runId !== lessonTask.runId)) return;
    const reportedBackendStatus = lessonTask.backendStatus || lessonTask.phase;
    const backendStatus = reportedBackendStatus === 'awaiting_review' && lessonTask.issues?.length
      ? 'failed'
      : reportedBackendStatus;
    const nextStepStatus = backendPlanStepStatus(backendStatus);
    if (!nextStepStatus) return;
    if (currentStepStatus !== nextStepStatus) {
      setStepStatusesByScope((current) => ({
        ...current,
        [scope]: { ...(current[scope] || {}), [backgroundStep.id]: nextStepStatus },
      }));
    }
    const terminal = ['awaiting_review', 'published', 'failed', 'canceled', 'cancelled'].includes(backendStatus);
    const notificationKey = `${runId}:${backendStatus}`;
    const shouldNotify = terminal && !notifiedRunPhasesRef.current.has(notificationKey);
    if (shouldNotify) notifiedRunPhasesRef.current.add(notificationKey);
    setRunLinksByScope((current) => ({
      ...current,
      [scope]: {
        ...(current[scope] || {}),
        runId,
        executionId: pendingPlan.executionId,
        backendStatus,
        updatedAt: lessonTask.updatedAt || new Date().toISOString(),
        ...(shouldNotify ? { notifiedPhase: backendStatus } : {}),
      },
    }));
    if (shouldNotify) {
      appendAssistantMessage(scope, backgroundToolReceipt({
        kind: backgroundStep.kind,
        task: { ...lessonTask, backendStatus },
        modules: lessonModules,
      }));
    }
  }, [lessonTask.backendStatus, lessonTask.issues?.length, lessonTask.message, lessonTask.phase, lessonTask.runId, lessonTask.updatedAt, pendingPlan, runLink?.runId, scope, stepStatuses]);

  const executePlan = async (targetScope, plan) => {
    setExecutingScope(targetScope);
    setErrorsByScope((current) => ({ ...current, [targetScope]: '' }));
    const summary = String(plan.summary || '').replace(/[。！!？?]+$/, '');
    try {
      const initialStatuses = Object.fromEntries(plan.steps.map((step) => [step.id, 'pending']));
      setStepStatusesByScope((current) => ({ ...current, [targetScope]: initialStatuses }));
      const { backgroundSubmitted, stepResults } = await executeTeacherAgentPlan({
        plan,
        validatePlan: onValidatePlan,
        executeStep: onExecuteStep,
        onStatus: (stepId, status) => {
          setStepStatusesByScope((current) => ({
            ...current,
            [targetScope]: { ...(current[targetScope] || {}), [stepId]: status },
          }));
        },
      });
      const backgroundResult = stepResults.find((item) => item.result?.background)?.result;
      const backgroundStep = plan.steps.find((step) => BACKGROUND_STEP_KINDS.has(step.kind));
      if (backgroundResult?.runId) {
        setRunLinksByScope((current) => ({
          ...current,
          [targetScope]: {
            runId: backgroundResult.runId,
            executionId: plan.executionId,
            backendStatus: backgroundResult.status || 'queued',
            toolKind: backgroundResult.toolOperation || backgroundStep?.kind || '',
            teacherInstruction: backgroundResult.requestedInstruction || backgroundStep?.instruction || '',
            sourceIssueCount: Number(backgroundResult.sourceIssueCount || 0),
            submittedAt: new Date().toISOString(),
            updatedAt: backgroundResult.updatedAt || new Date().toISOString(),
          },
        }));
      }
      const inspectResult = stepResults
        .filter((item) => plan.steps.find((step) => step.id === item.stepId)?.kind === 'inspect_lesson')
        .at(-1)?.result;
      appendAssistantMessage(targetScope, backgroundSubmitted
        ? `已提交：${summary}。后台会按当前缺口或检查问题定向处理，保留已通过内容，完成后自动复检。刷新页面后进度和回执仍会恢复。`
        : inspectResultMessage(inspectResult)
          || (plan.confirmationRequired
            ? `已完成：${summary}。修改已进入课时草稿，请检查后再发布。`
            : `检查完成：${summary}。你可以继续让我处理发现的问题。`));
    } catch (error) {
      const message = error?.status === 403
        ? '课堂服务拒绝了本次检查（403）。课时内容没有被修改；请确认教师权限或服务配置后重新检查。'
        : error?.message || '执行计划时出现问题；已完成的步骤仍保留，失败步骤不会自动重放。';
      setErrorsByScope((current) => ({
        ...current,
        [targetScope]: message,
      }));
    } finally {
      setExecutingScope('');
    }
  };

  const submit = async () => {
    const instruction = draft.trim();
    if (!instruction || busy) return;
    const submittedScope = scope;
    setPlanningScope(submittedScope);
    setMessagesByScope((current) => ({
      ...current,
      [submittedScope]: [
        ...(current[submittedScope] || []),
        { id: `user-${Date.now()}`, role: 'user', text: instruction },
      ],
    }));
    setErrorsByScope((current) => ({ ...current, [submittedScope]: '' }));
    setDrafts((current) => ({ ...current, [submittedScope]: '' }));
    if (textareaRef.current) {
      textareaRef.current.style.height = `${COMPOSER_MIN_HEIGHT}px`;
      textareaRef.current.style.overflowY = 'hidden';
    }
    try {
      const history = (messagesByScope[submittedScope] || []).map(({ role, text }) => ({ role, text }));
      const previousStep = pendingPlan?.steps?.at(-1);
      const planned = await onPlanInstruction(instruction, history, {
        kind: runLink?.toolKind || previousStep?.kind || '',
        instruction: runLink?.teacherInstruction || previousStep?.instruction || '',
        status: runLink?.backendStatus || stepStatuses[previousStep?.id] || '',
        message: lessonTask.message || '',
        issues: lessonTask.issues || [],
      });
      if (planned.intent !== 'plan') {
        appendAssistantMessage(submittedScope, planned.reply);
        return;
      }
      const plan = planWithIdentity(planned);
      const summary = String(plan.summary || '').replace(/[。！!？?]+$/, '');
      appendAssistantMessage(submittedScope, plan.confirmationRequired
        ? `我已理解你的要求：${summary}。执行计划已经列出，但尚未开始；点击“确认执行”后才会写入草稿或提交后台任务。`
        : plan.reply);
      setPendingPlansByScope((current) => ({ ...current, [submittedScope]: plan }));
      setRunLinksByScope((current) => ({ ...current, [submittedScope]: null }));
      setStepStatusesByScope((current) => ({
        ...current,
        [submittedScope]: Object.fromEntries(plan.steps.map((step) => [step.id, 'pending'])),
      }));
      if (!plan.confirmationRequired) {
        setPlanningScope('');
        await executePlan(submittedScope, plan);
      }
    } catch (error) {
      setErrorsByScope((current) => ({
        ...current,
        [submittedScope]: error?.message || '生成没有完成，请稍后重试。',
      }));
    } finally {
      setPlanningScope('');
    }
  };

  return (
    <>
      {!open && (
        <button
          className={`teacher-agent-collapsed ${lessonRunning ? 'running' : lessonTask.phase}`}
          type="button"
          aria-label={lessonRunning ? '打开教师智能体，整课内容正在处理' : '打开教师智能体'}
          aria-controls="teacher-question-agent"
          aria-expanded="false"
          title={lessonRunning ? '教师智能体 · 处理中' : '教师智能体'}
          onClick={onOpen}
        >
          {lessonRunning ? <LoaderCircle className="spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
          <span className="teacher-agent-collapsed-status" aria-hidden="true" />
        </button>
      )}
      <button
        className={`teacher-question-agent-scrim${open ? ' open' : ''}`}
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
      />
      <aside
        className={`teacher-question-agent${open ? ' open' : ''}`}
        id="teacher-question-agent"
        role="dialog"
        aria-modal="false"
        aria-hidden={!open}
        aria-labelledby={titleId}
        aria-busy={agentProcessing}
        inert={open ? undefined : true}
      >
        <header className="teacher-agent-head">
          <div className="teacher-agent-identity">
            <span className="teacher-agent-avatar" aria-hidden="true"><Sparkles /></span>
            <span className="teacher-agent-title">
              <strong id={titleId}>教师智能体</strong>
            </span>
            {scope !== 'whole' && (
              <span className={`teacher-agent-head-status ${visibleAgentStatus.tone}`} role="status">
                {visibleAgentStatus.running && <LoaderCircle className="spin" aria-hidden="true" />}
                {visibleAgentStatus.label}
              </span>
            )}
          </div>
          <button className="teacher-agent-close" type="button" aria-label="收起教师智能体" title="收起" onClick={onClose}>
            <ChevronRight aria-hidden="true" />
          </button>
        </header>

        <div className="ai-assistant-panel">
          <div
            className="ai-assistant-content"
            ref={contentRef}
            role="log"
            aria-busy={busy || ['generating', 'validating', 'repairing'].includes(lessonTask.phase)}
            aria-live="polite"
            onScroll={(event) => {
              const content = event.currentTarget;
              followLatestRef.current = content.scrollHeight - content.scrollTop - content.clientHeight <= 64;
            }}
          >
            <div className="ai-assistant-messages">
              <div className="ai-assistant-message assistant">
                <span className="ai-assistant-avatar" aria-hidden="true"><Bot /></span>
                <div className="ai-assistant-bubble"><p>{copy.welcome}</p></div>
              </div>
              {(scope === 'whole' || lessonTask.phase !== 'idle') && (
                <LessonContentGenerationPanel
                  modules={lessonModules}
                  task={lessonTask}
                  publishing={lessonActionsDisabled}
                />
              )}
              {messages.map((message) => (
                <div className={`ai-assistant-message ${message.role}`} key={message.id}>
                  {message.role === 'assistant' && <span className="ai-assistant-avatar" aria-hidden="true"><Bot /></span>}
                  <div className="ai-assistant-bubble"><p>{teacherFacingMessage(message.text, questions)}</p></div>
                </div>
              ))}
              {pendingPlan && (
                <TeacherAgentPlan
                  plan={pendingPlan}
                  stepStatuses={stepStatuses}
                  runLink={runLink}
                  executing={executingScope === scope}
                  onConfirm={() => { void executePlan(scope, pendingPlan); }}
                  onCancel={() => {
                    setPendingPlansByScope((current) => ({ ...current, [scope]: null }));
                    const partiallyExecuted = Object.values(stepStatuses).some((status) => status !== 'pending');
                    appendAssistantMessage(scope, partiallyExecuted
                      ? '已关闭这份失败计划；先前已完成的步骤仍保留，不会重复执行。'
                      : '已取消这份执行计划，没有写入新的修改。');
                  }}
                />
              )}
              {agentProcessing && (scope !== 'whole' || planningScope === scope || executingScope === scope) && (
                <div className="ai-assistant-message assistant">
                  <span className="ai-assistant-avatar" aria-hidden="true"><Bot /></span>
                  <div className="ai-assistant-bubble ai-assistant-running" role="status">
                    <LoaderCircle className="spin" aria-hidden="true" />
                    <div>
                      <strong>{planningScope === scope ? '正在理解你的要求' : executingScope === scope ? '正在执行已确认的计划' : lessonActionsDisabled ? '正在按教师确认发布整课内容' : scope === 'whole' ? '正在处理整课内容' : `正在生成${copy.title}`}</strong>
                      <p>{planningScope === scope ? '正在结合当前课时、任务状态和最近对话规划下一步…' : executingScope === scope ? '正在按计划调用已授权工具，结果会保存到草稿或后台任务。' : scope === 'whole' ? lessonTask.message || '正在执行你的要求…' : generationStatus?.message || '正在理解你的要求并组织题目…'}</p>
                      {generationStatus?.elapsedSeconds ? <small>已用时 {generationStatus.elapsedSeconds} 秒</small> : null}
                    </div>
                  </div>
                </div>
              )}
              {lastError && (
                <div className="ai-assistant-message assistant">
                  <span className="ai-assistant-avatar" aria-hidden="true"><Bot /></span>
                  <div className="ai-assistant-bubble ai-assistant-error" role="alert">
                    <strong>这次操作没有完成</strong>
                    <p>{lastError}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="ai-assistant-composer-area">
              <div className="ai-assistant-composer">
                <label className="ai-assistant-composer-label" htmlFor={inputId}>与教师智能体对话</label>
                <textarea
                  id={inputId}
                  ref={textareaRef}
                  rows={1}
                  value={draft}
                  disabled={busy || wholeLessonComposerBlocked}
                  placeholder={wholeLessonComposerBlocked ? '整课任务运行中，停止后可继续输入…' : busy ? '正在响应，请稍候…' : copy.placeholder}
                  onChange={(event) => setDrafts((current) => ({ ...current, [scope]: event.target.value }))}
                  onInput={(event) => resizeComposer(event.currentTarget)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void submit();
                    }
                  }}
                />
                <footer className="ai-assistant-composer-footer">
                  <button
                    className={`ai-assistant-send${stopLessonFromComposer ? ' is-stop' : ''}`}
                    type="button"
                    aria-label={stopLessonFromComposer ? '停止生成' : busy ? '正在处理生成要求' : '发送生成要求'}
                    title={stopLessonFromComposer ? '停止生成' : busy ? '正在处理' : '发送（Enter）'}
                    aria-busy={busy || wholeLessonComposerBlocked}
                    disabled={stopLessonFromComposer ? false : busy || wholeLessonComposerBlocked || !draft.trim()}
                    onClick={stopLessonFromComposer ? onCancelLesson : () => { void submit(); }}
                  >
                    {stopLessonFromComposer
                      ? <Square aria-hidden="true" />
                      : busy
                        ? <LoaderCircle className="spin" aria-hidden="true" />
                        : <Send aria-hidden="true" />}
                  </button>
                </footer>
              </div>
            </div>
        </div>
      </aside>
    </>
  );
}
