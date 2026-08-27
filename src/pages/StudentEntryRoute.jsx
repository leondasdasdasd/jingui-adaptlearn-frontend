import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { routes } from '../routes/routePaths';
import { emptySession, useLearningSession } from '../session/LearningSessionContext';
import { getClassStudentIdentity } from '../shared/infrastructure/classroomApi';
import {
  forgetClassStudentIdentity,
  normalizeClassStudentIdentity,
  readClassStudentIdentity,
  rememberClassStudentIdentity,
} from '../student/data/classStudentIdentityRepository';
import { restorePersistentStudentState } from '../student/data/persistentStudentStateRepository';

function accessTokenFromLocation() {
  const query = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return fragment.get('accessToken') || query.get('accessToken') || '';
}

function removeTokenFromAddressBar() {
  window.history.replaceState(null, '', window.location.pathname);
}

export default function StudentEntryRoute() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { session, setSession } = useLearningSession();
  const started = useRef(false);
  const sessionAtEntry = useRef(session);
  const [state, setState] = useState({ loading: true, error: '' });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const rememberedIdentity = readClassStudentIdentity();
    const accessToken = accessTokenFromLocation()
      || (rememberedIdentity?.studentId === studentId ? rememberedIdentity.accessToken : '');
    removeTokenFromAddressBar();
    if (!accessToken) {
      forgetClassStudentIdentity();
      setState({ loading: false, error: '这个学习链接缺少访问凭证，请向老师重新获取固定链接。' });
      return;
    }
    getClassStudentIdentity(accessToken)
      .then(async (payload) => {
        const identity = normalizeClassStudentIdentity(payload, accessToken);
        if (!identity.studentId || identity.studentId !== studentId) {
          throw new Error('链接中的学生身份不匹配，请使用老师发给你的个人固定链接。');
        }
        const rememberedCredentialChanged = Boolean(rememberedIdentity) && (
          rememberedIdentity.accessToken !== accessToken
          || rememberedIdentity.classId !== identity.classId
        );
        const activeSessionCredentialChanged = Boolean(session.selection) && (
          session.selection.studentId !== identity.studentId
          || (session.selection.classroomAccessToken && session.selection.classroomAccessToken !== accessToken)
        );
        if (rememberedCredentialChanged || activeSessionCredentialChanged) setSession(emptySession);
        if (!rememberClassStudentIdentity(identity)) throw new Error('当前浏览器无法保存学习身份，请检查存储权限后重试。');
        const restored = await restorePersistentStudentState(accessToken, {
          currentSession: rememberedCredentialChanged || activeSessionCredentialChanged
            ? emptySession
            : sessionAtEntry.current,
        });
        if (restored.resetLocalSession) setSession(emptySession);
        else if (restored.session) setSession(restored.session);
        navigate(routes.directory, { replace: true });
      })
      .catch((error) => {
        forgetClassStudentIdentity();
        setState({ loading: false, error: error.message || '学习身份验证失败，请向老师重新获取固定链接。' });
      });
  }, [navigate, session.selection?.classroomAccessToken, session.selection?.studentId, setSession, studentId]);

  return <main className="student-entry-page">
    <section className={`student-entry-panel${state.error ? ' error' : ''}`} role={state.error ? 'alert' : 'status'}>
      <BrandLogo label="云谷学习" />
      {state.loading ? <LoaderCircle className="student-entry-spinner" size={24} aria-hidden="true" /> : <AlertTriangle size={24} aria-hidden="true" />}
      <h1>{state.loading ? '正在确认学习身份' : '无法进入学习空间'}</h1>
      <p>{state.loading ? '确认后会进入你的固定学习主页。' : state.error}</p>
    </section>
  </main>;
}
