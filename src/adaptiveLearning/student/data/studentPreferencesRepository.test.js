import { storageKeys } from "../../shared/contracts/storageKeys.js";
import {
  readSelectedCoursePreference,
  writeSelectedCoursePreference,
} from "./studentPreferencesRepository.js";

describe("studentPreferencesRepository", () => {
  beforeEach(() => window.localStorage.clear());

  it("通过统一存储键保存并读取学生选择的课程", () => {
    expect(readSelectedCoursePreference()).toBe("");

    writeSelectedCoursePreference("zhejiang-grade-7-up");

    expect(readSelectedCoursePreference()).toBe("zhejiang-grade-7-up");
    expect(
      JSON.parse(window.localStorage.getItem(storageKeys.selectedCourse)),
    ).toBe("zhejiang-grade-7-up");
  });
});
