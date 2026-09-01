import { queryExamOptions, querySubjectList } from "../../../services/example";
import {
  getCourseList,
  queryCourseStudents,
} from "../../../services/publishToStudent";
import { trans } from "../../../utils/i18n";
import { loginRedirect } from "../../../utils/utils";
import {
  mapPlatformCourseRoster,
  mapPlatformCourses,
  mapPlatformSubjects,
} from "./platformTeachingDirectoryMapper";

/**
 *
 * @param response
 * @param fallbackMessage
 */
function requireSuccessfulResponse(response, fallbackMessage) {
  if (response?.ifLogin === false) {
    loginRedirect();
    const error = new Error(
      trans(
        "adaptiveLearning.startClass.sessionExpired",
        "登录已失效，请重新登录",
      ),
    );
    error.code = "PLATFORM_LOGIN_REQUIRED";
    throw error;
  }
  if (!response?.status) {
    throw new Error(response?.message || fallbackMessage);
  }
  return response;
}

/**
 * 读取测验平台学科；Cookie 与登录跳转仍由项目既有 request 边界负责。
 * @returns {Promise<Array<{subjectId:string, subjectName:string}>>} 真实系统学科。
 */
export async function fetchPlatformSubjects() {
  const response = requireSuccessfulResponse(
    await querySubjectList(),
    trans("adaptiveLearning.startClass.subjectsLoadFailed", "学科加载失败"),
  );
  return mapPlatformSubjects(response);
}

/**
 *
 * @param subjectId
 */
/**
 * 读取测验平台当前学期，所有真实授课关系都必须绑定该权威时间范围。
 * @returns {Promise<{semesterId:string,semesterName:string}>} 当前学期。
 */
export async function fetchPlatformCurrentSemester() {
  const response = requireSuccessfulResponse(
    await queryExamOptions(),
    trans(
      "adaptiveLearning.startClass.semesterLoadFailed",
      "当前学期加载失败",
    ),
  );
  const current = (
    Array.isArray(response.content) ? response.content : []
  ).find((item) => item?.current === true);
  const semesterId = String(current?.semesterId ?? "").trim();
  if (!semesterId) {
    throw new Error(
      trans(
        "adaptiveLearning.startClass.noCurrentSemester",
        "没有可用的当前学期",
      ),
    );
  }
  return {
    semesterId,
    semesterName: String(
      current?.semesterName || current?.semesterEnName || semesterId,
    ).trim(),
  };
}

/**
 * 只读取当前教师在指定学期的真实课程。学校课程不代表任教关系，不能用于开课。
 * @param {string} subjectId 系统学科标识。
 * @param {string} semesterId 当前学期标识。
 * @returns {Promise<Array<object>>} 当前教师课程。
 */
export async function fetchPlatformCourses(subjectId, semesterId) {
  const response = requireSuccessfulResponse(
    await getCourseList({
      subjectId,
      semesterId,
      ifQueryHistory: false,
    }),
    trans(
      "adaptiveLearning.startClass.coursesLoadFailed",
      "教师课程加载失败",
    ),
  );
  return mapPlatformCourses(response);
}

/**
 * 按系统课程读取真实班级和学生，不读取自适应服务演示花名册。
 * @param {string} courseId 系统课程标识。
 * @param {string} semesterId 当前学期标识。
 * @returns {Promise<Array<object>>} 课程班级及嵌套学生。
 */
export async function fetchPlatformCourseRoster(courseId, semesterId) {
  const response = requireSuccessfulResponse(
    await queryCourseStudents({ courseId, semesterId }),
    trans(
      "adaptiveLearning.startClass.rosterLoadFailed",
      "班级与学生加载失败",
    ),
  );
  return mapPlatformCourseRoster(response);
}
