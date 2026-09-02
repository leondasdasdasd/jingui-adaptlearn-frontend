export function getTeacherStoragePartitionKey(teacherId) {
  return `teacher_partition_${teacherId || "default"}`;
}

export function clearTeacherStoragePartition() {
  return true;
}
