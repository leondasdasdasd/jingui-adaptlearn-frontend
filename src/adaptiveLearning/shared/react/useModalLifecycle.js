import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

let bodyScrollLockCount = 0;
let bodyOverflowBeforeLock = "";
const activeDialogStack = [];

/**
 *
 */
function lockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyScrollLockCount += 1;
}

/**
 *
 */
function unlockBodyScroll() {
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
  if (bodyScrollLockCount > 0) return;
  document.body.style.overflow = bodyOverflowBeforeLock;
  bodyOverflowBeforeLock = "";
}

/**
 *
 * @param dialog
 */
function visibleFocusableElements(dialog) {
  return [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => {
    if (element.hidden || element.getAttribute("aria-hidden") === "true")
      return false;
    if (typeof element.checkVisibility === "function")
      return element.checkVisibility();
    return true;
  });
}

/**
 *
 * @param event
 * @param dialog
 * @param focusable
 */
function tabFocusTarget(event, dialog, focusable) {
  if (focusable.length === 0) return dialog;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!dialog.contains(document.activeElement)) return first;
  if (event.shiftKey) {
    if (document.activeElement === first) return last;
    if (document.activeElement === dialog) return last;
    return null;
  }
  return document.activeElement === last ? first : null;
}

/**
 *
 * @param event
 * @param dialog
 */
function keepFocusInsideDialog(event, dialog) {
  if (event.key !== "Tab") return;
  if (!dialog) return;
  const target = tabFocusTarget(
    event,
    dialog,
    visibleFocusableElements(dialog),
  );
  if (!target) return;
  event.preventDefault();
  target.focus();
}

/**
 * 统一模态框的键盘焦点、页面滚动锁和关闭后焦点恢复。
 * @param {object} options 模态生命周期配置。
 * @param {boolean} options.open 是否启用生命周期。
 * @param {boolean} options.modal 是否锁定页面并限制 Tab 导航。
 * @param {{current: HTMLElement | null}} options.dialogRef 弹窗根节点。
 * @param {{current: HTMLElement | null}=} options.initialFocusRef 初始焦点。
 * @param {{current: HTMLElement | null}=} options.returnFocusRef 指定恢复焦点。
 * @param {() => void} options.onEscape Escape 关闭动作。
 */
export default function useModalLifecycle({
  open,
  modal = true,
  dialogRef,
  initialFocusRef,
  returnFocusRef,
  onEscape,
}) {
  const onEscapeRef = useRef(onEscape);
  const lifecycleTokenRef = useRef(null);
  onEscapeRef.current = onEscape;
  if (!lifecycleTokenRef.current) lifecycleTokenRef.current = {};

  useEffect(() => {
    if (!open) return;
    const lifecycleToken = lifecycleTokenRef.current;
    const previousFocus = document.activeElement;
    (initialFocusRef?.current || dialogRef.current)?.focus();
    if (modal) lockBodyScroll();
    activeDialogStack.push(lifecycleToken);

    const handleKeyDown = (event) => {
      if (activeDialogStack.at(-1) !== lifecycleToken) return;
      if (
        event.key === "Escape" &&
        !event.isComposing &&
        (modal || dialogRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        onEscapeRef.current?.();
        return;
      }
      if (modal) keepFocusInsideDialog(event, dialogRef.current);
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      const stackIndex = activeDialogStack.lastIndexOf(lifecycleToken);
      if (stackIndex >= 0) activeDialogStack.splice(stackIndex, 1);
      if (modal) unlockBodyScroll();
      const focusTarget = returnFocusRef?.current || previousFocus;
      if (focusTarget instanceof HTMLElement && focusTarget.isConnected)
        focusTarget.focus();
    };
  }, [dialogRef, initialFocusRef, modal, open, returnFocusRef]);
}
