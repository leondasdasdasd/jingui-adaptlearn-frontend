export const START_CLASS_ISSUES = Object.freeze({
  SELECT_COURSE: "SELECT_COURSE",
  SELECT_CLASS: "SELECT_CLASS",
  SELECT_LESSONS: "SELECT_LESSONS",
  PUBLISH_LESSONS: "PUBLISH_LESSONS",
  SELECT_STUDENTS: "SELECT_STUDENTS",
  INVALID_START_TIME: "INVALID_START_TIME",
  PREPARE_CONTENT_FAILED: "PREPARE_CONTENT_FAILED",
  CREATE_FAILED: "CREATE_FAILED",
});

/** 创建跨 domain/repository 边界传递的稳定开课错误。 */
export function startClassIssue(code, ErrorType = Error) {
  const error = new ErrorType(code);
  error.code = code;
  return error;
}
