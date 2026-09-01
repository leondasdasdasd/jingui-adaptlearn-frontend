import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ALargeSmall,
  ArrowUpRight,
  ChevronDown,
  Circle,
  CircleDashed,
  CopyPlus,
  Diamond,
  Eraser,
  Hand,
  Highlighter,
  ImagePlus,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Shapes,
  Square,
  StickyNote,
  Trash2,
  Triangle,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { createPortal } from "react-dom";

import { getAdaptivePortalHost } from "../../shared/application/adaptivePortalHost";
import useStableId from "../../shared/react/useStableId";

import styles from "./DrawingBoardToolbar.module.css";

export const DRAWING_BOARD_COLORS = [
  { id: "black", label: "黑色" },
  { id: "grey", label: "灰色" },
  { id: "light-violet", label: "浅紫色" },
  { id: "violet", label: "紫色" },
  { id: "blue", label: "蓝色" },
  { id: "light-blue", label: "浅蓝色" },
  { id: "yellow", label: "黄色" },
  { id: "orange", label: "橙色" },
  { id: "green", label: "绿色" },
  { id: "light-green", label: "浅绿色" },
  { id: "light-red", label: "浅红色" },
  { id: "red", label: "红色" },
];

export const DRAWING_BOARD_OPACITIES = [25, 50, 75, 100];

export const DRAWING_BOARD_FILLS = [
  { id: "none", label: "无填充" },
  { id: "semi", label: "半填充" },
  { id: "solid", label: "实心填充" },
];

export const DRAWING_BOARD_DASHES = [
  { id: "draw", label: "手绘线" },
  { id: "dashed", label: "虚线" },
  { id: "dotted", label: "点线" },
  { id: "solid", label: "实线" },
];

export const DRAWING_BOARD_SIZES = [
  { id: "s", label: "2px" },
  { id: "m", label: "中" },
  { id: "l", label: "粗" },
  { id: "xl", label: "特粗" },
];

const SHAPE_TOOLS = [
  { id: "rectangle", label: "矩形", Icon: Square },
  { id: "ellipse", label: "椭圆", Icon: Circle },
  { id: "triangle", label: "三角形", Icon: Triangle },
  { id: "diamond", label: "菱形", Icon: Diamond },
  { id: "line", label: "直线", Icon: Minus },
  { id: "highlight", label: "荧光笔", Icon: Highlighter },
];

const MORE_TOOLS = [
  { id: "arrow", label: "箭头", Icon: ArrowUpRight },
  { id: "text", label: "文本", Icon: Type },
  { id: "note", label: "便签", Icon: StickyNote },
  { id: "media", label: "图片 / 媒体", Icon: ImagePlus },
];

const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), maximum);

/**
 *
 * @param event
 */
function closeOwningMenu(event) {
  event.currentTarget
    .closest("[data-drawing-board-menu]")
    ?.dispatchEvent(
      new CustomEvent("drawing-board-menu-select", { bubbles: true }),
    );
}

/**
 *
 * @param root0
 * @param root0.label
 * @param root0.Icon
 * @param root0.active
 * @param root0.disabled
 * @param root0.onClick
 * @param root0.className
 * @param root0.children
 */
function ToolbarButton({
  label,
  Icon,
  active,
  disabled,
  onClick,
  className = "",
  children,
}) {
  return (
    <button
      className={`${styles.button} ${className}`.trim()}
      type="button"
      aria-label={label}
      aria-pressed={typeof active === "boolean" ? active : undefined}
      disabled={disabled}
      title={label}
      onClick={onClick}
    >
      {Icon ? <Icon aria-hidden="true" size={16} /> : null}
      {children}
    </button>
  );
}

/**
 *
 * @param root0
 * @param root0.label
 * @param root0.Icon
 * @param root0.active
 * @param root0.disabled
 * @param root0.triggerContent
 * @param root0.menuClassName
 * @param root0.children
 */
function ToolbarMenu({
  label,
  Icon,
  active = false,
  disabled = false,
  triggerContent,
  menuClassName = "",
  children,
}) {
  const menuId = useStableId("drawing-board-menu");
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8, maxHeight: 320 });
  const portalHost = getAdaptivePortalHost();

  const updatePosition = () => {
    if (!triggerRef.current || !menuRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const gutter = 8;
    const gap = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = Math.min(menuRect.width, viewportWidth - gutter * 2);
    const menuHeight = Math.min(menuRect.height, viewportHeight - gutter * 2);
    const belowTop = triggerRect.bottom + gap;
    const aboveTop = triggerRect.top - gap - menuHeight;
    const top =
      belowTop + menuHeight <= viewportHeight - gutter
        ? belowTop
        : Math.max(gutter, aboveTop);
    setPosition({
      left: clamp(
        triggerRect.left,
        gutter,
        Math.max(gutter, viewportWidth - menuWidth - gutter),
      ),
      top,
      maxHeight: Math.max(120, viewportHeight - top - gutter),
    });
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (
        triggerRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      )
        return;
      setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    const handleSelect = () => setOpen(false);

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    menuRef.current?.addEventListener(
      "drawing-board-menu-select",
      handleSelect,
    );
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      menuRef.current?.removeEventListener(
        "drawing-board-menu-select",
        handleSelect,
      );
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        className={styles.menuTrigger}
        type="button"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        title={label}
        onClick={() => setOpen((current) => !current)}
      >
        {triggerContent ||
          (Icon ? <Icon aria-hidden="true" size={16} /> : null)}
        <ChevronDown aria-hidden="true" className={styles.chevron} size={12} />
      </button>
      {open && portalHost
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              className={`${styles.menu} ${menuClassName}`.trim()}
              data-drawing-board-menu=""
              role="dialog"
              aria-label={label}
              style={{
                left: position.left,
                top: position.top,
                maxHeight: position.maxHeight,
              }}
            >
              {children}
            </div>,
            portalHost,
          )
        : null}
    </>
  );
}

/**
 *
 * @param root0
 * @param root0.label
 * @param root0.active
 * @param root0.disabled
 * @param root0.onClick
 * @param root0.Icon
 * @param root0.children
 * @param root0.className
 */
function MenuOption({
  label,
  active,
  disabled,
  onClick,
  Icon,
  children,
  className = "",
}) {
  return (
    <button
      className={`${styles.menuOption} ${className}`.trim()}
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      title={label}
      onClick={(event) => {
        onClick?.();
        closeOwningMenu(event);
      }}
    >
      {Icon ? <Icon aria-hidden="true" size={16} /> : null}
      {children || <span>{label}</span>}
    </button>
  );
}

/**
 * Pure presentation toolbar for the drawing board. It owns only transient menu
 * visibility; every drawing, history, style, media, and zoom action is emitted
 * through callbacks so the board adapter remains the single source of truth.
 * @param root0
 * @param root0.activeTool
 * @param root0.activeShape
 * @param root0.color
 * @param root0.opacity
 * @param root0.fill
 * @param root0.dash
 * @param root0.size
 * @param root0.zoom
 * @param root0.disabled
 * @param root0.canUndo
 * @param root0.canRedo
 * @param root0.canDelete
 * @param root0.canDuplicate
 * @param root0.onToolChange
 * @param root0.onShapeChange
 * @param root0.onColorChange
 * @param root0.onOpacityChange
 * @param root0.onFillChange
 * @param root0.onDashChange
 * @param root0.onSizeChange
 * @param root0.onUndo
 * @param root0.onRedo
 * @param root0.onDelete
 * @param root0.onDuplicate
 * @param root0.onZoomOut
 * @param root0.onZoomReset
 * @param root0.onZoomIn
 * @param root0.className
 */
export default function DrawingBoardToolbar({
  activeTool = "draw",
  activeShape = "",
  color = "black",
  opacity = 100,
  fill = "none",
  dash = "draw",
  size = "s",
  zoom = 100,
  disabled = false,
  canUndo = false,
  canRedo = false,
  canDelete = false,
  canDuplicate = false,
  onToolChange,
  onShapeChange,
  onColorChange,
  onOpacityChange,
  onFillChange,
  onDashChange,
  onSizeChange,
  onUndo,
  onRedo,
  onDelete,
  onDuplicate,
  onZoomOut,
  onZoomReset,
  onZoomIn,
  className = "",
}) {
  const selectedColor =
    DRAWING_BOARD_COLORS.find((item) => item.id === color) ||
    DRAWING_BOARD_COLORS[0];
  const zoomLabel = Number.isFinite(Number(zoom))
    ? `${Math.round(Number(zoom))}%`
    : "100%";

  return (
    <div
      className={`${styles.toolbar} ${className}`.trim()}
      role="toolbar"
      aria-label="画板工具"
    >
      <div className={styles.scroller}>
        <div className={styles.track}>
          <div className={styles.group} role="group" aria-label="历史操作">
            <ToolbarButton
              label="撤销"
              Icon={Undo2}
              disabled={disabled || !canUndo}
              onClick={onUndo}
            />
            <ToolbarButton
              label="重做"
              Icon={Redo2}
              disabled={disabled || !canRedo}
              onClick={onRedo}
            />
          </div>

          <span className={styles.separator} aria-hidden="true" />

          <div className={styles.group} role="group" aria-label="选区操作">
            <ToolbarButton
              label="复制所选内容"
              Icon={CopyPlus}
              disabled={disabled || !canDuplicate}
              onClick={onDuplicate}
            />
            <ToolbarButton
              label="删除所选内容"
              Icon={Trash2}
              disabled={disabled || !canDelete}
              onClick={onDelete}
            />
          </div>

          <span className={styles.separator} aria-hidden="true" />

          <div className={styles.group} role="group" aria-label="常用工具">
            <ToolbarButton
              label="选择并调整"
              Icon={MousePointer2}
              active={activeTool === "select"}
              disabled={disabled}
              onClick={() => onToolChange?.("select")}
            />
            <ToolbarButton
              label="移动画布"
              Icon={Hand}
              active={activeTool === "hand"}
              disabled={disabled}
              onClick={() => onToolChange?.("hand")}
            />
            <ToolbarButton
              label="自由绘制"
              Icon={Pencil}
              active={activeTool === "draw"}
              disabled={disabled}
              onClick={() => onToolChange?.("draw")}
            />
            <ToolbarButton
              label="橡皮擦"
              Icon={Eraser}
              active={activeTool === "eraser"}
              disabled={disabled}
              onClick={() => onToolChange?.("eraser")}
            />
          </div>

          <ToolbarMenu
            label="形状与标注工具"
            Icon={Shapes}
            active={SHAPE_TOOLS.some(
              (item) => item.id === activeShape || item.id === activeTool,
            )}
            disabled={disabled}
            menuClassName={styles.toolMenu}
          >
            <p className={styles.menuTitle}>形状与标注</p>
            <div
              className={styles.optionGrid}
              role="group"
              aria-label="形状与标注"
            >
              {SHAPE_TOOLS.map(({ id, label, Icon }) => (
                <MenuOption
                  key={id}
                  label={label}
                  Icon={Icon}
                  active={activeShape === id || activeTool === id}
                  disabled={disabled}
                  onClick={() =>
                    onShapeChange ? onShapeChange(id) : onToolChange?.(id)
                  }
                />
              ))}
            </div>
          </ToolbarMenu>

          <ToolbarMenu
            label="更多画板工具"
            Icon={ALargeSmall}
            active={MORE_TOOLS.some((item) => item.id === activeTool)}
            disabled={disabled}
            menuClassName={styles.toolMenu}
          >
            <p className={styles.menuTitle}>更多工具</p>
            <div
              className={styles.optionGrid}
              role="group"
              aria-label="更多工具"
            >
              {MORE_TOOLS.map(({ id, label, Icon }) => (
                <MenuOption
                  key={id}
                  label={label}
                  Icon={Icon}
                  active={activeTool === id}
                  disabled={disabled}
                  onClick={() => onToolChange?.(id)}
                />
              ))}
            </div>
          </ToolbarMenu>

          <span className={styles.separator} aria-hidden="true" />

          <ToolbarMenu
            label={`画笔样式：${selectedColor.label}，${DRAWING_BOARD_SIZES.find((item) => item.id === size)?.label || "2px"}`}
            active={
              color !== "black" ||
              opacity !== 100 ||
              fill !== "none" ||
              dash !== "draw" ||
              size !== "s"
            }
            disabled={disabled}
            triggerContent={
              <span className={styles.styleSummary} aria-hidden="true">
                <span
                  className={`${styles.colorSwatch} ${styles[`color_${selectedColor.id}`]}`}
                />
                <Minus size={16} />
                <span>
                  {DRAWING_BOARD_SIZES.find((item) => item.id === size)
                    ?.label || "2px"}
                </span>
              </span>
            }
            menuClassName={styles.styleMenu}
          >
            <section className={styles.styleSection}>
              <p className={styles.menuTitle}>颜色</p>
              <div
                className={styles.colorGrid}
                role="group"
                aria-label="线条和文字颜色"
              >
                {DRAWING_BOARD_COLORS.map((item) => (
                  <MenuOption
                    key={item.id}
                    label={item.label}
                    active={color === item.id}
                    disabled={disabled}
                    className={styles.colorOption}
                    onClick={() => onColorChange?.(item.id)}
                  >
                    <span
                      className={`${styles.colorSwatch} ${styles[`color_${item.id}`]}`}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </MenuOption>
                ))}
              </div>
            </section>

            <section className={styles.styleSection}>
              <p className={styles.menuTitle}>透明度</p>
              <div
                className={styles.segmented}
                role="group"
                aria-label="透明度"
              >
                {DRAWING_BOARD_OPACITIES.map((value) => (
                  <MenuOption
                    key={value}
                    label={`${value}% 透明度`}
                    active={opacity === value}
                    disabled={disabled}
                    onClick={() => onOpacityChange?.(value)}
                  >
                    <span>{value}%</span>
                  </MenuOption>
                ))}
              </div>
            </section>

            <section className={styles.styleSection}>
              <p className={styles.menuTitle}>填充</p>
              <div
                className={styles.segmented}
                role="group"
                aria-label="填充样式"
              >
                {DRAWING_BOARD_FILLS.map((item) => (
                  <MenuOption
                    key={item.id}
                    label={item.label}
                    active={fill === item.id}
                    disabled={disabled}
                    onClick={() => onFillChange?.(item.id)}
                  >
                    <span
                      className={`${styles.fillPreview} ${styles[`fill_${item.id}`]}`}
                      aria-hidden="true"
                    />
                    <span>{item.label.replace("填充", "")}</span>
                  </MenuOption>
                ))}
              </div>
            </section>

            <section className={styles.styleSection}>
              <p className={styles.menuTitle}>线型</p>
              <div
                className={styles.segmented}
                role="group"
                aria-label="线条样式"
              >
                {DRAWING_BOARD_DASHES.map((item) => (
                  <MenuOption
                    key={item.id}
                    label={item.label}
                    active={dash === item.id}
                    disabled={disabled}
                    onClick={() => onDashChange?.(item.id)}
                  >
                    {item.id === "dotted" ? (
                      <CircleDashed aria-hidden="true" size={16} />
                    ) : (
                      <span
                        className={`${styles.dashPreview} ${styles[`dash_${item.id}`]}`}
                        aria-hidden="true"
                      />
                    )}
                    <span>{item.label.replace("线", "")}</span>
                  </MenuOption>
                ))}
              </div>
            </section>

            <section className={styles.styleSection}>
              <p className={styles.menuTitle}>线宽</p>
              <div
                className={styles.segmented}
                role="group"
                aria-label="线条宽度"
              >
                {DRAWING_BOARD_SIZES.map((item) => (
                  <MenuOption
                    key={item.id}
                    label={`${item.label} 线宽`}
                    active={size === item.id}
                    disabled={disabled}
                    onClick={() => onSizeChange?.(item.id)}
                  >
                    <span
                      className={`${styles.sizePreview} ${styles[`size_${item.id}`]}`}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </MenuOption>
                ))}
              </div>
            </section>
          </ToolbarMenu>

          <span className={styles.separator} aria-hidden="true" />

          <div className={styles.group} role="group" aria-label="画布缩放">
            <ToolbarButton
              label="缩小画布"
              Icon={ZoomOut}
              disabled={disabled}
              onClick={onZoomOut}
            />
            <ToolbarButton
              label={`重置画布缩放，当前 ${zoomLabel}`}
              disabled={disabled}
              className={styles.zoomReset}
              onClick={onZoomReset}
            >
              <span>{zoomLabel}</span>
            </ToolbarButton>
            <ToolbarButton
              label="放大画布"
              Icon={ZoomIn}
              disabled={disabled}
              onClick={onZoomIn}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
