import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Link2, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import StatePanel from '../components/StatePanel';
import StudentLearningHome from '../components/StudentLearningHome';
import TeacherShell from '../components/TeacherShell';
import {
  createFamilyStudentShare,
  fetchClassroomReports,
  fetchTeacherStudentLearningHome,
  publishStudentScore,
} from '../teacher/data/classroomApiRepository';
import '../family-student-monitor.css';
import '../student-learning-home.css';

export default function TeacherStudentDetailRoute() {
  const navigate = useNavigate();
  const { periodId, studentId } = useParams();
  const [state, setState] = useState({ loading: true, refreshing: false, profile: null, report: null, error: '' });
  const [publishingScore, setPublishingScore] = useState(false);
  const [scoreNotice, setScoreNotice] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareNotice, setShareNotice] = useState('');
  const [familyShareUrl, setFamilyShareUrl] = useState('');
  const load = useCallback(async ({ initial = false } = {}) => {
    setState((current) => ({ ...current, loading: initial && !current.profile, refreshing: !initial && Boolean(current.profile) }));
    try {
      const [profile, reports] = await Promise.all([
        fetchTeacherStudentLearningHome(periodId, studentId),
        fetchClassroomReports(periodId),
      ]);
      const report = reports.find((item) => item.studentId === studentId) || null;
      setState({ loading: false, refreshing: false, profile, report, error: '' });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, refreshing: false, error: error.message }));
    }
  }, [periodId, studentId]);

  useEffect(() => {
    void load({ initial: true });
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const handleFamilyShare = async () => {
    if (sharing) return;
    setSharing(true); setShareNotice('');
    try {
      const share = await createFamilyStudentShare(periodId, studentId);
      const configuredBase = String(import.meta.env.VITE_FAMILY_PUBLIC_BASE_URL || '').replace(/\/$/, '');
      const publicBase = configuredBase || window.location.origin;
      const url = `${publicBase}/adaptive-learning/family/${share.shareToken}`;
      setFamilyShareUrl(url);
      try { await navigator.clipboard.writeText(url); setShareNotice('家长链接已复制；重新生成后，旧链接会立即失效。'); }
      catch { setShareNotice('家长链接已生成，请在下方复制。'); }
    } catch (error) { setShareNotice(error.message || '家长链接生成失败'); }
    finally { setSharing(false); window.setTimeout(() => setShareNotice(''), 5000); }
  };

  const copyFamilyShare = async () => {
    try { await navigator.clipboard.writeText(familyShareUrl); setShareNotice('家长链接已复制。'); }
    catch { setShareNotice('浏览器未允许自动复制，请选中链接手动复制。'); }
    window.setTimeout(() => setShareNotice(''), 5000);
  };

  const handlePublishScore = async () => {
    const sessionId = state.report?.studentSessionId;
    if (!sessionId || publishingScore) return;
    setPublishingScore(true);
    setScoreNotice('');
    try {
      await publishStudentScore(sessionId);
      setScoreNotice('学习结论已确认并发布。');
      await load();
    } catch (error) {
      setScoreNotice(error.message || '学习结论发布失败，请重试');
    } finally {
      setPublishingScore(false);
    }
  };

  const title = state.profile?.student?.displayName || '学生学习主页';
  const scorePendingReview = state.report?.score?.status === 'READY'
    && state.report?.score?.reviewStatus !== 'PUBLISHED';
  return <TeacherShell title={title} subtitle="学生个人学习情况" actions={<>
    {scorePendingReview && <button className="teacher-primary" type="button" disabled={publishingScore} aria-busy={publishingScore} onClick={handlePublishScore}><Check size={15} />{publishingScore ? '发布中' : '确认并发布结论'}</button>}
    <button className="teacher-neutral" type="button" disabled={sharing} aria-busy={sharing} title="生成新链接会让旧链接失效" onClick={handleFamilyShare}><Link2 size={15} />{sharing ? '生成中' : '家长链接'}</button>
    <button className="teacher-neutral" type="button" onClick={() => navigate(`/adaptive-learning/teacher/periods/${periodId}/live`)}><ArrowLeft size={15} />返回实时课堂</button>
  </>}>
    {(shareNotice || scoreNotice) && <div className="family-share-toast" role="status"><Check size={16} />{scoreNotice || shareNotice}</div>}
    {familyShareUrl && <section className="family-share-panel" aria-label="家长查看链接"><div><strong>家长只读链接</strong><span>只能查看 {title} 的个人学习情况；有效期 7 天。</span></div><input type="text" readOnly value={familyShareUrl} aria-label="家长只读链接地址" onFocus={(event) => event.currentTarget.select()} /><button className="teacher-primary" type="button" onClick={copyFamilyShare}><Link2 size={15} />复制链接</button></section>}
    {state.loading && <StatePanel tone="loading" title="正在加载学生主页" description="正在同步该学生的学习状态与统计" />}
    {!state.loading && !state.profile && <StatePanel tone="error" title="学生主页加载失败" description={state.error || '未找到该学生的学习记录'} />}
    {state.profile && <>
      {state.error && <div className="teacher-notice error" role="status">暂时无法获取最新记录，正在显示上一次结果</div>}
      <StudentLearningHome profile={state.profile} viewer="teacher" action={<button type="button" className="student-home-refresh" disabled={state.refreshing} aria-busy={state.refreshing} onClick={() => load()}><RefreshCw className={state.refreshing ? 'spin' : ''} size={15} />{state.refreshing ? '同步中' : '刷新'}</button>} />
    </>}
  </TeacherShell>;
}
