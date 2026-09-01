import en from "./en";
import zhCN from "./zh-CN";

const REPAIRED_BATCH_19_KEYS = ["global.tenThousandCompactUnit"];

const CJK_TEXT = /[\u3400-\u9fff]/;

describe("i18n repair batch 19 locale entries", () => {
  it("keeps repaired keys available in both locales with English copy", () => {
    for (const key of REPAIRED_BATCH_19_KEYS) {
      expect(zhCN[key]).toBeTruthy();
      expect(en[key]).toBeTruthy();
      expect(en[key]).not.toMatch(CJK_TEXT);
    }
  });
});
