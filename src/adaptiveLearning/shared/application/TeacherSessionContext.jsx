import React, { createContext, useContext, useState } from "react";

const TeacherSessionContext = createContext({
  teacher: { id: "teacher-1", name: "张老师" },
  currentPeriod: null,
  setCurrentPeriod: () => {},
});

export function TeacherSessionProvider({ children }) {
  const [currentPeriod, setCurrentPeriod] = useState({ id: "period-1", name: "初一(1)班" });
  return (
    <TeacherSessionContext.Provider value={{ teacher: { id: "teacher-1", name: "张老师" }, currentPeriod, setCurrentPeriod }}>
      {children}
    </TeacherSessionContext.Provider>
  );
}

export function useTeacherSession() {
  return useContext(TeacherSessionContext);
}
