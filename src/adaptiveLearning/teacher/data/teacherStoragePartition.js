let activePartition = "";

/**
 *
 * @param subjectFingerprint
 */
export function setTeacherStoragePartition(subjectFingerprint) {
  const value = String(subjectFingerprint || "").trim();
  if (!/^[\w:-]{16,128}$/.test(value)) {
    activePartition = "";
    return false;
  }
  activePartition = value;
  return true;
}

/**
 *
 */
export function clearTeacherStoragePartition() {
  activePartition = "";
}

/**
 *
 * @param baseKey
 */
export function teacherStorageKey(baseKey) {
  if (!activePartition) throw new Error("教师存储分区尚未建立");
  return `${baseKey}::${encodeURIComponent(activePartition)}`;
}
