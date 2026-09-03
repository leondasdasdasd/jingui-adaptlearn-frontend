/** @vitest-environment jsdom */

import {
  curriculumCourseFromApi,
  fetchCurriculumCatalog,
  readCachedCurriculumChapter,
  readCachedCurriculumLesson,
} from "./curriculumCatalogRepository";

const payload = {
  catalogVersion: "v1",
  id: "science-zhejiang-grade7-up",
  subject: "science",
  subjectName: "科学",
  publisher: "zhejiang",
  publisherName: "浙教版",
  grade: "grade7-up",
  volume: "up",
  questionSourceScope: {
    subject: "science",
    publisher: "zhejiang",
    grade: "grade7-up",
    volume: "up",
  },
  chapters: [
    {
      id: "chapter-1",
      title: "走进科学",
      lessons: [
        {
          id: "science-1-1",
          title: "科学并不神秘",
          knowledgePoints: [
            { id: "kp-1", name: "观察和实验", discipline: "physics" },
          ],
        },
      ],
    },
  ],
};

describe("curriculumCatalogRepository", () => {
  beforeEach(() => sessionStorage.clear());

  it("maps and caches a real science catalog without math fallback", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    const course = await fetchCurriculumCatalog(
      { subject: "science", publisher: "zhejiang", grade: "grade7-up" },
      { fetchImpl },
    );
    expect(course.subject).toBe("科学");
    expect(course.questionSourceScope).toEqual(payload.questionSourceScope);
    expect(course.chapters[0].sections[0].knowledgePoints[0]).toMatchObject({
      discipline: "physics",
    });
    expect(readCachedCurriculumLesson("science-1-1")?.subject).toBe("科学");
    expect(
      readCachedCurriculumChapter("chapter-1", payload.id)?.course.subject,
    ).toBe("科学");
    expect(
      readCachedCurriculumChapter("chapter-1", "another-course"),
    ).toBeNull();
  });

  it("rejects lessons without explicit knowledge mappings", () => {
    expect(() =>
      curriculumCourseFromApi({
        ...payload,
        chapters: [
          {
            ...payload.chapters[0],
            lessons: [{ id: "empty", title: "空课时" }],
          },
        ],
      }),
    ).toThrow("真实教材目录缺少课时知识点映射");
  });
});
