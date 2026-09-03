const AVATAR_BG_COLORS = [
  "#e0e7ff",
  "#dbeafe",
  "#ede9fe",
  "#fae8ff",
  "#fce7f3",
  "#fee2e2",
  "#ffedd5",
  "#fef3c7",
  "#dcfce7",
  "#ccfbf1",
];

const AVATAR_TEXT_COLORS = [
  "#4338ca",
  "#1d4ed8",
  "#6d28d9",
  "#86198f",
  "#be185d",
  "#b91c1c",
  "#c2410c",
  "#b45309",
  "#15803d",
  "#0f766e",
];

/**
 * 将教师班级接口响应收敛为开课弹窗唯一使用的班级模型。
 * @param {unknown} payload 教师班级接口响应
 * @returns {Array<object>} 有稳定班级标识的班级列表
 */
export function mapTeacherClasses(payload) {
  const source = Array.isArray(payload) ? payload : payload?.classes;
  if (!Array.isArray(source)) return [];
  return source
    .map((item) => ({
      ...item,
      classId: String(item?.classId || item?.id || "").trim(),
      className: String(item?.className || item?.name || "未命名班级").trim(),
      studentCount: Number(item?.studentCount) || 0,
    }))
    .filter((item) => item.classId);
}

/**
 * 将班级学生接口响应转换为选择器模型，不补造不存在的学生。
 * @param {unknown} payload 班级学生接口响应
 * @param {object} classroom 当前班级
 * @returns {Array<object>} 有稳定学生标识的学生列表
 */
export function mapTeacherClassStudents(payload, classroom) {
  const source = Array.isArray(payload)
    ? payload
    : payload?.students || payload?.items;
  if (!Array.isArray(source)) return [];
  return source
    .map((item, index) => {
      const studentId = String(item?.studentId || item?.id || "").trim();
      const colorIndex =
        (index + classroom.classId.length) % AVATAR_BG_COLORS.length;
      return {
        studentId,
        studentName: String(
          item?.studentName || item?.name || item?.studentCode || "未命名学生",
        ).trim(),
        studentCode: String(item?.studentCode || item?.code || "—").trim(),
        classId: classroom.classId,
        className: classroom.className,
        avatarBg: AVATAR_BG_COLORS[colorIndex],
        avatarColor: AVATAR_TEXT_COLORS[colorIndex],
      };
    })
    .filter((item) => item.studentId);
}
