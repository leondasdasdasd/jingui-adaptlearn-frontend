import { Copy, ExternalLink, KeyRound, LoaderCircle, RefreshCw, Search, ShieldOff, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StatePanel from '../components/StatePanel';
import TeacherShell from '../components/TeacherShell';
import {
  fetchTeacherClass,
  fetchTeacherClassStudents,
  forgetCurrentClass,
  revokeClassStudentAccessCredential,
  rotateClassStudentAccessCredential,
} from '../teacher/data/classroomApiRepository';
import '../class-roster.css';

function classPayload(payload) {
  return payload?.classInfo || payload?.class || payload || {};
}

function rosterPayload(payload) {
  return Array.isArray(payload) ? payload : payload?.students || payload?.items || [];
}

function mergeClassStudents(classDetails, overviewStudents) {
  const detailsById = Object.fromEntries(rosterPayload(classDetails).map((student) => [student.studentId || student.id, student]));
  return overviewStudents.map((student) => {
    const details = detailsById[student.studentId || student.id] || {};
    const merged = { ...details, ...student, credential: { ...credentialOf(details), ...credentialOf(student) } };
    delete merged.accessCredential;
    delete merged.accessToken;
    return merged;
  });
}

function credentialOf(student) {
  return student.credential || student.accessCredential || {};
}

function copyableAccessToken(student) {
  const credential = credentialOf(student);
  return credential.status === 'ACTIVE' && typeof credential.accessToken === 'string'
    ? credential.accessToken
    : '';
}

function activityOf(student) {
  return student.activity || {};
}

function fixedStudentLink(studentId, accessToken) {
  if (!accessToken) return '';
  return `${window.location.origin}/adaptive-learning/student/${encodeURIComponent(studentId)}#accessToken=${encodeURIComponent(accessToken)}`;
}

function requireAccessToken(credential) {
  if (typeof credential?.accessToken !== 'string' || !credential.accessToken) {
    throw new Error('服务未返回可复制的学习链接，请重试。');
  }
  return credential.accessToken;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.tabIndex = -1;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    if (!document.execCommand('copy')) throw new Error('浏览器未允许复制');
  } finally {
    textarea.remove();
  }
}

function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date).replaceAll('/', '-');
}

export default function TeacherClassStudentsRoute() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, classInfo: null, students: [], error: '', errorStatus: 0 });
  const [query, setQuery] = useState('');
  const [busyStudentId, setBusyStudentId] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState('info');
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ completed: 0, total: 0 });

  const showNotice = useCallback((message, tone = 'info') => {
    setNotice(message);
    setNoticeTone(tone);
  }, []);

  const load = useCallback(async ({ background = false } = {}) => {
    setState((current) => ({
      ...current,
      loading: background ? current.loading : true,
      error: '',
      errorStatus: 0,
    }));
    try {
      const requestOptions = { cache: 'no-store' };
      const [classDetails, students] = await Promise.all([
        fetchTeacherClass(classId, requestOptions),
        fetchTeacherClassStudents(classId, requestOptions),
      ]);
      setState({
        loading: false,
        classInfo: classPayload(classDetails),
        students: mergeClassStudents(classDetails, rosterPayload(students)),
        error: '',
        errorStatus: 0,
      });
    } catch (error) {
      if (background) {
        showNotice('暂时无法获取最新班级数据，正在显示上一次结果。', 'warning');
        return;
      }
      if (error.status === 404) forgetCurrentClass();
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || '班级花名册加载失败',
        errorStatus: error.status || 0,
      }));
    }
  }, [classId, showNotice]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load({ background: true });
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const students = useMemo(() => state.students.filter((student) => {
    const keyword = query.trim().toLowerCase();
    return !keyword || String(student.studentName || student.name || '').toLowerCase().includes(keyword)
      || String(student.studentId || student.id || '').toLowerCase().includes(keyword);
  }), [query, state.students]);
  const activeCount = state.students.filter((student) => Number(activityOf(student).sessionCount || 0) > 0).length;
  const issuedCount = state.students.filter((student) => credentialOf(student).status === 'ACTIVE').length;
  const copyableCount = state.students.filter((student) => Boolean(copyableAccessToken(student))).length;
  const anyBusy = Boolean(busyStudentId) || bulkGenerating;

  const refresh = () => { void load(); };

  const copyLink = async (student) => {
    const studentId = student.studentId || student.id;
    const link = fixedStudentLink(studentId, copyableAccessToken(student));
    if (!link) { showNotice('该学生暂无可复制的有效链接，请先生成新链接。', 'warning'); return; }
    try {
      await copyText(link);
      showNotice(`已复制 ${student.studentName || student.name} 的学习链接`, 'success');
    } catch {
      showNotice('复制失败，浏览器未允许访问剪贴板。请允许后再次点击复制。', 'error');
    }
  };

  const copyAllLinks = async () => {
    const lines = state.students.map((student) => {
      const studentId = student.studentId || student.id;
      const link = fixedStudentLink(studentId, copyableAccessToken(student));
      return link ? `${student.rosterNumber || ''}\t${student.studentName || student.name}\t${studentId}\t${link}` : '';
    }).filter(Boolean);
    if (!lines.length) { showNotice('当前没有可复制的有效链接，请先生成全班或单个学生链接。', 'warning'); return; }
    try {
      await copyText(['序号\t姓名\t固定 ID\t学习链接', ...lines].join('\n'));
      showNotice(`已复制 ${lines.length} 位学生的学习链接，可按姓名分别发送`, 'success');
    } catch {
      showNotice('复制失败，浏览器未允许访问剪贴板。已生成的链接仍保留在当前页面，可重试复制。', 'error');
    }
  };

  const rotate = async (student) => {
    const studentId = student.studentId || student.id;
    const hadActiveCredential = credentialOf(student).status === 'ACTIVE';
    if (hadActiveCredential && !window.confirm(`重新生成后，${student.studentName || student.name} 的旧链接会立即失效。确认继续？`)) return;
    setBusyStudentId(studentId);
    showNotice('');
    try {
      const credential = await rotateClassStudentAccessCredential(classId, studentId);
      const accessToken = requireAccessToken(credential);
      setState((current) => ({ ...current, students: current.students.map((item) => (
        (item.studentId || item.id) === studentId
          ? { ...item, credential: { ...credentialOf(item), ...credential, accessToken, status: 'ACTIVE' } }
          : item
      )) }));
      showNotice(
        `已为 ${student.studentName || student.name} 生成新链接${hadActiveCredential ? '，旧链接已失效' : ''}，可随时复制发送。`,
        'success',
      );
    } catch (error) { showNotice(error.message || '链接生成失败', 'error'); }
    finally { setBusyStudentId(''); }
  };

  const rotateAll = async () => {
    if (!state.students.length) { showNotice('当前班级没有预设学生，无法生成学习链接。', 'warning'); return; }
    const actionLabel = issuedCount ? '重新生成' : '生成';
    const expirationNotice = issuedCount ? '，已有旧链接会立即失效' : '';
    if (!window.confirm(`将为全班 ${state.students.length} 位学生${actionLabel}学习链接${expirationNotice}。确认继续？`)) return;
    setBulkGenerating(true);
    setBulkProgress({ completed: 0, total: state.students.length });
    showNotice('');
    let completed = 0;
    const results = await Promise.allSettled(state.students.map(async (student) => {
      const studentId = student.studentId || student.id;
      try {
        const credential = await rotateClassStudentAccessCredential(classId, studentId);
        return { studentId, credential, accessToken: requireAccessToken(credential) };
      } finally {
        completed += 1;
        setBulkProgress({ completed, total: state.students.length });
      }
    }));
    const generated = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    const credentialsById = Object.fromEntries(generated.map((item) => [item.studentId, item]));
    setState((current) => ({ ...current, students: current.students.map((student) => {
      const studentId = student.studentId || student.id;
      const generatedCredential = credentialsById[studentId];
      return generatedCredential ? {
        ...student,
        credential: {
          ...credentialOf(student),
          ...generatedCredential.credential,
          accessToken: generatedCredential.accessToken,
          status: 'ACTIVE',
        },
      } : student;
    }) }));
    const failedCount = results.length - generated.length;
    if (!failedCount) {
      showNotice(`已生成全班 ${generated.length} 位学生的新链接${issuedCount ? '，旧链接已失效' : ''}，可随时复制并分别发送。`, 'success');
    } else if (generated.length) {
      showNotice(`已生成 ${generated.length} 位学生的新链接，${failedCount} 位生成失败。成功链接已保留，可先复制后再逐个重试。`, 'warning');
    } else {
      const firstError = results.find((result) => result.status === 'rejected')?.reason;
      showNotice(firstError?.message || '全班链接生成失败，请稍后重试。', 'error');
    }
    setBulkGenerating(false);
  };

  const revoke = async (student) => {
    const studentId = student.studentId || student.id;
    if (!window.confirm(`确认停用 ${student.studentName || student.name} 的固定链接？`)) return;
    setBusyStudentId(studentId);
    showNotice('');
    try {
      await revokeClassStudentAccessCredential(classId, studentId);
      setState((current) => ({ ...current, students: current.students.map((item) => (
        (item.studentId || item.id) === studentId ? { ...item, credential: { ...credentialOf(item), status: 'REVOKED', accessToken: '' } } : item
      )) }));
      showNotice(`已停用 ${student.studentName || student.name} 的学习链接`, 'success');
    } catch (error) { showNotice(error.message || '链接停用失败', 'error'); }
    finally { setBusyStudentId(''); }
  };

  return <TeacherShell
    title={state.classInfo?.className || state.classInfo?.name || '班级学生'}
    subtitle="固定花名册 · 自主学习与老师课堂使用同一学生身份"
    actions={<div className="class-roster-header-actions">
      <button className="teacher-secondary" type="button" onClick={refresh} disabled={state.loading || anyBusy}><RefreshCw size={15} /><span>刷新数据</span></button>
      <button className="teacher-secondary" type="button" onClick={() => { void rotateAll(); }} disabled={state.loading || anyBusy || !state.students.length} aria-busy={bulkGenerating || undefined}>
        {bulkGenerating ? <LoaderCircle className="class-roster-spin" size={15} /> : issuedCount ? <RefreshCw size={15} /> : <KeyRound size={15} />}
        <span>{bulkGenerating ? `正在生成 ${bulkProgress.completed}/${bulkProgress.total}` : issuedCount ? '重新生成全班链接' : '生成全班链接'}</span>
      </button>
      <button className="teacher-primary" type="button" onClick={copyAllLinks} disabled={state.loading || anyBusy || copyableCount === 0}><Copy size={15} /><span>复制全部链接{copyableCount ? ` (${copyableCount})` : ''}</span></button>
    </div>}
  >
    {notice && <div className={`teacher-notice ${noticeTone}`} role={noticeTone === 'error' ? 'alert' : 'status'}>{notice}</div>}
    {state.loading && <StatePanel tone="loading" title="正在加载班级" description="正在汇总固定花名册和学习活动" />}
    {!state.loading && state.error && <StatePanel
      tone="error"
      title={state.errorStatus === 404 ? '未找到可访问的班级' : '班级加载失败'}
      description={state.error}
      action={<div className="class-roster-state-actions">
        {state.errorStatus !== 404 && <button className="teacher-primary" type="button" onClick={load}><RefreshCw size={15} /><span>重新加载</span></button>}
        <button className="teacher-secondary" type="button" onClick={() => navigate('/adaptive-learning/teacher/classes')}><Users size={15} /><span>选择其他班级</span></button>
      </div>}
    />}
    {!state.loading && !state.error && <div className="class-roster-page">
      <section className="class-roster-summary" aria-label="班级概览">
        <div><Users size={18} /><span>班级人数</span><strong>{state.students.length}<small>人</small></strong></div>
        <div><ExternalLink size={18} /><span>已有学习记录</span><strong>{activeCount}<small>人</small></strong></div>
        <div><KeyRound size={18} /><span>有效固定链接</span><strong>{issuedCount}<small>个</small></strong></div>
      </section>
      <section className="class-roster-table-section">
        <header>
          <div><h2>学生花名册</h2><p>学生来自班级预设名单；有效链接可随时复制，重新生成会使旧链接失效。</p></div>
          <label className="class-roster-search"><Search size={15} /><span className="sr-only">搜索学生</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名或固定 ID" /></label>
        </header>
        <div className="class-roster-table-scroll">
          <table className="class-roster-table">
            <thead><tr><th>序号</th><th>学生</th><th>固定 ID</th><th>学习活动</th><th>累计作答</th><th>最近学习</th><th>链接状态</th><th aria-label="操作" /></tr></thead>
            <tbody>{students.map((student) => {
              const studentId = student.studentId || student.id;
              const activity = activityOf(student);
              const credential = credentialOf(student);
              const active = Number(activity.sessionCount || 0) > 0;
              const busy = busyStudentId === studentId;
              const controlsBusy = anyBusy;
              const hasCopyableLink = Boolean(copyableAccessToken(student));
              return <tr key={studentId}>
                <td>{student.rosterNumber || '—'}</td>
                <td><button className="class-roster-student" type="button" onClick={() => navigate(`/adaptive-learning/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/home`)}>{student.studentName || student.name}<ExternalLink size={13} /></button></td>
                <td><code>{studentId}</code></td>
                <td><span className={`teacher-status ${active ? 'success' : 'muted'}`}>{active ? `${activity.sessionCount} 次学习` : '未开始'}</span></td>
                <td>{active ? `${activity.answerCount || 0} 题` : '—'}</td>
                <td>{formatTime(activity.lastActiveAt)}</td>
                <td><span className={`teacher-status ${credential.status === 'ACTIVE' ? 'info' : 'muted'}`}>{credential.status === 'ACTIVE' ? '链接有效' : '已停用'}</span></td>
                <td><div className="class-roster-actions">
                  {hasCopyableLink && <button className="primary" type="button" disabled={controlsBusy} onClick={() => { void copyLink(student); }}><Copy size={15} /><span>复制链接</span></button>}
                  <button type="button" title={credential.status === 'ACTIVE' ? '重新生成后旧链接会立即失效' : '生成学习链接'} disabled={controlsBusy} onClick={() => { void rotate(student); }}>
                    {busy ? <LoaderCircle className="class-roster-spin" size={15} /> : credential.status === 'ACTIVE' ? <RefreshCw size={15} /> : <KeyRound size={15} />}
                    <span>{credential.status === 'ACTIVE' ? '重新生成' : '生成链接'}</span>
                  </button>
                  <button className="danger" type="button" aria-label={`停用 ${student.studentName || student.name} 的学习链接`} title="停用学习链接" disabled={controlsBusy || credential.status !== 'ACTIVE'} onClick={() => { void revoke(student); }}><ShieldOff size={15} /></button>
                </div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        {!students.length && <div className="class-roster-empty">{state.students.length ? '没有符合当前搜索条件的学生。' : '该班级暂无预设学生，请先在测验系统中维护花名册。'}</div>}
      </section>
    </div>}
  </TeacherShell>;
}
