import { ChevronRight, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatePanel from '../components/StatePanel';
import TeacherShell from '../components/TeacherShell';
import { fetchTeacherLearningPeriods } from '../teacher/data/classroomApiRepository';
import '../teacher-reports.css';

const periodStatus = {
  DRAFT: { label: '未发布', tone: 'muted' },
  PUBLISHED: { label: '已发布', tone: 'info' },
  ACTIVE: { label: '进行中', tone: 'info' },
  IN_PROGRESS: { label: '进行中', tone: 'info' },
  CLOSING: { label: '结算中', tone: 'info' },
  COMPLETED: { label: '已结束', tone: 'success' },
  CANCELLED: { label: '已取消', tone: 'muted' },
};

function normalizePeriods(payload) {
  return (Array.isArray(payload) ? payload : [])
    .map((period) => ({ ...period, periodId: period?.id ?? period?.periodId }))
    .filter((period) => period.periodId);
}

function periodTime(period) {
  return period.completedAt || period.publishedAt || period.scheduledStartAt || period.createdAt || '';
}

function formatPeriodTime(value) {
  if (!value) return '时间未设置';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未设置';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date).replaceAll('/', '-');
}

export default function TeacherReportsRoute() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, periods: [], error: '' });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const periods = normalizePeriods(await fetchTeacherLearningPeriods());
      setState({ loading: false, periods, error: '' });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message || '课堂列表加载失败' }));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const periods = useMemo(() => [...state.periods].sort((left, right) => (
    new Date(periodTime(right) || 0).getTime() - new Date(periodTime(left) || 0).getTime()
  )), [state.periods]);

  const openReport = (periodId) => {
    navigate(`/adaptive-learning/teacher/periods/${encodeURIComponent(periodId)}/report`);
  };

  return <TeacherShell
    title="学习报告"
    subtitle="选择课堂查看学生表现、掌握证据与知识点分析"
    actions={<button className="teacher-neutral" type="button" onClick={load} disabled={state.loading}><RefreshCw size={15} /><span>刷新</span></button>}
  >
    {state.loading && <StatePanel tone="loading" title="正在加载课堂" description="正在读取当前账号可访问的课堂" />}
    {!state.loading && state.error && <StatePanel
      tone="error"
      title="课堂列表加载失败"
      description={state.error}
      action={<button className="teacher-primary" type="button" onClick={load}><RefreshCw size={15} /><span>重新加载</span></button>}
    />}
    {!state.loading && !state.error && !periods.length && <StatePanel
      title="暂无可查看的课堂"
      description="当前账号还没有可访问的课堂，课堂创建或授权后会显示在这里。"
    />}
    {!state.loading && !state.error && periods.length > 0 && <section className="teacher-report-directory" aria-label="可查看的课堂报告">
      <header><h2>可访问课堂</h2><span>共 {periods.length} 堂</span></header>
      <div className="teacher-report-table-scroll">
        <table>
          <thead><tr><th>课堂</th><th>班级</th><th>状态</th><th>最近时间</th><th aria-label="操作" /></tr></thead>
          <tbody>{periods.map((period) => {
            const statusCode = String(period.status || '').toUpperCase();
            const status = periodStatus[statusCode] || { label: period.status || '状态未知', tone: 'muted' };
            const actionLabel = statusCode === 'COMPLETED' ? '查看报告' : '查看统计';
            return <tr key={period.periodId}>
              <td><strong>{period.title || '未命名课堂'}</strong></td>
              <td>{period.className || period.classId || '班级未命名'}</td>
              <td><span className={`teacher-status ${status.tone}`}>{status.label}</span></td>
              <td><time dateTime={periodTime(period) || undefined}>{formatPeriodTime(periodTime(period))}</time></td>
              <td><button className="teacher-report-open" type="button" onClick={() => openReport(period.periodId)}>{actionLabel}<ChevronRight size={15} /></button></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>}
  </TeacherShell>;
}
