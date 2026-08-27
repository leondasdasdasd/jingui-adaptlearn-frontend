import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, HandHelping, LoaderCircle, Play, Radio, RefreshCw, TimerReset, Wifi } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import EndClassroomDialog from '../components/EndClassroomDialog';
import TeacherClassroomContentOutline from '../components/TeacherClassroomContentOutline';
import TeacherShell from '../components/TeacherShell';
import StatePanel from '../components/StatePanel';
import StudentAccessLinks from '../components/StudentAccessLinks';
import { buildClassroomStudents } from '../teacher/domain/teacherClassroom';
import {
  endClassroom as completeClassroom,
  confirmAttentionAlertInvalid,
  acknowledgeAttentionAlert, acknowledgeHelpRequest, acknowledgeSupportHelpRequest, fetchAttentionAlerts, fetchClassroomReports,
  fetchClassroomSnapshot,
  fetchHelpRequests, fetchSupportHelpRequests, markAttentionAlertFalsePositive, resolveHelpRequest,
  resolveSupportHelpRequest,
  rememberCurrentPeriod,
  subscribeClassroom,
} from '../teacher/data/classroomApiRepository';
import { course } from '../shared/domain/courseCatalog';
import { createLearningPeriod, getClassroomPlan, getClassroomPlans, getLatestLessonVersion, getLearningPeriod, getPublishedLessonVersions, publishLearningPeriod } from '../shared/infrastructure/classroomApi';

const helpReasonLabels = {
  CANNOT_UNDERSTAND: '看不懂题目', CANNOT_START: '不知道从哪里开始',
  STUCK: '做到一半卡住了', CONTENT_OR_DEVICE_ISSUE: '题目或设备有问题',
};

function shortTime(value) {
  if (!value) return '刚刚';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  return minutes < 1 ? '刚刚' : `等待 ${minutes} 分钟`;
}

function snapshotText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.text || value.stem || value.answer || '';
}

function supportSourceLabel(request) {
  if (request.learningPeriodId) return '正式课堂';
  if (request.contextType === 'PRACTICE') return '自主练习';
  if (request.contextType === 'ASSESSMENT') return '学习测验';
  if (request.contextType === 'LEARNING') return '互动学习';
  if (request.contextType === 'KNOWLEDGE_MAP') return '知识图谱';
  return '自主学习';
}

function classroomActionError(error) {
  if (error?.message === 'Failed to fetch' || error instanceof TypeError) {
    return '无法连接课堂服务，请确认服务已启动后重试';
  }
  return error?.message || '结束课堂失败，请稍后重试';
}

export default function TeacherLiveRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedPlanId = searchParams.get('planId') || '';
  const requestedContentVersionId = searchParams.get('contentVersionId') || '';
  const { periodId = '' } = useParams();
  const hasPeriod = Boolean(periodId);
  const [snapshot, setSnapshot] = useState({ sessions: [], recentEvents: [], answers: [] });
  const [reports, setReports] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [supportHelpRequests, setSupportHelpRequests] = useState([]);
  const [attentionAlerts, setAttentionAlerts] = useState([]);
  const [attentionBusy, setAttentionBusy] = useState('');
  const [period, setPeriod] = useState(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [setupOpen, setSetupOpen] = useState(!hasPeriod);
  const [publishedLessons, setPublishedLessons] = useState([]);
  const [classroomSetup, setClassroomSetup] = useState({ contentVersionId: requestedContentVersionId, classId: '', className: '', roster: '' });
  const [contentConfirmed, setContentConfirmed] = useState(false);
  const [creatingClassroom, setCreatingClassroom] = useState(false);
  const [createdClassroom, setCreatedClassroom] = useState(null);
  const [endingClassroom, setEndingClassroom] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [endClassroomError, setEndClassroomError] = useState('');
  const [operationNotice, setOperationNotice] = useState('');
  const refresh = async () => {
    if (!periodId) return;
    try {
      const [nextSnapshot, nextReports, nextPeriod, nextHelpRequests, nextAttentionAlerts] = await Promise.all([
        fetchClassroomSnapshot(periodId), fetchClassroomReports(periodId), getLearningPeriod(periodId),
        fetchHelpRequests(periodId), fetchAttentionAlerts(periodId),
      ]);
      setSnapshot(nextSnapshot); setReports(nextReports); setPeriod(nextPeriod); setError('');
      setHelpRequests(Array.isArray(nextHelpRequests) ? nextHelpRequests : nextHelpRequests?.items || []);
      setAttentionAlerts(Array.isArray(nextAttentionAlerts) ? nextAttentionAlerts : nextAttentionAlerts?.items || []);
      setClassroomSetup((current) => ({ ...current, classId: current.classId || nextPeriod.classId, className: current.className || nextPeriod.className }));
    } catch (requestError) { setError(requestError.message); }
  };
  const refreshSupport = async () => {
    try {
      const payload = await fetchSupportHelpRequests();
      setSupportHelpRequests(Array.isArray(payload) ? payload : payload?.items || []);
    } catch (requestError) { setError(requestError.message); }
  };
  useEffect(() => {
    if (!periodId) { setConnected(false); return undefined; }
    const controller = new AbortController(); let refreshTimer; let reconnectTimer; let reconnectDelay = 500;
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 15_000);
    const connect = () => {
      if (controller.signal.aborted) return;
      subscribeClassroom(periodId, (event) => {
        reconnectDelay = 500;
        setConnected(true); if (['connected', 'heartbeat'].includes(event.type)) return;
        window.clearTimeout(refreshTimer); refreshTimer = window.setTimeout(() => { void refresh(); }, 150);
      }, controller.signal).then(() => {
        if (controller.signal.aborted) return;
        setConnected(false);
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 10_000);
      }).catch((streamError) => {
        if (streamError.name === 'AbortError' || controller.signal.aborted) return;
        setConnected(false); setError(streamError.message);
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 10_000);
      });
    };
    connect();
    return () => { controller.abort(); window.clearInterval(timer); window.clearTimeout(refreshTimer); window.clearTimeout(reconnectTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodId]);

  useEffect(() => {
    void refreshSupport();
    const timer = window.setInterval(() => { void refreshSupport(); }, 10_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!operationNotice) return undefined;
    const timer = window.setTimeout(() => setOperationNotice(''), 3000);
    return () => window.clearTimeout(timer);
  }, [operationNotice]);

  useEffect(() => {
    let cancelled = false;
    const lessons = course.chapters.flatMap((chapter) => chapter.sections.map((lesson) => ({ ...lesson, chapterTitle: chapter.title })));
    const lessonById = Object.fromEntries(lessons.map((lesson) => [lesson.id, lesson]));
    Promise.all([
      getClassroomPlans().catch(() => []),
      requestedPlanId ? getClassroomPlan(requestedPlanId) : Promise.resolve(null),
      getPublishedLessonVersions(lessons.map((lesson) => lesson.id)),
    ]).then(async ([plans, requestedPlan, summaries]) => {
      const items = await Promise.all(summaries.map(async (summary) => ({
        lesson: lessonById[summary.textbookLessonId],
        version: await getLatestLessonVersion(summary.textbookLessonId),
      })));
      if (cancelled) return;
      const availablePlans = requestedPlan
        ? [requestedPlan, ...plans.filter((plan) => plan.planId !== requestedPlan.planId)]
        : plans;
      const planItems = availablePlans.map((plan) => ({
        kind: 'plan',
        lesson: { id: `classroom-plan:${plan.planId}`, index: '方案', title: plan.title },
        version: { id: plan.versionId, versionNumber: plan.versionNumber, contentPackage: plan.contentPackage },
      }));
      const available = [...planItems, ...items.filter((item) => item.lesson).map((item) => ({ ...item, kind: 'lesson' }))];
      setPublishedLessons(available);
      setClassroomSetup((current) => ({
        ...current,
        contentVersionId: available.find((item) => item.version.id === requestedContentVersionId)?.version.id
          || available.find((item) => item.version.id === current.contentVersionId)?.version.id
          || available[0]?.version.id
          || '',
      }));
    }).catch((requestError) => { if (!cancelled) setError(requestError.message); });
    return () => { cancelled = true; };
  }, [requestedContentVersionId, requestedPlanId]);

  const enterClassMode = async () => {
    const selected = publishedLessons.find((item) => item.version.id === classroomSetup.contentVersionId);
    const students = classroomSetup.roster.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [studentId, ...nameParts] = line.split(/[,，\t]/).map((part) => part.trim());
      return { studentId, studentName: nameParts.join(' ') };
    });
    if (!selected || !contentConfirmed || !classroomSetup.classId.trim() || !classroomSetup.className.trim() || !students.length || students.some((item) => !item.studentId || !item.studentName)) {
      if (!contentConfirmed) { setError('请先查看并确认本次课堂内容'); return; }
      setError('请选择已发布内容，填写班级信息，并按“学号,姓名”录入全班学生'); return;
    }
    setCreatingClassroom(true); setError('');
    try {
      const created = await createLearningPeriod({
        classId: classroomSetup.classId.trim(), className: classroomSetup.className.trim(),
        title: selected.lesson.title, contentVersionId: selected.version.id,
        createdBy: 'current-teacher', students,
      });
      await publishLearningPeriod(created.period.id);
      const studentEntryUrl = import.meta.env.VITE_STUDENT_ENTRY_URL || `${window.location.origin}/adaptive-learning/today`;
      const links = created.studentCredentials.map((item) => ({ ...item, url: `${studentEntryUrl}?periodId=${encodeURIComponent(created.period.id)}&accessToken=${encodeURIComponent(item.accessToken)}` }));
      rememberCurrentPeriod(created.period.id);
      setCreatedClassroom({ ...created, links });
      setSetupOpen(false);
      navigate(`/adaptive-learning/teacher/periods/${created.period.id}/live`);
    } catch (requestError) { setError(requestError.message); }
    finally { setCreatingClassroom(false); }
  };
  const useDemoClass = () => setClassroomSetup((current) => ({
    ...current,
    classId: 'demo-grade7-1',
    className: '七年级 1 班（演示）',
    roster: ['demo-001,林晓然', 'demo-002,周雨桐', 'demo-003,陈思远', 'demo-004,赵可欣', 'demo-005,王子航'].join('\n'),
  }));
  const students = useMemo(() => buildClassroomStudents(snapshot, reports), [snapshot, reports]);
  const selectedClassroomContent = useMemo(() => publishedLessons
    .find((item) => item.version.id === classroomSetup.contentVersionId), [publishedLessons, classroomSetup.contentVersionId]);
  const classroomEnded = period?.status === 'COMPLETED';
  const alerts = students.flatMap((student) => student.warnings.map((warning) => ({ ...warning, student })));
  const studentBySession = Object.fromEntries(students.map((student) => [student.sessionId, student]));
  const visibleHelpRequests = [...supportHelpRequests, ...helpRequests]
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const activeAttentionStudentIds = new Set([
    ...alerts.map((item) => item.student.id),
    ...visibleHelpRequests.map((item) => item.studentId || studentBySession[item.studentSessionId]?.id).filter(Boolean),
    ...attentionAlerts.map((item) => item.studentId || studentBySession[item.studentSessionId]?.id).filter(Boolean),
  ]);
  const scored = students.filter((student) => student.accuracy != null);
  const average = scored.length ? Math.round(scored.reduce((sum, student) => sum + student.accuracy, 0) / scored.length) : 0;
  const inactive = students.filter((student) => student.warnings.some((warning) => warning.type === 'inactive')).length;
  const openStudent = (studentId) => navigate(`/adaptive-learning/teacher/periods/${periodId}/students/${studentId}`);
  const updateAttention = async (key, action) => {
    setAttentionBusy(key); setError('');
    try { await action(); await Promise.all([refresh(), refreshSupport()]); }
    catch (requestError) { setError(requestError.message); }
    finally { setAttentionBusy(''); }
  };
  const handleEndClassroom = async () => {
    setEndingClassroom(true); setEndClassroomError(''); setError('');
    try {
      const settledReports = await completeClassroom(periodId);
      if (Array.isArray(settledReports)) setReports(settledReports);
      setPeriod((current) => current ? { ...current, status: 'COMPLETED' } : current);
      setEndConfirmOpen(false);
      setOperationNotice('课堂已结束，学习记录已完成结算');
      await refresh();
    } catch (requestError) {
      setEndClassroomError(classroomActionError(requestError));
    } finally { setEndingClassroom(false); }
  };

  const remainingSeconds = students.length ? Math.max(0, Math.floor((new Date(students[0].endsAt).getTime() - Date.now()) / 1000)) : 0;
  const remainingText = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;
  const helpRequestPanel = (
    <section className="live-help-requests">
      <header><div><HandHelping size={16} /><h2>学生求助</h2></div><span>{visibleHelpRequests.length} 项待处理</span></header>
      {visibleHelpRequests.map((request) => {
        const student = studentBySession[request.studentSessionId];
        const requestKey = `help:${request.id}`;
        const persistentSupport = Boolean(request.supportSessionId);
        return <article className={request.status === 'ACKNOWLEDGED' ? 'acknowledged' : ''} key={`${persistentSupport ? 'support' : 'classroom'}:${request.id}`}>
          <button className="attention-card-main" type="button" onClick={() => student && openStudent(student.id)}>
            <HandHelping size={17} /><span><strong>{request.studentName || student?.name || '学生'}</strong><b>{helpReasonLabels[request.reasonCode] || request.reasonCode}</b><small>{supportSourceLabel(request)} · {shortTime(request.requestedAt || request.createdAt)} · {snapshotText(request.questionSnapshot).slice(0, 34) || request.questionSnapshot?.pageTitle || '当前学习页面'}</small></span>
          </button>
          {request.note && <p className="attention-card-note"><strong>补充说明：</strong>{request.note}</p>}
          <div className="attention-card-actions">
            {request.status !== 'ACKNOWLEDGED' && <button type="button" aria-busy={attentionBusy === requestKey} disabled={attentionBusy === requestKey} onClick={() => { void updateAttention(requestKey, () => persistentSupport ? acknowledgeSupportHelpRequest(request.id) : acknowledgeHelpRequest(periodId, request.id)); }}>{attentionBusy === requestKey && <LoaderCircle className="spin" size={14} />}我来处理</button>}
            {request.status === 'ACKNOWLEDGED' && <button type="button" aria-busy={attentionBusy === requestKey} disabled={attentionBusy === requestKey} onClick={() => { void updateAttention(requestKey, () => persistentSupport ? resolveSupportHelpRequest(request.id) : resolveHelpRequest(periodId, request.id)); }}>{attentionBusy === requestKey && <LoaderCircle className="spin" size={14} />}已解决</button>}
          </div>
        </article>;
      })}
      {!visibleHelpRequests.length && <div className="live-attention-empty">当前没有学生求助</div>}
    </section>
  );
  const setupPanel = (
    <section className="classroom-create-panel live-classroom-create">
      <header><div><h2>创建课堂</h2></div><button className="teacher-neutral" type="button" onClick={useDemoClass}>使用演示班级</button></header>
      <div className="classroom-create-fields">
        <label className="lesson-version-field"><span>上课内容</span><select value={classroomSetup.contentVersionId} onChange={(event) => { setContentConfirmed(false); setClassroomSetup((current) => ({ ...current, contentVersionId: event.target.value })); }}><option value="">请选择已发布内容</option>{publishedLessons.map((item) => <option value={item.version.id} key={item.version.id}>{item.kind === 'plan' ? '课堂方案 · ' : `${item.lesson.index} `}{item.lesson.title} · V{item.version.versionNumber}</option>)}</select></label>
        <label><span>班级编号</span><input value={classroomSetup.classId} onChange={(event) => setClassroomSetup((current) => ({ ...current, classId: event.target.value }))} placeholder="例如：2026-07-01" /></label>
        <label><span>班级名称</span><input value={classroomSetup.className} onChange={(event) => setClassroomSetup((current) => ({ ...current, className: event.target.value }))} placeholder="例如：七年级 1 班" /></label>
        <label className="roster-field"><span>全班学生</span><textarea value={classroomSetup.roster} onChange={(event) => setClassroomSetup((current) => ({ ...current, roster: event.target.value }))} placeholder={'每行一位：学号,姓名\n2026001,张同学\n2026002,李同学'} /></label>
      </div>
      {selectedClassroomContent?.version.contentPackage && <>
        <TeacherClassroomContentOutline
          contentPackage={selectedClassroomContent.version.contentPackage}
          title="开课内容确认"
          versionNumber={selectedClassroomContent.version.versionNumber}
        />
        <label className="classroom-content-confirm"><input type="checkbox" checked={contentConfirmed} onChange={(event) => setContentConfirmed(event.target.checked)} /><span>已确认本次课堂讲解、知识点和配套练习</span></label>
      </>}
      {!publishedLessons.length && <p className="classroom-create-hint">还没有可上课的已发布内容，请先到“教材课时内容”完成审核发布。</p>}
      <div className="classroom-create-actions">{hasPeriod && <button className="teacher-neutral" type="button" onClick={() => setSetupOpen(false)}>取消</button>}<button className="teacher-primary" type="button" aria-busy={creatingClassroom} disabled={creatingClassroom || !publishedLessons.length || !contentConfirmed} onClick={() => { void enterClassMode(); }}><Play size={15} />{creatingClassroom ? '正在开启课堂…' : '确认并进入上课模式'}</button></div>
    </section>
  );
  return (
    <TeacherShell title="实时课堂" subtitle={period ? `${period.className} · ${period.title}` : undefined} actions={<>{hasPeriod && <button className="teacher-neutral" onClick={() => { void Promise.all([refresh(), refreshSupport()]); }}><RefreshCw size={15} />刷新</button>}{hasPeriod && !classroomEnded && <button className="teacher-neutral" disabled={endingClassroom} onClick={() => { setEndClassroomError(''); setEndConfirmOpen(true); }}>结束课堂</button>}{classroomEnded && <button className="teacher-neutral" onClick={() => navigate(`/adaptive-learning/teacher/periods/${periodId}/report`)}>查看课堂报告</button>}<button className="teacher-primary" onClick={() => setSetupOpen(true)}><Play size={15} />{classroomEnded ? '开启下一堂课' : '进入上课模式'}</button></>}>
      {operationNotice && <div className="operation-feedback-toast success" role="status"><span><CheckCircle2 size={14} /></span>{operationNotice}</div>}
      {error && <div className="teacher-notice error" role="alert">{error}</div>}
      {!hasPeriod && <div className="persistent-help-inbox">{helpRequestPanel}</div>}
      {setupOpen && setupPanel}
      {hasPeriod && <StudentAccessLinks periodId={periodId} initialLinks={createdClassroom?.links || []} />}
      {!hasPeriod ? !setupOpen && setupPanel : <>
      <div className={`live-banner${classroomEnded ? ' ended' : ''}`}><div><span className="live-pulse"><Radio size={16} />{classroomEnded ? '课堂已结束' : connected ? '实时连接中' : '正在连接'}</span><strong>{classroomEnded ? '学习记录已结算' : students.length ? `剩余 ${remainingText}` : '等待学生进入'}</strong></div><div><Wifi size={16} />{students.filter((student) => student.online).length} 人在线</div></div>
      <div className="live-kpis"><div><span>在线学习</span><strong>{students.filter((student) => student.online).length}</strong></div><div><span>需要关注</span><strong className="danger-number">{activeAttentionStudentIds.size}</strong><small>{visibleHelpRequests.length} 项求助 · {attentionAlerts.length + alerts.length} 项预警</small></div><div><span>平均正确率</span><strong>{average}%</strong><small>有有效作答学生</small></div><div><span>5 分钟无变化</span><strong className={inactive ? 'danger-number' : ''}>{inactive}</strong><small>需要确认学习状态</small></div></div>
      <div className="live-layout">
        <section className="live-students">
          <header><div><h2>学生实时进度</h2><span>预警优先</span></div></header>
          <div className="live-table-head"><span>学生</span><span>当前环节</span><span>学习进度</span><span>正确率</span><span>状态</span><span /></div>
          {[...students].sort((a, b) => b.warnings.length - a.warnings.length).map((student) => (
            <button className={`live-student-row ${student.tone}`} key={student.id} type="button" onClick={() => openStudent(student.id)}>
              <div><strong>{student.name}</strong><small>{student.lastActivityMinutes ? `${student.lastActivityMinutes} 分钟前有变化` : '刚刚有学习变化'}</small></div>
              <span><b>{student.stage}</b><small>{student.currentContent}</small></span>
              <div className="row-progress"><span><i style={{ width: `${student.progress}%` }} /></span><b>{student.progress}%</b></div>
              <strong>{student.accuracy == null ? '—' : `${student.accuracy}%`}</strong>
              <span className={student.warning ? `alert-text ${student.tone}` : 'ok-text'}>{student.warning ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}{student.sessionStatus === 'SETTLED' ? '已结算' : student.warning || '学习正常'}</span><Eye size={16} />
            </button>
          ))}
          {!students.length && <StatePanel compact title="等待学生进入课堂" description="学生进入后，这里会实时显示学习进度和需要关注的状态" />}
        </section>
        <aside className="live-attention-panel">
          {helpRequestPanel}
          <section className="live-ai-alerts">
            <header><div><AlertTriangle size={16} /><h2>学习预警</h2></div><span>{attentionAlerts.length + alerts.length} 项待关注</span></header>
            {attentionAlerts.map((alert) => {
              const student = studentBySession[alert.studentSessionId];
              const alertKey = `alert:${alert.id}`;
              const evidenceItems = Array.isArray(alert.evidenceHistory) ? alert.evidenceHistory : alert.evidence || [];
              const evidence = evidenceItems[evidenceItems.length - 1] || alert.latestEvidence || {};
              const evidencePayload = evidence.payload || evidence;
              const level = alert.level || alert.severity || 'WARNING';
              return <article className={`attention-alert-card ${String(level).toLowerCase()}`} key={alert.id}>
                <button className="attention-card-main" type="button" onClick={() => student && openStudent(student.id)}>
                  <AlertTriangle size={17} /><span><strong>{alert.studentName || student?.name || '学生'}</strong><b>{['RED', 'DANGER'].includes(level) ? '高优先级 · ' : ''}疑似连续无效作答</b><small>{alert.occurrenceCount || alert.signalCount || evidenceItems.length || 0} 次 · {snapshotText(evidencePayload.answerSnapshot || evidencePayload.answer).slice(0, 30) || '点击查看学生记录'}</small></span>
                </button>
                <div className="attention-card-actions">
                  {alert.status !== 'ACKNOWLEDGED'
                    ? <button type="button" aria-busy={attentionBusy === alertKey} disabled={attentionBusy === alertKey} onClick={() => { void updateAttention(alertKey, () => acknowledgeAttentionAlert(periodId, alert.id)); }}>{attentionBusy === alertKey && <LoaderCircle className="spin" size={14} />}已关注</button>
                    : <button type="button" aria-busy={attentionBusy === alertKey} disabled={attentionBusy === alertKey} onClick={() => { void updateAttention(alertKey, () => confirmAttentionAlertInvalid(periodId, alert.id)); }}>{attentionBusy === alertKey && <LoaderCircle className="spin" size={14} />}确认无效</button>}
                  <button type="button" aria-busy={attentionBusy === alertKey} disabled={attentionBusy === alertKey} onClick={() => { void updateAttention(alertKey, () => markAttentionAlertFalsePositive(periodId, alert.id)); }}>{attentionBusy === alertKey && <LoaderCircle className="spin" size={14} />}误判</button>
                </div>
              </article>;
            })}
            {alerts.map((item, index) => <button className="derived-alert-card" key={`${item.student.id}-${item.type}-${index}`} type="button" onClick={() => openStudent(item.student.id)}>{item.type === 'inactive' ? <TimerReset size={17} /> : <AlertTriangle size={17} />}<span><strong>{item.student.name}</strong><b>{item.label}</b><small>{item.student.stage} · {item.student.kp}</small></span></button>)}
            {!attentionAlerts.length && !alerts.length && <div className="live-attention-empty">当前没有需要关注的预警</div>}
          </section>
        </aside>
      </div>
      </>}
      {endConfirmOpen && (
        <EndClassroomDialog
          className={period?.className}
          lessonTitle={period?.title}
          studentCount={students.length}
          onlineCount={students.filter((student) => student.online).length}
          pending={endingClassroom}
          error={endClassroomError}
          onCancel={() => setEndConfirmOpen(false)}
          onConfirm={handleEndClassroom}
        />
      )}
    </TeacherShell>
  );
}
