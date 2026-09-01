/** @jest-environment node */

import { questionPlayerLocale } from "./questionPlayerLocale";

test.each([
  ["en", "en-US"],
  ["en-US", "en-US"],
  ["zh-CN", "zh-CN"],
  ["", "zh-CN"],
])(
  "maps application locale %s to QuestionPlayer locale %s",
  (source, expected) => {
    expect(questionPlayerLocale(source)).toBe(expected);
  },
);
