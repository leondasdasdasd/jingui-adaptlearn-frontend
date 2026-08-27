import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import StatePanel from '../components/StatePanel';
import StudentLearningHome from '../components/StudentLearningHome';
import { routes } from '../routes/routePaths';
import { getStudentLearningHome } from '../shared/infrastructure/classroomApi';
import { readClassStudentIdentity } from '../student/data/classStudentIdentityRepository';
import '../student-progress.css';
import '../student-learning-home.css';

export default function StudentAuthoritativeHomeRoute() {
  const navigate = useNavigate();
  const fixedIdentity = readClassStudentIdentity();
  const accessToken = fixedIdentity?.accessToken || '';
  const [state, setState] = useState({ loading: true, profile: null, error: '' });
  useEffect(() => {
    if (!accessToken) {
      setState({ loading: false, profile: null, error: '' });
      return undefined;
    }
    let cancelled = false;
    setState({ loading: true, profile: null, error: '' });
    const load = () => getStudentLearningHome('', accessToken, { cache: 'no-store' })
      .then((profile) => { if (!cancelled) setState({ loading: false, profile, error: '' }); })
      .catch((error) => { if (!cancelled) setState({ loading: false, profile: null, error: error.message }); });
    void load();
    const timer = window.setInterval(load, 10_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [accessToken]);

  return <AppShell title="学习主页" onBack={() => navigate(routes.directory)} compact>
    {!accessToken && <StatePanel tone="error" title="无法读取学习主页" description="当前没有可用的学生身份，请从老师提供的个人入口进入" />}
    {state.loading && <StatePanel tone="loading" title="正在加载学习主页" description="正在读取你的服务端学习记录" />}
    {!state.loading && state.error && <StatePanel tone="error" title="学习主页加载失败" description={state.error} />}
    {!state.loading && state.profile && <StudentLearningHome profile={state.profile} viewer="student" recordScope="all" />}
  </AppShell>;
}
