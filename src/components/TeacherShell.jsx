import { BarChart3, BookOpenCheck, BookOpenText, ChevronDown, ChevronLeft, ChevronRight, LogOut, Radio, ScanSearch, UserRound, Users } from 'lucide-react';
import { NavLink, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  readCurrentClass,
  readCurrentPeriod,
  rememberCurrentClass,
  rememberCurrentPeriod,
} from '../teacher/data/classroomApiRepository';
import BrandLogo from './BrandLogo';
import { useTeacherSession } from '../shared/application/TeacherSessionContext';
import { questionTestLogoutUrl } from '../shared/infrastructure/teacherAuthorization';
import { clearTeacherStoragePartition } from '../teacher/data/teacherStoragePartition';

export default function TeacherShell({ title, subtitle, leadingAction, actions, children }) {
  const { classId, periodId } = useParams();
  const session = useTeacherSession();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  useEffect(() => { rememberCurrentPeriod(periodId); }, [periodId]);
  useEffect(() => { rememberCurrentClass(classId); }, [classId]);
  const activePeriodId = periodId && periodId !== 'demo' ? periodId : readCurrentPeriod();
  const activeClassId = classId || readCurrentClass();
  const displayName = session.displayName || '教师用户';
  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const closeOnOutsidePointer = (event) => {
      if (!userMenuRef.current?.contains(event.target)) setUserMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
        userMenuRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [userMenuOpen]);

  const logout = () => {
    const logoutUrl = questionTestLogoutUrl(session.logoutUrl, window.location);
    if (!logoutUrl) return;
    clearTeacherStoragePartition();
    setUserMenuOpen(false);
    window.location.assign(logoutUrl);
  };
  const nav = [
    { id: 'content', to: '/adaptive-learning/teacher/textbook-lessons', label: '教材课时内容', icon: BookOpenCheck },
    { id: 'question-quality', to: '/adaptive-learning/teacher/question-quality', label: '题目质检', icon: ScanSearch },
    { id: 'plans', to: '/adaptive-learning/teacher/classroom-plans', label: '课堂方案', icon: BookOpenText },
    { id: 'students', to: activeClassId ? `/adaptive-learning/teacher/classes/${encodeURIComponent(activeClassId)}/students` : '/adaptive-learning/teacher/classes', label: '班级学生', icon: Users },
    { id: 'live', to: activePeriodId ? `/adaptive-learning/teacher/periods/${activePeriodId}/live` : '/adaptive-learning/teacher/live', label: '实时课堂', icon: Radio },
    { id: 'report', to: activePeriodId ? `/adaptive-learning/teacher/periods/${activePeriodId}/report` : '/adaptive-learning/teacher/reports', label: '学习报告', icon: BarChart3 },
  ];
  return (
    <div className={`teacher-app${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <header className="teacher-global-header">
        <div className="teacher-brand"><BrandLogo label="云谷教学" /><div><strong>云谷教学</strong><small>自适应学习</small></div></div>
        <div className="teacher-user-menu" ref={userMenuRef}>
          <button
            className="teacher-user-trigger"
            type="button"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen((value) => !value)}
          >
            <span className="teacher-user-avatar" aria-hidden="true"><UserRound size={16} /></span>
            <span className="teacher-user-name">{displayName}</span>
            <ChevronDown className="teacher-user-chevron" size={15} aria-hidden="true" />
          </button>
          {userMenuOpen && (
            <div className="teacher-user-dropdown" role="menu" aria-label="账号菜单">
              <button type="button" role="menuitem" onClick={logout} disabled={!session.logoutUrl}>
                <LogOut size={16} />
                <span>退出登录</span>
              </button>
            </div>
          )}
        </div>
      </header>
      <aside className="teacher-sidebar">
        <button
          className="teacher-sidebar-toggle"
          type="button"
          aria-label={sidebarCollapsed ? '展开导航' : '收起导航'}
          title={sidebarCollapsed ? '展开导航' : '收起导航'}
          onClick={() => setSidebarCollapsed((value) => !value)}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <nav>{nav.map(({ id, to, label, icon: Icon }) => <NavLink key={id} to={to} title={sidebarCollapsed ? label : undefined} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
      </aside>
      <main className="teacher-main">
        <header className="teacher-page-header">
          <div className="teacher-page-heading">
            {leadingAction && <div className="teacher-page-heading-leading">{leadingAction}</div>}
            <div className="teacher-page-heading-copy"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
          </div>
          {actions && <div className="teacher-header-actions">{actions}</div>}
        </header>
        <div className="teacher-page-body">{children}</div>
      </main>
    </div>
  );
}
