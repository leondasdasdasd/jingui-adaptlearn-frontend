import { ChevronRight, Download, List, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import TeacherShell from '../components/TeacherShell';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildClassroomStudents, knowledgePointName } from '../teacher/domain/teacherClassroom';
import { fetchClassroomReports, fetchClassroomSnapshot, forgetCurrentPeriod } from '../teacher/data/classroomApiRepository';
import { scoreStatePresentation } from '../shared/domain/classroomScorePresentation';
import StatePanel from '../components/StatePanel';
import { downloadClassroomReportCsv } from '../teacher/domain/classroomReportExport';
import '../classroom-assessment.css';

export default function TeacherReportRoute() {
  const navigate = useNavigate();
  const { periodId = 'demo' } = useParams();
  const [snapshot, setSnapshot] = useState({ sessions: [], recentEvents: [], answers: [] });
  const [reports, setReports] = useState([]); const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoreFilter, setScoreFilter] = useState('all');
  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    setErrorStatus(null);
    setSnapshot({ sessions: [], recentEvents: [], answers: [] });
    setReports([]);
    try {
      const [nextSnapshot, nextReports] = await Promise.all([fetchClassroomSnapshot(periodId), fetchClassroomReports(periodId)]);
      setSnapshot(nextSnapshot);
      setReports(nextReports);
    } catch (requestError) {
      if (requestError.status === 404) forgetCurrentPeriod();
      setErrorStatus(requestError.status || null);
      setError(requestError.message || '课堂报告加载失败');
    } finally {
      setLoading(false);
    }
  }, [periodId]);
  useEffect(() => { void loadReport(); }, [loadReport]);
  const students = useMemo(() => buildClassroomStudents(snapshot, reports), [snapshot, reports]);
  const attentionStudents = students.filter((student) => student.warning);
  const publishedStudents = students.filter((student) => student.report?.score?.reviewStatus === 'PUBLISHED');
  const pendingReviewStudents = students.filter((student) => student.report?.score?.status === 'READY' && student.report?.score?.reviewStatus !== 'PUBLISHED');
  const needsEvidenceStudents = students.filter((student) => student.report?.score?.status !== 'READY');
  const filteredStudents = students.filter((student) => {
    if (scoreFilter === 'published') return student.report?.score?.reviewStatus === 'PUBLISHED';
    if (scoreFilter === 'pending_review') return student.report?.score?.status === 'READY' && student.report?.score?.reviewStatus !== 'PUBLISHED';
    if (scoreFilter === 'needs_evidence') return student.report?.score?.status !== 'READY';
    if (scoreFilter === 'needs_attention') return Boolean(student.warning);
    return true;
  });
  const knowledgeRows = [...reports.flatMap((report) => report.masteryResults || []).reduce((map, result) => {
    const current = map.get(result.knowledgeObjectiveId) || { id: result.knowledgeObjectiveId, determined: [], unknown: 0, evidence: 0 };
    if (result.status === 'DETERMINED' && result.mastery != null) current.determined.push(result);
    else current.unknown += 1;
    current.evidence += Number(result.evidenceCount || 0); map.set(result.knowledgeObjectiveId, current); return map;
  }, new Map()).values()].map((item) => ({
    ...item,
    averageMastery: item.determined.length ? Math.round(item.determined.reduce((sum, value) => sum + Number(value.mastery), 0) / item.determined.length) : null,
    averageConfidence: item.determined.length ? Math.round(item.determined.reduce((sum, value) => sum + Number(value.confidence), 0) / item.determined.length * 100) : null,
  })).map((item) => ({ ...item, name: knowledgePointName(item.id) }));

  const exportReport = () => downloadClassroomReportCsv({
    students,
    knowledgeRows,
    filename: `课堂学习报告-${periodId}.csv`,
  });

  if (loading) return <TeacherShell title="课堂学习统计" actions={<button className="teacher-neutral" disabled><Download size={15} />导出报告</button>}><StatePanel tone="loading" title="正在生成课堂统计" description="正在汇总学生作答、掌握证据与课堂证据" /></TeacherShell>;
  if (error) {
    const missingReport = errorStatus === 404;
    return <TeacherShell title="课堂学习统计" actions={<button className="teacher-neutral" disabled><Download size={15} />导出报告</button>}><StatePanel
      tone="error"
      title={missingReport ? '未找到可访问的课堂' : '课堂报告加载失败'}
      description={missingReport ? '这个课堂不存在，或当前账号已不能访问。请选择其他课堂。' : error}
      action={<div className="teacher-report-error-actions">
        <button className={missingReport ? 'teacher-primary' : 'teacher-neutral'} type="button" onClick={() => navigate('/adaptive-learning/teacher/reports')}><List size={15} /><span>选择其他课堂</span></button>
        <button className={missingReport ? 'teacher-neutral' : 'teacher-primary'} type="button" onClick={loadReport}><RefreshCw size={15} /><span>重新加载</span></button>
      </div>}
    /></TeacherShell>;
  }

  return <TeacherShell title="课堂学习统计" actions={<button className="teacher-neutral" type="button" disabled={!students.length} onClick={exportReport}><Download size={15} />导出报告</button>}>
    {error && <div className="teacher-notice error" role="alert">{error}</div>}
    <div className="report-summary"><div><span>参与学生</span><strong>{students.length} 人</strong></div><div><span>待教师确认</span><strong>{pendingReviewStudents.length} 人</strong></div><div><span>已发布</span><strong>{publishedStudents.length} 人</strong></div><div><span>待补证据</span><strong>{needsEvidenceStudents.length} 人</strong></div></div>
    <section className="student-class-report">
      <header><div><h2>学生课堂评定</h2></div><div className="teacher-score-filter" role="group" aria-label="筛选学生评定状态">{[
        ['all', '全部'], ['pending_review', '待确认'], ['published', '已发布'], ['needs_evidence', '待补证据'], ['needs_attention', '需关注'],
      ].map(([value, label]) => <button aria-pressed={scoreFilter === value} className={scoreFilter === value ? 'active' : ''} type="button" key={value} onClick={() => setScoreFilter(value)}>{label}</button>)}</div></header>
      <div className="student-report-table-head"><span>学生</span><span>正确率</span><span>掌握率</span><span>置信度</span><span>证据状态</span><span>一句话总评</span><span /></div>
      {filteredStudents.map((student) => {
        const score = student.report?.score;
        const state = scoreStatePresentation(score, score ? 'authoritative' : 'syncing_preview');
        const masteryResults = (student.report?.masteryResults || []).filter((item) => item.status === 'DETERMINED' && item.mastery != null);
        const masteryRate = masteryResults.length
          ? Math.round(masteryResults.reduce((sum, item) => sum + Number(item.mastery), 0) / masteryResults.length)
          : null;
        const confidence = masteryResults.length
          ? Math.round(masteryResults.reduce((sum, item) => {
            const value = Number(item.confidence);
            return sum + (value <= 1 ? value * 100 : value);
          }, 0) / masteryResults.length)
          : null;
        return <button className="student-report-row" type="button" key={student.id} onClick={() => navigate(`/adaptive-learning/teacher/periods/${periodId}/students/${student.id}`)}>
          <strong>{student.name}<small>{student.learningMinutes} 分钟</small></strong>
          <b>{student.accuracy == null ? '—' : `${student.accuracy}%`}</b>
          <b>{masteryRate == null ? '暂无法判断' : `${masteryRate}%`}</b>
          <span>{confidence == null ? '—' : `${confidence}%`}</span>
          <span className={`teacher-score-evidence-state ${state.ready ? 'ready' : ''}`}>{state.label}</span>
          <span className="student-report-summary" title={state.title}>{state.title}</span>
          <ChevronRight size={16} />
        </button>;
      })}
      {!filteredStudents.length && <div className="teacher-empty">当前筛选下没有学生。</div>}
    </section>
    <section className="knowledge-secondary-report">
      <header><div><h2>知识点分析</h2></div></header>
      {knowledgeRows.length ? <div>{knowledgeRows.map((item) => <article key={item.id}><strong>{item.name}</strong><span>平均掌握<b>{item.averageMastery == null ? '暂无法判断' : `${item.averageMastery}%`}</b></span><span>平均置信度<b>{item.averageConfidence == null ? '—' : `${item.averageConfidence}%`}</b></span><span>有效证据<b>{item.evidence}</b></span><span>暂无法判断<b>{item.unknown} 人</b></span></article>)}</div> : <div className="teacher-empty">课堂结算后显示知识点分析。</div>}
    </section>
    <div className="report-bottom"><section><h2>需要教师关注</h2>{attentionStudents.length ? attentionStudents.map((student) => <p key={student.id}><strong>{student.name}</strong>：{student.warning}，当前在“{student.stage}”。</p>) : <p>当前没有需要关注的学生。</p>}</section></div>
  </TeacherShell>;
}
