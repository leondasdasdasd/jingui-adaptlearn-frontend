import { trans } from "../../../utils/i18n";
import { START_CLASS_ISSUES } from "../domain/startClassIssue";

const ISSUE_COPY = {
  [START_CLASS_ISSUES.SELECT_COURSE]: ["selectCourse", "请选择系统课程"],
  [START_CLASS_ISSUES.SELECT_CLASS]: ["selectClass", "请选择真实班级"],
  [START_CLASS_ISSUES.SELECT_LESSONS]: [
    "selectLesson",
    "请至少关联 1 个已发布课时",
  ],
  [START_CLASS_ISSUES.PUBLISH_LESSONS]: [
    "publishLessons",
    "所选课时需要先发布",
  ],
  [START_CLASS_ISSUES.SELECT_STUDENTS]: [
    "selectStudents",
    "请至少选择 1 名学生",
  ],
  [START_CLASS_ISSUES.INVALID_START_TIME]: [
    "invalidStartTime",
    "开课时间无效",
  ],
  [START_CLASS_ISSUES.PREPARE_CONTENT_FAILED]: [
    "prepareContentFailed",
    "多课时课堂内容创建失败",
  ],
  [START_CLASS_ISSUES.CREATE_FAILED]: ["launchFailed", "启动课堂失败，请重试"],
};

/** 将稳定开课错误映射为当前语言，未知底层错误使用安全通用提示。 */
export function startClassIssueText(error) {
  const definition = ISSUE_COPY[error?.code || error?.message];
  const [key, fallback] = definition || ["launchFailed", "启动课堂失败，请重试"];
  return trans(`adaptiveLearning.startClass.${key}`, fallback);
}
