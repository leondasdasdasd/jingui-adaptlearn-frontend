/** @vitest-environment node */

import {
  classroomAccessTokenFromLocation,
  classroomStudentAccessUrl,
  removeClassroomAccessTokenFromAddress,
} from "./classroomAccessLink";

describe("classroom access link", () => {
  test("builds a student link for the host application's hash router", () => {
    expect(
      classroomStudentAccessUrl("student 1", "token/1", {
        origin: "http://leon.local.yungu-inc.org:8000",
        pathname: "/",
      }),
    ).toBe(
      "http://leon.local.yungu-inc.org:8000/#/adaptive-learning/student/student%201?accessToken=token%2F1",
    );
  });

  test("reads the access token from hash-route or legacy query parameters", () => {
    expect(
      classroomAccessTokenFromLocation({
        hash: "#/adaptive-learning/student/s1?accessToken=hash-token",
        search: "?accessToken=query-token",
      }),
    ).toBe("hash-token");
    expect(
      classroomAccessTokenFromLocation({ hash: "", search: "?accessToken=q" }),
    ).toBe("q");
  });

  test("removes one-time credentials without dropping other route state", () => {
    const history = { replaceState: vi.fn() };
    removeClassroomAccessTokenFromAddress(
      {
        hash: "#/adaptive-learning/student/s1?accessToken=secret&view=home",
        pathname: "/",
        search: "?accessToken=legacy&source=classroom",
      },
      history,
    );
    expect(history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/?source=classroom#/adaptive-learning/student/s1?view=home",
    );
  });
});
