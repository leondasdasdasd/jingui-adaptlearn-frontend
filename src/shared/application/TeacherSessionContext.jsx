import { createContext, useContext } from 'react';

const TeacherSessionContext = createContext(null);

export function TeacherSessionProvider({ session, children }) {
  return (
    <TeacherSessionContext.Provider value={session}>
      {children}
    </TeacherSessionContext.Provider>
  );
}

export function useTeacherSession() {
  const session = useContext(TeacherSessionContext);
  if (!session) throw new Error('TeacherSessionProvider is required');
  return session;
}
