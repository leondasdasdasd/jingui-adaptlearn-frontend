import { buildClassroomReportCsv } from "./classroomReportExport";

describe("classroom report export", () => {
  test("exports the stable report view instead of transport DTO fields", () => {
    const csv = buildClassroomReportCsv(
      [
        {
          name: "Student A",
          learningMinutes: null,
          questionCount: 3,
          accuracy: 67,
          postMastery: 72,
          confidence: 85,
          scoreStatus: "PUBLISHED",
          scoreSummary: "Ready",
        },
      ],
      [],
    );

    expect(csv).toContain("Student A,,3,67%,72%,85%,PUBLISHED,Ready");
    expect(csv).not.toContain("undefined");
  });
});
