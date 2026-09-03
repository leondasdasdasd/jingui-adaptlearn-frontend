import en from "./en";
import zhCN from "./zh-CN";

const KNOWLEDGE_DEFINITION_KEYS = [
  "basicSetting.knowledgeDefinition",
  "basicSetting.enterKnowledgeDefinition",
  "basicSetting.noKnowledgeDefinition",
  "basicSetting.expandKnowledge",
  "basicSetting.collapseKnowledge",
  "basicSetting.clickToMaintainKnowledgeDefinition",
  "basicSetting.knowledgeDefinitionPreview",
];

test("知识点定义文案应同时提供中文和英文", () => {
  KNOWLEDGE_DEFINITION_KEYS.forEach((key) => {
    expect(zhCN[key]).toEqual(expect.any(String));
    expect(zhCN[key].trim()).not.toBe("");
    expect(en[key]).toEqual(expect.any(String));
    expect(en[key].trim()).not.toBe("");
  });
});
