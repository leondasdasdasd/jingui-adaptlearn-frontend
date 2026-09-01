import { storageKeys } from "../../shared/contracts/storageKeys.js";
import {
  readTeacherContent,
  writeTeacherContent,
} from "./teacherContentRepository.js";
import {
  clearTeacherStoragePartition,
  setTeacherStoragePartition,
  teacherStorageKey,
} from "./teacherStoragePartition.js";

const TEST_PARTITION = "teacher-content-test-0001";

describe("teacherContentRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setTeacherStoragePartition(TEST_PARTITION);
  });

  afterEach(() => {
    window.localStorage.clear();
    clearTeacherStoragePartition();
  });

  it("restores generated assessment matrices as an editable draft", () => {
    const initial = readTeacherContent();
    const lesson = initial["section-1-1"];
    const generatedMatrix = {
      knowledgePointId: "kp-positive-negative",
      cells: [
        {
          matrixCellId: "kp-positive-negative:CR:A",
          domain: "CR",
          targetLevel: "A",
          role: "CORE",
        },
      ],
    };

    expect(
      writeTeacherContent({
        ...initial,
        "section-1-1": {
          ...lesson,
          assessmentMatrices: {
            ...lesson.assessmentMatrices,
            "kp-positive-negative": generatedMatrix,
          },
          status: "draft",
          updatedAt: "2026-08-31T13:00:00.000Z",
        },
      }),
    ).toBe(true);

    const restored = readTeacherContent()["section-1-1"];
    expect(restored.status).toBe("draft");
    expect(restored.assessmentMatrices["kp-positive-negative"]).toMatchObject(
      generatedMatrix,
    );
    expect(
      window.localStorage.getItem(
        teacherStorageKey(storageKeys.teacherContent),
      ),
    ).toContain('"status":"draft"');
  });

  it("upgrades stored OpenMAIC URLs to the runtime public base", () => {
    const initial = readTeacherContent();
    const lesson = initial["section-1-1"];
    writeTeacherContent({
      ...initial,
      "section-1-1": {
        ...lesson,
        learningContent: {
          ...lesson.learningContent,
          composite: {
            classroomId: "room-stored",
            classroomUrl: "/openmaic/classroom/room-stored",
            status: "READY",
          },
        },
        status: "draft",
      },
    });

    expect(
      readTeacherContent()["section-1-1"].learningContent.composite
        .classroomUrl,
    ).toBe("/openmaic/classroom/room-stored");
  });
});
