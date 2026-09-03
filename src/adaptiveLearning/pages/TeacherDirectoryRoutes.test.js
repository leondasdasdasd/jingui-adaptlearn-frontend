import directoryViewState from "../teacher/presentation/directoryViewState";
import {
  classStatus,
  formatPeriodTime,
  periodStatusMeta,
} from "../teacher/presentation/teacherDirectoryPresentation";

describe("teacher directory presentation", () => {
  afterEach(() => {
    delete window.globalLange;
  });

  test("localizes class and learning-period statuses without exposing raw codes", () => {
    window.globalLange = "en";

    expect(classStatus({ status: "ACTIVE" })).toMatchObject({
      active: true,
      label: "Active",
    });
    expect(classStatus({ status: "SERVER_INTERNAL_STATUS" })).toMatchObject({
      active: false,
      label: "Unavailable",
    });
    expect(periodStatusMeta("COMPLETED")).toMatchObject({
      showFinalReport: true,
      label: "Completed",
    });
    expect(periodStatusMeta("SERVER_INTERNAL_STATUS")).toMatchObject({
      showFinalReport: false,
      label: "Unknown status",
    });
  });

  test("uses the active locale for status and missing-time copy", () => {
    window.globalLange = "zh-CN";

    expect(classStatus({ status: "DISABLED" }).label).toBe("已停用");
    expect(periodStatusMeta("CLOSING").label).toBe("结算中");
    expect(formatPeriodTime("not-a-date")).toBe("时间未设置");

    window.globalLange = "en";
    expect(formatPeriodTime("not-a-date")).toBe("Time not set");
  });

  test("projects mutually exclusive directory states", () => {
    expect(directoryViewState({ loading: true, error: "" }, 0)).toBe("loading");
    expect(directoryViewState({ loading: false, error: "failed" }, 0)).toBe(
      "error",
    );
    expect(directoryViewState({ loading: false, error: "" }, 0)).toBe("empty");
    expect(directoryViewState({ loading: false, error: "" }, 2)).toBe("ready");
  });
});
