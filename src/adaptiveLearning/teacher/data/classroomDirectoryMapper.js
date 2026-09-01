function classPayloadItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.classes)) return payload.classes;
  return Array.isArray(payload?.items) ? payload.items : [];
}

function firstPresent(values, fallback = "") {
  return (
    values.find((value) => value !== undefined && value !== null) ?? fallback
  );
}

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/** 将课堂服务班级 DTO 转成教师目录唯一数据形状。 */
export function teacherClassesFromApi(payload) {
  return classPayloadItems(payload)
    .map((classInfo) => ({
      classId: firstPresent([classInfo?.classId, classInfo?.id]),
      className: firstPresent([classInfo?.className, classInfo?.name]),
      studentCount: Number(
        firstPresent(
          [
            classInfo?.studentCount,
            classInfo?.rosterSize,
            classInfo?.students?.length,
          ],
          0,
        ),
      ),
      status: classInfo?.status || "ACTIVE",
    }))
    .filter((classInfo) => classInfo.classId);
}

/** 将课堂服务课时 DTO 转成教师报告目录唯一数据形状。 */
export function teacherPeriodsFromApi(payload) {
  const periods = Array.isArray(payload) ? payload : [];
  return periods
    .map((period) => ({
      periodId: firstPresent([period?.periodId, period?.id]),
      title: firstPresent([period?.title, period?.name]),
      classId: firstPresent([period?.classId, period?.class?.id]),
      className: firstPresent([period?.className, period?.class?.name]),
      status: period?.status || "",
      studentCount: finiteNumber(
        firstPresent(
          [period?.studentCount, period?.rosterSize, period?.students?.length],
          null,
        ),
      ),
      onlineCount: finiteNumber(period?.onlineCount),
      avgAccuracy: finiteNumber(period?.avgAccuracy ?? period?.accuracy),
      completionRate: finiteNumber(period?.completionRate),
      activityAt: firstPresent([
        period?.completedAt,
        period?.publishedAt,
        period?.scheduledStartAt,
        period?.createdAt,
      ]),
    }))
    .filter((period) => period.periodId);
}
