import request, { withQuery } from "../utils/request";

export const querySubjectList = (parameters) =>
  request(withQuery("/api/question/subject/list", parameters));

export const queryExamOptions = (parameters) =>
  request(withQuery("/api/exam/options", parameters));

export const queryQuestion = (parameters) =>
  request("/api/question/list/show", { method: "POST", body: parameters });

export const queryPaperList = (parameters) =>
  request("/api/paper/get/paperList", { method: "POST", body: parameters });

export const queryInquireTest = (parameters) =>
  request(withQuery("/api/paper/detail/byId", parameters));

export const queryTestView = (parameters) =>
  request(withQuery("/api/paper/detail", parameters));

export const queryViewOrDownPaper = (parameters) =>
  request(withQuery("/api/paper/viewOrDownPaper", parameters));
