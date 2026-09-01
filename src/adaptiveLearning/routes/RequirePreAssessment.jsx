import React from "react";
import PropTypes from "prop-types";

import { Navigate } from "../routing";
import { useLearningSession } from "../session/LearningSessionContext";
import { isPreAssessmentGateSatisfied } from "../student/domain/preAssessmentAccess";
import { routes } from "./routePaths";

/**
 *
 * @param root0
 * @param root0.children
 */
export default function RequirePreAssessment({ children }) {
  const { session } = useLearningSession();
  if (!isPreAssessmentGateSatisfied(session)) {
    return <Navigate to={routes.preAssessment} replace />;
  }
  return children;
}

RequirePreAssessment.propTypes = {
  children: PropTypes.node.isRequired,
};
