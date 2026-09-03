import React from "react";
import { act, render, waitFor } from "@testing-library/react";

import { classroomAccessTokenFromLocation } from "../shared/contracts/classroomAccessLink";
import {
  fetchClassStudentIdentity,
  storeClassStudentIdentity,
} from "../student/data/classStudentIdentityRepository";
import { restorePersistentStudentState } from "../student/data/persistentStudentStateRepository";
import StudentEntryRoute from "./StudentEntryRoute";

let mockRouteStudentId = "student-1";
const mockNavigate = vi.fn();
const mockSetSession = vi.fn();

vi.mock("../routing", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ studentId: mockRouteStudentId }),
}));
vi.mock("../components/BrandLogo", () => ({
  default: ({ label }) => <div>{label}</div>,
}));
vi.mock("../session/LearningSessionContext", () => ({
  emptySession: { selection: null },
  useLearningSession: () => ({
    session: { selection: null },
    setSession: mockSetSession,
  }),
}));
vi.mock("../shared/contracts/classroomAccessLink", () => ({
  classroomAccessTokenFromLocation: vi.fn(),
  removeClassroomAccessTokenFromAddress: vi.fn(),
}));
vi.mock("../student/data/classStudentIdentityRepository", () => ({
  fetchClassStudentIdentity: vi.fn(),
  forgetClassStudentIdentity: vi.fn(),
  readClassStudentIdentity: vi.fn(() => null),
  storeClassStudentIdentity: vi.fn(),
}));
vi.mock("../student/data/persistentStudentStateRepository", () => ({
  restorePersistentStudentState: vi.fn(),
}));

function deferred() {
  let resolve;
  const promise = new Promise((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

describe("StudentEntryRoute identity isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouteStudentId = "student-1";
    classroomAccessTokenFromLocation
      .mockReturnValueOnce("token-1")
      .mockReturnValue("token-2");
    restorePersistentStudentState.mockResolvedValue({
      session: null,
      resetLocalSession: false,
    });
  });

  test("ignores a late identity after the route changes to another student", async () => {
    const firstIdentity = deferred();
    fetchClassStudentIdentity
      .mockReturnValueOnce(firstIdentity.promise)
      .mockResolvedValueOnce({
        accessToken: "token-2",
        classId: "class-1",
        studentId: "student-2",
      });

    const view = render(<StudentEntryRoute />);
    mockRouteStudentId = "student-2";
    view.rerender(<StudentEntryRoute />);

    await waitFor(() =>
      expect(storeClassStudentIdentity).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: "student-2" }),
      ),
    );
    await act(async () => {
      firstIdentity.resolve({
        accessToken: "token-1",
        classId: "class-1",
        studentId: "student-1",
      });
      await firstIdentity.promise;
    });

    expect(storeClassStudentIdentity).not.toHaveBeenCalledWith(
      expect.objectContaining({ studentId: "student-1" }),
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  test("does not persist identity after unmount", async () => {
    const identity = deferred();
    fetchClassStudentIdentity.mockReturnValueOnce(identity.promise);
    const view = render(<StudentEntryRoute />);
    view.unmount();

    await act(async () => {
      identity.resolve({
        accessToken: "token-1",
        classId: "class-1",
        studentId: "student-1",
      });
      await identity.promise;
    });

    expect(storeClassStudentIdentity).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
