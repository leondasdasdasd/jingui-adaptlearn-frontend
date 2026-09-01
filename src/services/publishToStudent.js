function missingHostAdapter(name) {
  return Promise.reject(new Error(`HOST_ADAPTER_REQUIRED:${name}`));
}

export const getCourseList = () => missingHostAdapter("getCourseList");
export const queryCourseStudents = () =>
  missingHostAdapter("queryCourseStudents");
