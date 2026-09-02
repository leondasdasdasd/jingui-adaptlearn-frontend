export function curriculumLessons(course) {
  if (!course || !course.chapters) return [];
  const lessons = [];
  for (const chapter of course.chapters) {
    for (const section of chapter.sections || []) {
      lessons.push({
        id: section.id,
        title: section.title || section.name,
        name: section.name || section.title,
        chapter: {
          id: chapter.id,
          title: chapter.title,
        },
      });
    }
  }
  return lessons;
}

export function readTeacherContent() {
  try {
    const raw = localStorage.getItem("yungu_teacher_content");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function writeTeacherContent(data) {
  try {
    localStorage.setItem("yungu_teacher_content", JSON.stringify(data));
  } catch {}
  return data;
}

