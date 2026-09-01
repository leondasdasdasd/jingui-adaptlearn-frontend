/** @jest-environment node */
import React from "react";
import TestRenderer from "react-test-renderer";

import useStableId from "./useStableId";

function StableIdProbe({ label }) {
  const id = useStableId("probe");
  return (
    <span data-testid={label} id={id}>
      {label}
    </span>
  );
}

describe("useStableId", () => {
  it("keeps one id across rerenders and separates component instances", () => {
    const view = TestRenderer.create(<StableIdProbe label="first" />);
    const firstId = view.root.findByProps({ "data-testid": "first" }).props.id;
    view.update(<StableIdProbe label="updated" />);

    expect(view.root.findByProps({ "data-testid": "updated" }).props.id).toBe(
      firstId,
    );

    const secondView = TestRenderer.create(<StableIdProbe label="second" />);
    expect(
      secondView.root.findByProps({ "data-testid": "second" }).props.id,
    ).not.toBe(firstId);
  });
});
