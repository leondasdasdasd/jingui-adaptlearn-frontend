import {
  createLearningPeriod,
  publishLearningPeriod,
} from "../../shared/infrastructure/classroomApi";
import { rememberCurrentPeriod } from "./classroomApiRepository";
import {
  launchLearningPeriod,
  toLearningPeriodCreateDto,
} from "./startClassRepository";

jest.mock("../../shared/infrastructure/classroomApi", () => ({
  createLearningPeriod: jest.fn(),
  publishLearningPeriod: jest.fn(),
}));
jest.mock("./classroomApiRepository", () => ({
  rememberCurrentPeriod: jest.fn(),
}));

const launch = {
  teachingCourse: {
    courseId: "2155",
    courseName: "七年级数学",
    subjectId: "2",
    semesterId: "165",
    semesterName: "2026-2027 第一学期",
  },
  linkedLessonContent: {
    contentVersionId: "version-1",
    lessonIds: ["lesson-1", "lesson-2"],
    title: "跨章节课堂",
  },
  rosterSelection: {
    classId: "7651",
    className: "七年级1班",
    students: [{ studentId: "52311", studentName: "学生一" }],
  },
  schedule: { scheduledStartAt: "2026-08-31T08:30:00.000Z" },
};

describe("startClassRepository", () => {
  it("keeps the real course separate from linked lessons in the service DTO", () => {
    expect(toLearningPeriodCreateDto(launch)).toEqual(
      expect.objectContaining({
        teachingCourseId: "2155",
        semesterId: "165",
        linkedLessonIds: ["lesson-1", "lesson-2"],
        contentVersionId: "version-1",
        classId: "7651",
      }),
    );
  });

  it("maps the transport response to a stable period id and publishes it", async () => {
    createLearningPeriod.mockResolvedValue({ period: { id: "period-1" } });
    publishLearningPeriod.mockResolvedValue({ id: "period-1" });

    await expect(launchLearningPeriod(launch)).resolves.toEqual({
      periodId: "period-1",
    });
    expect(publishLearningPeriod).toHaveBeenCalledWith("period-1");
    expect(rememberCurrentPeriod).toHaveBeenCalledWith("period-1");
  });
});
