import { Navigate } from 'react-router-dom';
import { routes } from './routePaths';
import { useLearningSession } from '../session/LearningSessionContext';
import { isPreAssessmentGateSatisfied } from '../student/domain/preAssessmentAccess';

export default function RequirePreAssessment({ children }) {
  const { session } = useLearningSession();
  if (!isPreAssessmentGateSatisfied(session)) {
    return <Navigate to={routes.preAssessment} replace />;
  }
  return children;
}
