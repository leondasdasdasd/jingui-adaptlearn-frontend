import request, { withQuery } from "../utils/request";

export const getCourseList = (parameters) =>
  request(withQuery("/api/task/my/courses", parameters));

export const queryCourseStudents = (parameters) =>
  request(withQuery("/api/getCourseStudents", parameters));
