import { useCallback } from "react";

import { useNavigate } from "../routing";
import {
  isTeacherLessonPreview,
  learningSessionExitPath,
} from "../student/application/teacherLessonPreview";
import { useLearningSession } from "./LearningSessionContext";

/**
 * 统一学习流程退出行为；教师试做退出时清除模拟会话并返回原课时。
 * @returns {(fallback: string) => void} 学习流程退出动作
 */
export function useLearningSessionExit() {
  const navigate = useNavigate();
  const { session, restorePersistentSession } = useLearningSession();
  return useCallback(
    (fallback) => {
      const returnPath = learningSessionExitPath(session, fallback);
      if (isTeacherLessonPreview(session)) restorePersistentSession();
      navigate(returnPath);
    },
    [navigate, restorePersistentSession, session],
  );
}
