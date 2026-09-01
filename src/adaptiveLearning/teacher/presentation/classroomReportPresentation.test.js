import {
  classroomReportMasteryStatus,
  classroomReportText,
} from "./classroomReportPresentation";

describe("classroom report presentation", () => {
  afterEach(() => {
    delete window.globalLange;
  });

  test("renders Chinese and English as mutually exclusive locales", () => {
    window.globalLange = "zh-CN";
    expect(classroomReportText("studentAnalysis")).toBe("学生分析");
    expect(classroomReportMasteryStatus("PENDING")).toBe("待判断");

    window.globalLange = "en";
    expect(classroomReportText("studentAnalysis")).toBe("Student analysis");
    expect(classroomReportMasteryStatus("PENDING")).toBe("Pending evidence");
  });

  test("localizes count-based report summaries", () => {
    window.globalLange = "en";
    expect(
      classroomReportText("knowledgeAnswerSummary", {
        students: 8,
        average: 3.5,
      }),
    ).toBe("8 students answered · 3.5 questions each");
  });
});
