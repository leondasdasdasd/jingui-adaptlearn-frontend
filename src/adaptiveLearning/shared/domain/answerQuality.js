/**
 * 归一化用于答案质量判断的文本，不改变原始作答内容。
 * @param {unknown} value 原始答案。
 * @returns {string} 紧凑的小写答案。
 */
export function normalizedAnswerText(value) {
  return String(value || "")
    .replaceAll(/\s+/g, "")
    .replaceAll(/[。，；]/g, "")
    .toLowerCase();
}

/**
 * 判断作答是否具备进入批改链路的最低信息质量。
 * @param {object} question 题目领域模型。
 * @param {unknown} answerText 原始答案。
 * @returns {{quality:string,message:string}} 答案质量结果。
 */
export function assessAnswerQuality(question, answerText) {
  const answer = String(answerText || "").trim();
  const compact = normalizedAnswerText(answer);
  if (!answer) return { quality: "no_attempt", message: "" };
  if (
    /随便|乱写|瞎写|蒙的|测试流程|开发工程师|无关答案|asdf|test/i.test(answer)
  ) {
    return {
      quality: "off_task",
      message:
        "这次答案还不能用于判断。请回到题目，写下一个相关条件、公式或步骤。",
    };
  }
  if (/^(?:不知道|不会|不懂|忘了|没学会)[!?。了！？]*$/.test(compact)) {
    return {
      quality: "no_attempt",
      message: "可以暂时不会，但请先写出你能确定的条件或第一步。",
    };
  }
  if (
    question.type === "fill_blank" &&
    /^(?:是的|不是|好的|对|错|随便|哈{2,})$/.test(compact)
  ) {
    return {
      quality: "off_task",
      message: "这次答案还不能用于判断。请填写题目需要的数值或符号。",
    };
  }
  return { quality: "valid", message: "" };
}
