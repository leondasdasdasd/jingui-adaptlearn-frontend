import React, { createContext, useContext } from "react";
import PropTypes from "prop-types";

const TeacherSessionContext = createContext(null);

/**
 *
 * @param root0
 * @param root0.session
 * @param root0.children
 */
export function TeacherSessionProvider({ session, children }) {
  return (
    <TeacherSessionContext.Provider value={session}>
      {children}
    </TeacherSessionContext.Provider>
  );
}

TeacherSessionProvider.propTypes = {
  children: PropTypes.node.isRequired,
  session: PropTypes.shape({
    displayName: PropTypes.string,
    subjectFingerprint: PropTypes.string.isRequired,
  }).isRequired,
};

/**
 *
 */
export function useTeacherSession() {
  const session = useContext(TeacherSessionContext);
  if (!session) throw new Error("TeacherSessionProvider is required");
  return session;
}
