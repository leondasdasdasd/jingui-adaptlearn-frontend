import { ChevronRight, RefreshCw, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatePanel from '../components/StatePanel';
import TeacherShell from '../components/TeacherShell';
import {
  fetchTeacherClasses,
  rememberCurrentClass,
} from '../teacher/data/classroomApiRepository';
import '../class-roster.css';

function classesPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.classes)) return payload.classes;
  return Array.isArray(payload?.items) ? payload.items : [];
}

function normalizeClasses(payload) {
  return classesPayload(payload)
    .map((classInfo) => ({
      ...classInfo,
      classId: classInfo?.classId ?? classInfo?.id,
      className: classInfo?.className ?? classInfo?.name,
      studentCount: Number(classInfo?.studentCount ?? classInfo?.rosterSize ?? classInfo?.students?.length ?? 0),
    }))
    .filter((classInfo) => classInfo.classId);
}

function classStatus(classInfo) {
  const status = String(classInfo?.status || 'ACTIVE').toUpperCase();
  if (status === 'ACTIVE') return { active: true, label: '使用中', tone: 'success' };
  if (status === 'INACTIVE' || status === 'DISABLED') return { active: false, label: '已停用', tone: 'muted' };
  return { active: false, label: classInfo?.status || '不可用', tone: 'muted' };
}

export default function TeacherClassesRoute() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, classes: [], error: '' });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      setState({ loading: false, classes: normalizeClasses(await fetchTeacherClasses()), error: '' });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message || '班级列表加载失败' }));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const classes = useMemo(() => [...state.classes].sort((left, right) => (
    String(left.className || left.classId).localeCompare(String(right.className || right.classId), 'zh-CN')
  )), [state.classes]);

  const openClass = (classId) => {
    rememberCurrentClass(classId);
    navigate(`/adaptive-learning/teacher/classes/${encodeURIComponent(classId)}/students`);
  };

  return <TeacherShell
    title="班级学生"
    subtitle="选择班级查看预设花名册，并生成学生个人学习链接"
    actions={<button className="teacher-secondary" type="button" onClick={load} disabled={state.loading}><RefreshCw size={15} /><span>刷新</span></button>}
  >
    {state.loading && <StatePanel tone="loading" title="正在加载班级" description="正在读取当前账号可访问的班级" />}
    {!state.loading && state.error && <StatePanel
      tone="error"
      title="班级列表加载失败"
      description={state.error}
      action={<button className="teacher-primary" type="button" onClick={load}><RefreshCw size={15} /><span>重新加载</span></button>}
    />}
    {!state.loading && !state.error && !classes.length && <StatePanel
      title="暂无可访问的班级"
      description="请先在测验系统中维护班级花名册和任课权限，完成后返回这里刷新。"
    />}
    {!state.loading && !state.error && classes.length > 0 && <section className="teacher-class-directory" aria-label="可访问班级">
      <header><h2>可访问班级</h2><span>共 {classes.length} 个</span></header>
      <div className="teacher-class-directory-scroll">
        <table>
          <thead><tr><th>班级</th><th>预设学生</th><th>状态</th><th aria-label="操作" /></tr></thead>
          <tbody>{classes.map((classInfo) => {
            const status = classStatus(classInfo);
            return <tr key={classInfo.classId}>
              <td><strong>{classInfo.className || '未命名班级'}</strong></td>
              <td><span className="teacher-class-student-count"><Users size={15} />{classInfo.studentCount} 人</span></td>
              <td><span className={`teacher-status ${status.tone}`}>{status.label}</span></td>
              <td><button className="teacher-class-open" type="button" disabled={!status.active} onClick={() => openClass(classInfo.classId)}>使用班级<ChevronRight size={15} /></button></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>}
  </TeacherShell>;
}
