import { localizedQuestionResult } from "../../shared/presentation/questionResultPresentation";
import {
  resultAuthorityPresentation,
  resultQuestionStateLabel,
  resultScorePresentation,
  shouldShowResultValues,
} from "./resultPagePresentation";

describe("result page presentation", () => {
  const originalLanguage = window.globalLange;

  afterEach(() => {
    window.globalLange = originalLanguage;
  });

  test("renders result states in English", () => {
    window.globalLange = "en";
    expect(resultQuestionStateLabel("partial")).toBe("Partially correct");
    expect(localizedQuestionResult(0.75, "Pending")).toBe("75% correct");
    expect(
      resultScorePresentation({
        kind: "pendingReview",
        ready: false,
        pendingReview: true,
      }),
    ).toMatchObject({
      kind: "pendingReview",
      label: "Awaiting teacher review",
    });
  });

  test("localizes preview synchronization status", () => {
    window.globalLange = "zh-CN";
    expect(
      resultAuthorityPresentation({
        isAuthoritative: false,
        scoreState: { kind: "practiceComplete", ready: false },
        pendingSyncCount: 2,
      }),
    ).toEqual({
      label: "未同步预览",
      description:
        "当前结果只是本机未同步预览，不会写入长期掌握记录。还有 2 道记录正在同步。",
    });
  });

  test("keeps non-ready authoritative results hidden and explains the state", () => {
    window.globalLange = "en";
    const scoreState = { kind: "partialEvidence", ready: false };
    expect(shouldShowResultValues({ isAuthoritative: true, scoreState })).toBe(
      false,
    );
    expect(
      resultAuthorityPresentation({
        isAuthoritative: true,
        scoreState,
        pendingSyncCount: 0,
      }),
    ).toEqual({
      label: "Incomplete evidence",
      description:
        "Some required evidence is still missing, so mastery and score rate are hidden for now.",
    });
  });

  test("shows metrics after an authoritative score is ready", () => {
    expect(
      shouldShowResultValues({
        isAuthoritative: true,
        scoreState: { kind: "published", ready: true, published: true },
      }),
    ).toBe(true);
  });
});
