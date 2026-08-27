import { course } from '../../shared/domain/courseCatalog.js';
import { clientEvents, storageKeys } from '../../shared/contracts/storageKeys.js';
import { createDefaultContent, normalizeLessonContent } from '../../shared/domain/defaultLessonContent.js';
import { emitClientEvent, readJson, writeJson } from '../../shared/infrastructure/browserStorage.js';
import { teacherStorageKey } from './teacherStoragePartition.js';

// 教师端唯一可写的课时内容仓储。迁移后只需把这里替换成教师内容 API。
export function readTeacherContent() {
  const stored = readJson(teacherStorageKey(storageKeys.teacherContent), {});
  return normalizeLessonContent({ ...createDefaultContent(), ...stored });
}

export function writeTeacherContent(content) {
  const stored = writeJson(teacherStorageKey(storageKeys.teacherContent), content);
  if (stored) emitClientEvent(clientEvents.contentUpdated, { lessonIds: Object.keys(content) });
  return stored;
}

export function curriculumLessons() {
  return course.chapters.flatMap((chapter) => chapter.sections.map((section) => ({
    ...section,
    chapter,
    grade: section.grade || course.grade,
    subject: section.subject || course.subject,
  })));
}
