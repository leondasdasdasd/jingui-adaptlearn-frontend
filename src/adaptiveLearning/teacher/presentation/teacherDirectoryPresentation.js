import { locale, trans } from "../../../utils/i18n";

const PERIOD_STATUS = {
  DRAFT: { key: "draft", fallback: "未发布", tone: "muted" },
  PUBLISHED: { key: "published", fallback: "已发布", tone: "info" },
  ACTIVE: { key: "activePeriod", fallback: "进行中", tone: "info" },
  IN_PROGRESS: { key: "activePeriod", fallback: "进行中", tone: "info" },
  CLOSING: { key: "closing", fallback: "结算中", tone: "info" },
  COMPLETED: { key: "completed", fallback: "已结束", tone: "success" },
  CANCELLED: { key: "cancelled", fallback: "已取消", tone: "muted" },
};

/** 将班级状态转换为本地化展示合同。 */
export function classStatus(classInfo) {
  const status = String(classInfo?.status || "ACTIVE").toUpperCase();
  if (status === "ACTIVE") {
    return {
      active: true,
      label: trans("adaptiveLearning.directory.status.active", "使用中"),
      tone: "success",
    };
  }
  if (status === "INACTIVE" || status === "DISABLED") {
    return {
      active: false,
      label: trans("adaptiveLearning.directory.status.inactive", "已停用"),
      tone: "muted",
    };
  }
  return {
    active: false,
    label: trans("adaptiveLearning.directory.status.unavailable", "不可用"),
    tone: "muted",
  };
}

/** 将课堂状态码转换为本地化展示合同。 */
export function periodStatusMeta(status) {
  const statusCode = String(status || "").toUpperCase();
  const definition = PERIOD_STATUS[statusCode] || {
    key: "unknown",
    fallback: "状态未知",
    tone: "muted",
  };
  return {
    showFinalReport: statusCode === "COMPLETED",
    label: trans(
      `adaptiveLearning.directory.status.${definition.key}`,
      definition.fallback,
    ),
    tone: definition.tone,
  };
}

/** 按当前界面语言格式化课堂时间。 */
export function formatPeriodTime(value) {
  const timeNotSet = trans(
    "adaptiveLearning.directory.timeNotSet",
    "时间未设置",
  );
  if (!value) return timeNotSet;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return timeNotSet;
  return new Intl.DateTimeFormat(locale(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
