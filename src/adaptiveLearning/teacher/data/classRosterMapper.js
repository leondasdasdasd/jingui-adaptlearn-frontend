/**
 * 返回接口候选字段中的首个有效值。
 * @param {Array<unknown>} values 候选值
 * @param {unknown} fallback 缺省值
 * @returns {unknown} 首个有效值或缺省值
 */
function firstPresent(values, fallback = "") {
  return (
    values.find((value) => value !== undefined && value !== null) ?? fallback
  );
}

/**
 * 读取课堂接口兼容的学生数组包络。
 * @param {unknown} payload 接口响应
 * @returns {Array<object>} 原始学生记录
 */
function payloadItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.students)) return payload.students;
  return Array.isArray(payload?.items) ? payload.items : [];
}

/**
 * 将接口计数转换为非负数字，缺失证据保留为空。
 * @param {unknown} value 接口计数
 * @returns {number | null} 稳定计数
 */
function finiteCount(value) {
  if (value === undefined || value === null || value === "") return null;
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : null;
}

/**
 * @param {object} payload 原始学生或凭证响应
 * @returns {object} 稳定凭证模型
 */
function credentialFromApi(payload) {
  const source = payload?.credential || payload?.accessCredential || payload || {};
  return {
    status: String(source.status || ""),
    accessToken:
      typeof source.accessToken === "string" ? source.accessToken : "",
    updatedAt: firstPresent([
      source.updatedAt,
      source.rotatedAt,
      source.issuedAt,
    ]),
  };
}

/**
 * @param {object} payload 原始学生响应
 * @returns {object} 稳定学习活动模型
 */
function activityFromApi(payload) {
  const source = payload?.activity || {};
  return {
    sessionCount: finiteCount(
      firstPresent([source.sessionCount, payload?.sessionCount], null),
    ),
    answerCount: finiteCount(
      firstPresent([source.answerCount, payload?.answerCount], null),
    ),
    lastActiveAt: firstPresent([
      source.lastActiveAt,
      payload?.lastActiveAt,
    ]),
  };
}

/**
 * @param {object} payload 原始学生响应
 * @returns {object} 稳定学生模型
 */
function studentFromApi(payload) {
  return {
    studentId: String(firstPresent([payload?.studentId, payload?.id])).trim(),
    studentName: String(
      firstPresent([payload?.studentName, payload?.name, payload?.studentCode]),
    ).trim(),
    rosterNumber: firstPresent([
      payload?.rosterNumber,
      payload?.studentNumber,
      payload?.studentCode,
      payload?.code,
    ]),
    credential: credentialFromApi(payload),
    activity: activityFromApi(payload),
  };
}

/**
 * 将班级详情和学生概览响应转换为花名册页面唯一模型。
 * @param {unknown} classPayload 班级详情接口响应
 * @param {unknown} rosterPayload 学生概览接口响应
 * @returns {object} 花名册页面模型
 */
export function classRosterFromApi(classPayload, rosterPayload) {
  const classSource =
    classPayload?.classInfo || classPayload?.class || classPayload || {};
  const detailsById = new Map(
    payloadItems(classSource)
      .map((student) => studentFromApi(student))
      .filter((student) => student.studentId)
      .map((student) => [student.studentId, student]),
  );
  const students = payloadItems(rosterPayload)
    .map((student) => studentFromApi(student))
    .filter((student) => student.studentId)
    .map((student) => {
      const details = detailsById.get(student.studentId);
      if (!details) return student;
      return {
        ...details,
        ...student,
        credential: {
          status: student.credential.status || details.credential.status,
          accessToken:
            student.credential.accessToken || details.credential.accessToken,
          updatedAt:
            student.credential.updatedAt || details.credential.updatedAt,
        },
        activity: {
          sessionCount:
            student.activity.sessionCount ?? details.activity.sessionCount,
          answerCount:
            student.activity.answerCount ?? details.activity.answerCount,
          lastActiveAt:
            student.activity.lastActiveAt || details.activity.lastActiveAt,
        },
      };
    });

  return {
    classInfo: {
      classId: String(firstPresent([classSource.classId, classSource.id])).trim(),
      className: String(
        firstPresent([classSource.className, classSource.name]),
      ).trim(),
    },
    students,
  };
}

/**
 * 将凭证写接口响应转换为页面可安全合并的稳定模型。
 * @param {unknown} payload 凭证写接口响应
 * @returns {object} 稳定凭证模型
 */
export function classRosterCredentialFromApi(payload) {
  return credentialFromApi(payload);
}
