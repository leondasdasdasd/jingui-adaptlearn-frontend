import React from "react";

import { Navigate, useParams } from "../routing";

/**
 *
 */
export default function TeacherStudentHomeRoute() {
  const { periodId, studentId } = useParams();
  return (
    <Navigate
      to={`/adaptive-learning/teacher/periods/${periodId}/students/${studentId}`}
      replace
    />
  );
}
