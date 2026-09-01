import {
  teacherClassesFromApi,
  teacherPeriodsFromApi,
} from "./classroomDirectoryMapper";

describe("classroom directory mapper", () => {
  test("maps class response variants to one directory shape", () => {
    expect(
      teacherClassesFromApi({
        items: [
          {
            id: "class-1",
            name: "七年级一班",
            rosterSize: "3",
            status: "ACTIVE",
            internalField: "not-exposed",
          },
        ],
      }),
    ).toEqual([
      {
        classId: "class-1",
        className: "七年级一班",
        studentCount: 3,
        status: "ACTIVE",
      },
    ]);
  });

  test("maps period response variants and selects one activity time", () => {
    expect(
      teacherPeriodsFromApi([
        {
          id: "period-1",
          name: "第一课",
          class: { id: "class-1", name: "七年级一班" },
          status: "COMPLETED",
          studentCount: 28,
          onlineCount: 0,
          avgAccuracy: 86,
          completionRate: 100,
          completedAt: "2026-08-31T09:00:00.000Z",
          createdAt: "2026-08-30T09:00:00.000Z",
        },
      ]),
    ).toEqual([
      {
        periodId: "period-1",
        title: "第一课",
        classId: "class-1",
        className: "七年级一班",
        status: "COMPLETED",
        studentCount: 28,
        onlineCount: 0,
        avgAccuracy: 86,
        completionRate: 100,
        activityAt: "2026-08-31T09:00:00.000Z",
      },
    ]);
  });

  test("keeps unavailable live aggregates empty instead of fabricating zero", () => {
    expect(teacherPeriodsFromApi([{ id: "period-1" }])[0]).toEqual(
      expect.objectContaining({
        studentCount: null,
        onlineCount: null,
        avgAccuracy: null,
        completionRate: null,
      }),
    );
  });
});
