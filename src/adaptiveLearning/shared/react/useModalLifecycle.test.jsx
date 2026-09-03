import React, { useRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import PropTypes from "prop-types";

import useModalLifecycle from "./useModalLifecycle";

function ModalHarness({ label = "弹窗", onEscape }) {
  const dialogRef = useRef(null);
  const initialFocusRef = useRef(null);
  useModalLifecycle({
    open: true,
    dialogRef,
    initialFocusRef,
    onEscape,
  });
  return (
    <section ref={dialogRef} role="dialog" aria-label={label} tabIndex={-1}>
      <button type="button">{label}返回</button>
      <button ref={initialFocusRef} type="button">
        {label}继续
      </button>
    </section>
  );
}

ModalHarness.propTypes = {
  label: PropTypes.string,
  onEscape: PropTypes.func.isRequired,
};

describe("useModalLifecycle", () => {
  it("traps focus, locks scrolling, handles Escape and restores focus", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const onEscape = vi.fn();
    const { unmount } = render(<ModalHarness onEscape={onEscape} />);

    const first = screen.getByRole("button", { name: "弹窗返回" });
    const last = screen.getByRole("button", { name: "弹窗继续" });
    expect(last).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Tab" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);

    unmount();
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("gives keyboard ownership and scroll locking to the top dialog", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const onParentEscape = vi.fn();
    const onChildEscape = vi.fn();
    const { rerender, unmount } = render(
      <>
        <ModalHarness label="父级" onEscape={onParentEscape} />
        <ModalHarness label="子级" onEscape={onChildEscape} />
      </>,
    );

    expect(screen.getByRole("button", { name: "子级继续" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onChildEscape).toHaveBeenCalledTimes(1);
    expect(onParentEscape).not.toHaveBeenCalled();

    rerender(<ModalHarness label="父级" onEscape={onParentEscape} />);
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("button", { name: "父级继续" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onParentEscape).toHaveBeenCalledTimes(1);

    unmount();
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
