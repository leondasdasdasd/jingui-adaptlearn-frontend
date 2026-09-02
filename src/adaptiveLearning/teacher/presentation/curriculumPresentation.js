export function curriculumText(key, defaultVal, params = {}) {
  let str = defaultVal || key || "";
  if (params && typeof params === "object") {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`{\\\$${k}}`, "g"), String(v));
    }
  }
  return str;
}

export function curriculumCatalogLabel(type, id, defaultName) {
  return defaultName || id || "";
}

export function curriculumContentStatus(status) {
  if (status === "published") {
    return { label: "已发布", tone: "success" };
  }
  if (status === "draft") {
    return { label: "有草稿", tone: "warning" };
  }
  return { label: "未生成", tone: "neutral" };
}

export function curriculumGenerationStatus(status) {
  if (status === "generating") return { label: "生成中", tone: "info" };
  if (status === "queued") return { label: "排队中", tone: "neutral" };
  if (status === "completed") return { label: "已完成", tone: "success" };
  if (status === "failed") return { label: "失败", tone: "danger" };
  return { label: "空闲", tone: "neutral" };
}

export function curriculumOperationError(err) {
  return err?.message || "操作失败";
}

