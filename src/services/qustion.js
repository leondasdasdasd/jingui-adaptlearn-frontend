import request, { withQuery } from "../utils/request";

export const stageSubjectList = (parameters) =>
  request(withQuery("/api/question/stageSubject/list", parameters));

export const teachingMaterialAndGradeList = (parameters) =>
  request(
    withQuery("/api/question/teachingMaterialAndGrade/list", parameters),
  );
