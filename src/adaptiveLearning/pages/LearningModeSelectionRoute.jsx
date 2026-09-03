import React from "react";
import LearningModeSelectionPage from "./LearningModeSelectionPage";
import { ALL_COURSES, course as defaultCourse } from "../shared/domain/courseCatalog";
import { readSelectedCoursePreference } from "../student/data/studentPreferencesRepository";
import { useNavigate } from "../routing";
import { routes } from "../routes/routePaths";

export default function LearningModeSelectionRoute() {
  const navigate = useNavigate();
  const selectedCourseId = readSelectedCoursePreference();
  const currentCourse =
    ALL_COURSES.find((c) => c.id === selectedCourseId) || defaultCourse;

  const handleSelectMode = (modeId) => {
    // 设置并跳转到具体功能页
    navigate(`${routes.directory}?mode=${modeId}&selected=1`);
  };

  return (
    <LearningModeSelectionPage
      currentCourse={currentCourse}
      onSelectMode={handleSelectMode}
    />
  );
}
