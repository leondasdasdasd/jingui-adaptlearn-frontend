import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { createPortal } from "react-dom";

import { getAdaptivePortalHost } from "../../shared/application/adaptivePortalHost";
import useStableId from "../../shared/react/useStableId";

import styles from "./DrawingBoardDialog.module.css";

const DEFAULT_SIZE = { width: 960, height: 604 };
const MIN_SIZE = 320;
const VIEWPORT_GUTTER = 24;
const KEYBOARD_STEP = 16;
const MOBILE_BREAKPOINT = 767;
const RESIZE_CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];

const ZERO_OFFSET = { x: 0, y: 0 };

const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), maximum);

const viewportSize = () => ({
  width:
    typeof window === "undefined"
      ? DEFAULT_SIZE.width + VIEWPORT_GUTTER * 2
      : window.innerWidth,
  height:
    typeof window === "undefined"
      ? DEFAULT_SIZE.height + VIEWPORT_GUTTER * 2
      : window.innerHeight,
});

const isMobileViewport = () =>
  typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;

const sizeBounds = () => {
  const viewport = viewportSize();
  return {
    maxWidth: Math.max(0, viewport.width - VIEWPORT_GUTTER * 2),
    maxHeight: Math.max(0, viewport.height - VIEWPORT_GUTTER * 2),
  };
};

const clampSize = ({ width, height }) => {
  const { maxWidth, maxHeight } = sizeBounds();
  const minWidth = Math.min(MIN_SIZE, maxWidth);
  const minHeight = Math.min(MIN_SIZE, maxHeight);
  return {
    width: clamp(width, minWidth, maxWidth),
    height: clamp(height, minHeight, maxHeight),
  };
};

const clampOffset = (current, { width, height }) => {
  const viewport = viewportSize();
  const horizontalLimit = Math.max(
    0,
    (viewport.width - width) / 2 - VIEWPORT_GUTTER,
  );
  const verticalLimit = Math.max(
    0,
    (viewport.height - height) / 2 - VIEWPORT_GUTTER,
  );
  return {
    x: clamp(current.x, -horizontalLimit, horizontalLimit),
    y: clamp(current.y, -verticalLimit, verticalLimit),
  };
};

const initialOffsetFor = (placement, size) => {
  if (placement !== "right") return ZERO_OFFSET;
  const viewport = viewportSize();
  return {
    x: Math.max(0, (viewport.width - size.width) / 2 - VIEWPORT_GUTTER),
    y: 0,
  };
};

const clampMoveDelta = (rectangle, delta) => {
  const viewport = viewportSize();
  return {
    x: clamp(
      delta.x,
      VIEWPORT_GUTTER - rectangle.left,
      viewport.width - VIEWPORT_GUTTER - rectangle.right,
    ),
    y: clamp(
      delta.y,
      VIEWPORT_GUTTER - rectangle.top,
      viewport.height - VIEWPORT_GUTTER - rectangle.bottom,
    ),
  };
};

const keyboardDelta = (key) => {
  if (key === "ArrowDown") return { x: 0, y: KEYBOARD_STEP };
  if (key === "ArrowLeft") return { x: -KEYBOARD_STEP, y: 0 };
  if (key === "ArrowRight") return { x: KEYBOARD_STEP, y: 0 };
  if (key === "ArrowUp") return { x: 0, y: -KEYBOARD_STEP };
  return null;
};

const resizeFromRectangle = (rectangle, corner, delta) => {
  const viewport = viewportSize();
  const minWidth = Math.min(MIN_SIZE, viewport.width - VIEWPORT_GUTTER * 2);
  const minHeight = Math.min(MIN_SIZE, viewport.height - VIEWPORT_GUTTER * 2);

  let left = rectangle.left;
  let right = rectangle.right;
  let top = rectangle.top;
  let bottom = rectangle.bottom;

  if (corner.endsWith("left")) {
    left = clamp(
      rectangle.left + delta.x,
      VIEWPORT_GUTTER,
      rectangle.right - minWidth,
    );
  } else {
    right = clamp(
      rectangle.right + delta.x,
      rectangle.left + minWidth,
      viewport.width - VIEWPORT_GUTTER,
    );
  }

  if (corner.startsWith("top")) {
    top = clamp(
      rectangle.top + delta.y,
      VIEWPORT_GUTTER,
      rectangle.bottom - minHeight,
    );
  } else {
    bottom = clamp(
      rectangle.bottom + delta.y,
      rectangle.top + minHeight,
      viewport.height - VIEWPORT_GUTTER,
    );
  }

  const size = { width: right - left, height: bottom - top };
  const offset = {
    x: (left + right) / 2 - viewport.width / 2,
    y: (top + bottom) / 2 - viewport.height / 2,
  };
  return { size, offset };
};

const resizeLabel = (corner) => {
  const labels = {
    "top-left": "从左上角调整画板尺寸",
    "top-right": "从右上角调整画板尺寸",
    "bottom-left": "从左下角调整画板尺寸",
    "bottom-right": "从右下角调整画板尺寸",
  };
  return labels[corner];
};

const joinClassNames = (...classNames) => classNames.filter(Boolean).join(" ");

/**
 * A controlled, movable drawing-board dialog.
 * Closing is delegated to the parent so it may export the board asynchronously
 * before changing `open` to false.
 * @param root0
 * @param root0.open
 * @param root0.onClose
 * @param root0.title
 * @param root0.children
 * @param root0.headerCenter
 * @param root0.headerActions
 * @param root0.ariaLabel
 * @param root0.className
 * @param root0.bodyClassName
 * @param root0.returnFocusRef
 * @param root0.busy
 * @param root0.modal
 * @param root0.defaultSize
 * @param root0.defaultPlacement
 * @param root0.resetLayoutOnOpen
 * @param root0.keepMounted
 * @param root0.onLayoutChange
 */
export default function DrawingBoardDialog({
  open,
  onClose,
  title = "画板作答",
  children,
  headerCenter,
  headerActions,
  ariaLabel,
  className,
  bodyClassName,
  returnFocusRef,
  busy = false,
  modal = true,
  defaultSize = DEFAULT_SIZE,
  defaultPlacement = "center",
  resetLayoutOnOpen = true,
  keepMounted = false,
  onLayoutChange,
}) {
  const titleId = useStableId("drawing-board-dialog-title");
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const interactionRef = useRef(null);
  const sizeRef = useRef(DEFAULT_SIZE);
  const offsetRef = useRef(ZERO_OFFSET);
  const onCloseRef = useRef(onClose);
  const onLayoutChangeRef = useRef(onLayoutChange);
  const hasOpenedRef = useRef(false);
  const mobileViewportRef = useRef(isMobileViewport());
  const [size, setSize] = useState(() => clampSize(defaultSize));
  const [offset, setOffset] = useState(() =>
    initialOffsetFor(defaultPlacement, clampSize(defaultSize)),
  );

  onCloseRef.current = onClose;
  onLayoutChangeRef.current = onLayoutChange;
  sizeRef.current = size;
  offsetRef.current = offset;

  useLayoutEffect(() => {
    if (!open) return;
    onLayoutChangeRef.current?.();
  }, [open, offset.x, offset.y, size.height, size.width]);

  useEffect(() => {
    if (!open) return;

    const shouldResetLayout = resetLayoutOnOpen || !hasOpenedRef.current;
    const nextSize = shouldResetLayout
      ? clampSize(defaultSize)
      : clampSize(sizeRef.current);
    const nextOffset = shouldResetLayout
      ? initialOffsetFor(defaultPlacement, nextSize)
      : clampOffset(offsetRef.current, nextSize);
    hasOpenedRef.current = true;
    mobileViewportRef.current = isMobileViewport();
    sizeRef.current = nextSize;
    offsetRef.current = nextOffset;
    setSize(nextSize);
    setOffset(nextOffset);

    previousFocusRef.current = document.activeElement;
    const focusFrame = window.requestAnimationFrame(() =>
      dialogRef.current?.focus(),
    );
    const previousOverflow = document.body.style.overflow;
    if (modal) document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        !event.isComposing &&
        (modal || dialogRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (!modal || event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [
        ...dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter(
        (element) =>
          element.getClientRects().length > 0 &&
          element.getAttribute("aria-hidden") !== "true",
      );

      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown, true);
      if (modal) document.body.style.overflow = previousOverflow;
      interactionRef.current = null;
      const previousFocus = returnFocusRef?.current || previousFocusRef.current;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, [
    defaultPlacement,
    defaultSize,
    modal,
    open,
    resetLayoutOnOpen,
    returnFocusRef,
  ]);

  useEffect(() => {
    if (!open) return;
    const handleViewportResize = () => {
      const mobile = isMobileViewport();
      const returnedToDesktop = mobileViewportRef.current && !mobile;
      mobileViewportRef.current = mobile;
      const nextSize = clampSize(
        returnedToDesktop ? defaultSize : sizeRef.current,
      );
      const nextOffset = returnedToDesktop
        ? initialOffsetFor(defaultPlacement, nextSize)
        : clampOffset(offsetRef.current, nextSize);
      sizeRef.current = nextSize;
      offsetRef.current = nextOffset;
      setSize(nextSize);
      setOffset(nextOffset);
    };
    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, [defaultPlacement, defaultSize, open]);

  const portalHost = getAdaptivePortalHost();
  if ((!open && !keepMounted) || !portalHost) return null;

  const startMove = (event) => {
    if (event.button !== 0 || window.matchMedia("(max-width: 767px)").matches)
      return;
    const rectangle = dialogRef.current?.getBoundingClientRect();
    if (!rectangle) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      mode: "move",
      pointerId: event.pointerId,
      rectangle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffset: offsetRef.current,
    };
  };

  const startResize = (event, corner) => {
    if (event.button !== 0 || window.matchMedia("(max-width: 767px)").matches)
      return;
    const rectangle = dialogRef.current?.getBoundingClientRect();
    if (!rectangle) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      mode: "resize",
      corner,
      pointerId: event.pointerId,
      rectangle,
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
  };

  const moveInteraction = (event) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    event.preventDefault();
    const delta = {
      x: event.clientX - interaction.startClientX,
      y: event.clientY - interaction.startClientY,
    };

    if (interaction.mode === "move") {
      const nextDelta = clampMoveDelta(interaction.rectangle, delta);
      const nextOffset = {
        x: interaction.startOffset.x + nextDelta.x,
        y: interaction.startOffset.y + nextDelta.y,
      };
      offsetRef.current = nextOffset;
      setOffset(nextOffset);
      return;
    }

    const next = resizeFromRectangle(
      interaction.rectangle,
      interaction.corner,
      delta,
    );
    sizeRef.current = next.size;
    offsetRef.current = next.offset;
    setSize(next.size);
    setOffset(next.offset);
  };

  const endInteraction = (event) => {
    if (interactionRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    interactionRef.current = null;
  };

  const moveWithKeyboard = (event) => {
    const delta = keyboardDelta(event.key);
    const rectangle = dialogRef.current?.getBoundingClientRect();
    if (!delta || !rectangle) return;
    event.preventDefault();
    const nextDelta = clampMoveDelta(rectangle, delta);
    const nextOffset = {
      x: offsetRef.current.x + nextDelta.x,
      y: offsetRef.current.y + nextDelta.y,
    };
    offsetRef.current = nextOffset;
    setOffset(nextOffset);
  };

  const resizeWithKeyboard = (event, corner) => {
    const delta = keyboardDelta(event.key);
    const rectangle = dialogRef.current?.getBoundingClientRect();
    if (!delta || !rectangle) return;
    event.preventDefault();
    const next = resizeFromRectangle(rectangle, corner, delta);
    sizeRef.current = next.size;
    offsetRef.current = next.offset;
    setSize(next.size);
    setOffset(next.offset);
  };

  const { maxWidth, maxHeight } = sizeBounds();

  return createPortal(
    <div
      className={joinClassNames(
        styles.overlay,
        !modal && styles.nonModalOverlay,
        !open && styles.hidden,
      )}
      hidden={!open}
    >
      <section
        ref={dialogRef}
        className={joinClassNames(
          styles.dialog,
          !modal && styles.nonModalDialog,
          className,
        )}
        role="dialog"
        aria-modal={modal ? "true" : undefined}
        aria-busy={busy}
        aria-labelledby={ariaLabel ? undefined : titleId}
        aria-label={ariaLabel}
        tabIndex={-1}
        data-width={Math.round(size.width)}
        data-height={Math.round(size.height)}
        data-busy={busy ? "true" : "false"}
        data-modal={modal ? "true" : "false"}
        style={{
          width: size.width,
          height: size.height,
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        }}
      >
        <header className={styles.header}>
          <div
            className={styles.titleRegion}
            onPointerCancel={endInteraction}
            onPointerDown={startMove}
            onPointerMove={moveInteraction}
            onPointerUp={endInteraction}
          >
            <button
              className={styles.moveHandle}
              type="button"
              aria-label="移动画板弹窗"
              title="拖动或使用方向键移动画板"
              onKeyDown={moveWithKeyboard}
            >
              <GripVertical aria-hidden="true" size={18} />
            </button>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
          </div>
          {headerCenter ? (
            <div className={styles.headerCenter}>{headerCenter}</div>
          ) : null}
          {headerActions ? (
            <div className={styles.headerActions}>{headerActions}</div>
          ) : null}
        </header>

        <div className={joinClassNames(styles.body, bodyClassName)}>
          {children}
        </div>

        {RESIZE_CORNERS.map((corner) => (
          <button
            key={corner}
            className={joinClassNames(
              styles.resizeHandle,
              styles[corner.replace("-", "")],
            )}
            type="button"
            role="slider"
            aria-label={resizeLabel(corner)}
            aria-valuemin={Math.min(MIN_SIZE, maxWidth, maxHeight)}
            aria-valuemax={Math.max(maxWidth, maxHeight)}
            aria-valuenow={Math.round(Math.max(size.width, size.height))}
            aria-valuetext={`${Math.round(size.width)} × ${Math.round(size.height)} 像素`}
            title={`${resizeLabel(corner)}（方向键微调）`}
            data-corner={corner}
            onKeyDown={(event) => resizeWithKeyboard(event, corner)}
            onPointerCancel={endInteraction}
            onPointerDown={(event) => startResize(event, corner)}
            onPointerMove={moveInteraction}
            onPointerUp={endInteraction}
          />
        ))}
      </section>
    </div>,
    portalHost,
  );
}
