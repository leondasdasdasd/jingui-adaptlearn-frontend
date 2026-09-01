function missingHostAdapter(name) {
  return Promise.reject(new Error(`HOST_ADAPTER_REQUIRED:${name}`));
}

export const querySubjectList = () => missingHostAdapter("querySubjectList");
export const queryExamOptions = () => missingHostAdapter("queryExamOptions");
