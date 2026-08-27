import { useCallback, useEffect, useRef, useState } from 'react';
import { LogIn, RefreshCw } from 'lucide-react';
import StatePanel from '../components/StatePanel';
import {
  getTeacherSession,
  questionTestLoginUrl,
  teacherAuthorizationMessage,
} from '../shared/infrastructure/teacherAuthorization';
import {
  clearTeacherStoragePartition,
  setTeacherStoragePartition,
} from '../teacher/data/teacherStoragePartition';
import { TeacherSessionProvider } from '../shared/application/TeacherSessionContext';
import '../teacher-authorization.css';

export default function TeacherAuthorizationBoundary({ children }) {
  const [state, setState] = useState({ status: 'loading', error: null });
  const verificationAttempt = useRef(0);

  const verify = useCallback(async ({ signal, silent = false } = {}) => {
    const attempt = ++verificationAttempt.current;
    clearTeacherStoragePartition();
    if (!silent) setState({ status: 'loading', error: null, loginPending: false });
    try {
      const principal = await getTeacherSession({ signal });
      if (attempt !== verificationAttempt.current) return;
      if (!setTeacherStoragePartition(principal.subjectFingerprint)) {
        const error = new Error('教师身份响应不完整');
        error.status = 503;
        throw error;
      }
      setState({ status: 'authenticated', error: null, loginPending: false, session: principal });
    } catch (error) {
      if (attempt === verificationAttempt.current && error?.name !== 'AbortError') {
        setState((current) => ({
          status: 'denied',
          error,
          loginPending: silent && current.loginPending && error?.status === 401,
        }));
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void verify({ signal: controller.signal });
    return () => {
      controller.abort();
      verificationAttempt.current += 1;
      clearTeacherStoragePartition();
    };
  }, [verify]);

  useEffect(() => {
    if (!state.loginPending) return undefined;
    const controller = new AbortController();
    const refresh = () => { void verify({ signal: controller.signal, silent: true }); };
    window.addEventListener('focus', refresh);
    const intervalId = window.setInterval(refresh, 2_000);
    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      setState((current) => ({ ...current, loginPending: false }));
    }, 120_000);
    return () => {
      controller.abort();
      window.removeEventListener('focus', refresh);
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [state.loginPending, verify]);

  const openQuestionTestLogin = useCallback(() => {
    if (!state.error?.loginUrl) return;
    const loginUrl = questionTestLoginUrl(state.error.loginUrl, window.location);
    if (!loginUrl) return;
    window.open(loginUrl, '_blank', 'noopener,noreferrer');
    setState((current) => ({ ...current, loginPending: true }));
  }, [state.error]);

  if (state.status === 'authenticated') {
    return <TeacherSessionProvider session={state.session}>{children}</TeacherSessionProvider>;
  }

  const copy = teacherAuthorizationMessage(state.error);
  return (
    <main className="teacher-authorization-boundary">
      <StatePanel
        tone={state.status === 'loading' ? 'loading' : 'error'}
        title={state.status === 'loading' ? '正在确认教师身份' : copy.title}
        description={state.status === 'loading' ? '正在连接云谷统一身份服务' : copy.description}
        action={state.status === 'denied' && copy.action === 'login'
          ? (
            <button className="teacher-primary" type="button" onClick={openQuestionTestLogin}>
              <LogIn size={15} />
              {state.loginPending ? '已打开测验，等待登录' : '前往测验登录'}
            </button>
          )
          : state.status === 'denied' && copy.canRetry
            ? (
              <button className="teacher-primary" type="button" onClick={() => { void verify(); }}>
                <RefreshCw size={15} />重新确认
              </button>
            )
            : null}
      />
    </main>
  );
}
