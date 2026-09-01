/** @jest-environment node */

import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import {
  Navigate,
  RoutingProvider,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "./index";

function RoutingContractHarness() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  return (
    <div>
      <span>{`${params.studentId}:${location.pathname}:${searchParams.get("view")}`}</span>
      <button
        type="button"
        onClick={() =>
          navigate("/next", { replace: true, state: { source: "test" } })
        }
      >
        replace
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        back
      </button>
      <button
        type="button"
        onClick={() => setSearchParams({ view: "classroom" })}
      >
        query
      </button>
    </div>
  );
}

function createRoute() {
  return {
    history: {
      go: jest.fn(),
      push: jest.fn(),
      replace: jest.fn(),
    },
    location: {
      hash: "#section",
      pathname: "/adaptive-learning/student/student-1",
      search: "?view=textbook",
    },
    match: { params: { studentId: "student-1" } },
  };
}

const findButton = (renderer, label) =>
  renderer.root
    .findAllByType("button")
    .find((button) => button.children.includes(label));

describe("adaptive learning routing adapter", () => {
  it("maps Router 7 style hooks onto the Router 4 route contract", () => {
    const route = createRoute();
    const renderer = TestRenderer.create(
      <RoutingProvider route={route}>
        <RoutingContractHarness />
      </RoutingProvider>,
    );

    expect(renderer.root.findByType("span").children.join("")).toBe(
      "student-1:/adaptive-learning/student/student-1:textbook",
    );
    act(() => findButton(renderer, "replace").props.onClick());
    expect(route.history.replace).toHaveBeenCalledWith("/next", {
      source: "test",
    });
    act(() => findButton(renderer, "back").props.onClick());
    expect(route.history.go).toHaveBeenCalledWith(-1);
    act(() => findButton(renderer, "query").props.onClick());
    expect(route.history.push).toHaveBeenCalledWith({
      hash: "#section",
      pathname: "/adaptive-learning/student/student-1",
      search: "?view=classroom",
      state: undefined,
    });
  });

  it("supports declarative replacement redirects", () => {
    const route = createRoute();
    act(() => {
      TestRenderer.create(
        <RoutingProvider route={route}>
          <Navigate
            replace
            state={{ reason: "guard" }}
            to="/adaptive-learning/today"
          />
        </RoutingProvider>,
      );
    });
    expect(route.history.replace).toHaveBeenCalledWith(
      "/adaptive-learning/today",
      { reason: "guard" },
    );
  });
});
