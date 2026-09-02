import React, { createContext, useContext, useState } from "react";

export const emptySession = {
  sessionId: null,
  studentId: null,
};

const LearningSessionContext = createContext({
  session: null,
  setSession: () => {},
  startSession: () => {},
  endSession: () => {},
});

export function LearningSessionProvider({ children }) {
  const [session, setSession] = useState({
    sessionId: "mock-session-1",
    studentId: "student-1",
    startedAt: new Date().toISOString(),
  });

  const startSession = (data) => setSession({ ...data, startedAt: new Date().toISOString() });
  const endSession = () => setSession(null);

  return (
    <LearningSessionContext.Provider
      value={{ session, setSession, startSession, endSession }}
    >
      {children}
    </LearningSessionContext.Provider>
  );
}

export function useLearningSession() {
  return useContext(LearningSessionContext);
}
