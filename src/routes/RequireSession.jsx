import { Navigate } from 'react-router-dom';
import { useLearningSession } from '../session/LearningSessionContext';
import { routes } from './routePaths';

export default function RequireSession({ children }) {
  const { session } = useLearningSession();
  const selection = session.learningFlow?.context?.selection || session.selection;
  if (!selection) return <Navigate to={routes.directory} replace />;
  return children;
}
