import React from "react";
import PropTypes from "prop-types";

import { Navigate } from "../routing";
import { useLearningSession } from "../session/LearningSessionContext";
import { routes } from "./routePaths";

/**
 *
 * @param root0
 * @param root0.children
 */
export default function RequireSession({ children }) {
  const { session } = useLearningSession();
  const selection =
    session.learningFlow?.context?.selection || session.selection;
  if (!selection) return <Navigate to={routes.directory} replace />;
  return children;
}

RequireSession.propTypes = {
  children: PropTypes.node.isRequired,
};
