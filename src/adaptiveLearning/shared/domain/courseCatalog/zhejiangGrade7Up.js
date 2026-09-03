import { zhejiangGrade7UpAlgebraGeometryChapters } from "./zhejiangGrade7UpAlgebraGeometryChapters.js";
import { zhejiangGrade7UpNumberChapters } from "./zhejiangGrade7UpNumberChapters.js";

export const zhejiangGrade7Up = {
  id: "zhejiang-grade7-math-volume1",
  name: "七年级数学 · 上册",
  grade: "七年级上册",
  gradeKey: "grade7-up",
  subject: "数学",
  publisher: "浙教版",
  publisherKey: "zhejiang",
  chapters: [
    ...zhejiangGrade7UpNumberChapters,
    ...zhejiangGrade7UpAlgebraGeometryChapters,
  ],
};
