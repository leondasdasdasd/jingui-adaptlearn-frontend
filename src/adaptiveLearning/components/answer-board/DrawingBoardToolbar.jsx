import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Circle,
  CopyPlus,
  Diamond,
  Eraser,
  Hand,
  Highlighter,
  ImagePlus,
  Minus,
  MoreHorizontal,
  MousePointer2,
  Palette,
  Pencil,
  Redo2,
  RotateCcw,
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
  { id: "black", label: "黑色", hex: "#1d1d1f" },
  { id: "grey", label: "灰色", hex: "#8a8f98" },
  { id: "blue", label: "蓝色", hex: "#2563eb" },
  { id: "light-blue", label: "天蓝", hex: "#0284c7" },
  { id: "green", label: "绿色", hex: "#16a34a" },
  { id: "light-green", label: "嫩绿", hex: "#22c55e" },
  { id: "yellow", label: "黄色", hex: "#eab308" },
  { id: "orange", label: "橙色", hex: "#f97316" },
  { id: "red", label: "红色", hex: "#ef4444" },
  { id: "light-red", label: "粉红", hex: "#f43f5e" },
  { id: "violet", label: "紫色", hex: "#7c3aed" },
  { id: "light-violet", label: "浅紫", hex: "#a855f7" },
];

export const DRAWING_BOARD_OPACITIES = [25, 50, 75, 100];

export const DRAWING_BOARD_FILLS = [
  { id: "none", label: "透明" },
  { id: "semi", label: "半透" },
  { id: "solid", label: "纯色" },
];

export const DRAWING_BOARD_DASHES = [
  { id: "draw", label: "随手" },
  { id: "solid", label: "实线" },
  { id: "dashed", label: "虚线" },
  { id: "dotted", label: "点线" },
];

export const DRAWING_BOARD_SIZES = [
  { id: "s", label: "细 (2px)", px: 2 },
  { id: "m", label: "中 (4px)", px: 4 },
  { id: "l", label: "粗 (6px)", px: 6 },
  { id: "xl", label: "特粗 (10px)", px: 10 },
];

// Geometric Shapes
const GEOMETRIC_SHAPES = [
  { id: "rectangle", label: "矩形", Icon: Square },
  { id: "ellipse", label: "圆形 / 椭圆", Icon: Circle },
  { id: "triangle", label: "三角形", Icon: Triangle },
  { id: "diamond", label: "菱形", Icon: Diamond },
  { id: "line", label: "直线", Icon: Minus },
  { id: "arrow", label: "箭头", Icon: ArrowUpRight },
];

// Annotation & Media Tools
const ANNOTATION_TOOLS = [
  { id: "text", label: "文字标注", Icon: Type, desc: "在画布中键入文本" },
  { id: "note", label: "便利便签", Icon: StickyNote, desc: "添加便签备忘" },
  { id: "media", label: "插入图片", Icon: ImagePlus, desc: "上传图片到画布" },
];

const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), maximum);

function closeOwningMenu(event) {
  event.currentTarget
    .closest("[data-drawing-board-menu]")
    ?.dispatchEvent(
      new CustomEvent("drawing-board-menu-select", { bubbles: true }),
    );
}

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
      className={`${styles.button} ${active ? styles.buttonActive : ""} ${className}`.trim()}
      type="button"
      aria-label={label}
      aria-pressed={typeof active === "boolean" ? active : undefined}
      disabled={disabled}
      title={label}
      onClick={onClick}
    >
      {Icon ? <Icon aria-hidden="true" size={15} /> : null}
      {children}
    </button>
  );
}

function ToolbarMenu({
  label,
  Icon,
  active = false,
  disabled = false,
  triggerContent,
  className = "",
  menuClassName = "",
  children,
}) {
  const menuId = useStableId("drawing-board-menu");
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8, maxHeight: 380 });
  const portalHost =
    getAdaptivePortalHost() ||
    (typeof document !== "undefined" ? document.body : null);

  const updatePosition = () => {
    if (!triggerRef.current || !menuRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const gutter = 10;
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
      maxHeight: Math.max(140, viewportHeight - top - gutter),
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
        className={`${styles.menuTrigger} ${active ? styles.menuTriggerActive : ""} ${className}`.trim()}
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
          (Icon ? <Icon aria-hidden="true" size={15} /> : null)}
        <ChevronDown aria-hidden="true" className={styles.chevron} size={11} />
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
      className={`${styles.menuOption} ${active ? styles.menuOptionActive : ""} ${className}`.trim()}
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
      {Icon ? <Icon aria-hidden="true" size={15} /> : null}
      {children || <span>{label}</span>}
    </button>
  );
}

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
  showHistory = false,
  className = "",
}) {
  const selectedColor =
    DRAWING_BOARD_COLORS.find((item) => item.id === color) ||
    DRAWING_BOARD_COLORS[0];
  const selectedSize =
    DRAWING_BOARD_SIZES.find((item) => item.id === size) ||
    DRAWING_BOARD_SIZES[0];
  const zoomLabel = Number.isFinite(Number(zoom))
    ? `${Math.round(Number(zoom))}%`
    : "100%";

  const activeGeometricShape = GEOMETRIC_SHAPES.find(
    (item) => item.id === activeShape || item.id === activeTool,
  );
  const activeAnnotation = ANNOTATION_TOOLS.find(
    (item) => item.id === activeTool,
  );
  const isShapesOrInsertActive = Boolean(activeGeometricShape || activeAnnotation);
  const isMoreActive = activeTool === "hand";

  // Dynamic icon for Shapes & Insert trigger
  const ShapeTriggerIcon = activeGeometricShape?.Icon || activeAnnotation?.Icon || Shapes;

  return (
    <div
      className={`${styles.toolbar} ${className}`.trim()}
      role="toolbar"
      aria-label="草稿纸工具栏"
    >
      <div className={styles.scroller}>
        <div className={styles.track}>
          {/* Group 1: Optional History (Undo / Redo) */}
          {showHistory ? (
            <>
              <div className={styles.group} role="group" aria-label="撤销与重做">
                <ToolbarButton
                  label="撤销 (Ctrl+Z)"
                  Icon={Undo2}
                  disabled={disabled || !canUndo}
                  onClick={onUndo}
                />
                <ToolbarButton
                  label="重做 (Ctrl+Y)"
                  Icon={Redo2}
                  disabled={disabled || !canRedo}
                  onClick={onRedo}
                />
              </div>
              <span className={styles.separator} aria-hidden="true" />
            </>
          ) : null}

          {/* Group 2: Core Frequent Drawing Tools (Outside) */}
          <div className={styles.group} role="group" aria-label="常用工具">
            <ToolbarButton
              label="选择调整"
              Icon={MousePointer2}
              active={activeTool === "select"}
              disabled={disabled}
              onClick={() => onToolChange?.("select")}
            />
            <ToolbarButton
              label="铅笔手绘"
              Icon={Pencil}
              active={activeTool === "draw"}
              disabled={disabled}
              onClick={() => onToolChange?.("draw")}
            />
            <ToolbarButton
              label="荧光高亮笔"
              Icon={Highlighter}
              active={activeTool === "highlight"}
              disabled={disabled}
              onClick={() => onToolChange?.("highlight")}
            />
            <ToolbarButton
              label="橡皮擦"
              Icon={Eraser}
              active={activeTool === "eraser"}
              disabled={disabled}
              onClick={() => onToolChange?.("eraser")}
            />
          </div>

          <span className={styles.separator} aria-hidden="true" />

          {/* Group 3: Color & Stroke Style (Outside trigger with compact visual) */}
          <div className={styles.group} role="group" aria-label="笔触与色彩">
            <ToolbarMenu
              label={`画笔样式：${selectedColor.label}，${selectedSize.label}`}
              active={
                color !== "black" ||
                opacity !== 100 ||
                fill !== "none" ||
                dash !== "draw" ||
                size !== "s"
              }
              disabled={disabled}
              triggerContent={
                <span className={styles.styleBadge} aria-hidden="true">
                  <span
                    className={styles.colorPill}
                    style={{ backgroundColor: selectedColor.hex || "#1d1d1f" }}
                  />
                  <span className={styles.sizeIndicator}>
                    <span
                      className={styles.sizeDot}
                      style={{ height: Math.min(10, Math.max(3, selectedSize.px || 2)) }}
                    />
                  </span>
                </span>
              }
              menuClassName={styles.styleMenu}
            >
              <div className={styles.menuHeader}>
                <span className={styles.menuTitle}>笔触与色彩</span>
                <span className={styles.menuSubtitle}>自定义画笔、线条和填充样式</span>
              </div>

              {/* Color Palette */}
              <section className={styles.styleSection}>
                <div className={styles.sectionHeading}>
                  <Palette size={13} />
                  <span>画笔颜色</span>
                </div>
                <div className={styles.colorPaletteGrid} role="group" aria-label="颜色选择">
                  {DRAWING_BOARD_COLORS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.colorChip} ${color === item.id ? styles.colorChipActive : ""}`}
                      title={item.label}
                      aria-label={item.label}
                      aria-pressed={color === item.id}
                      disabled={disabled}
                      onClick={(event) => {
                        onColorChange?.(item.id);
                        closeOwningMenu(event);
                      }}
                    >
                      <span
                        className={styles.colorChipDot}
                        style={{ backgroundColor: item.hex }}
                      />
                    </button>
                  ))}
                </div>
              </section>

              {/* Stroke Size */}
              <section className={styles.styleSection}>
                <div className={styles.sectionHeading}>
                  <span>线条粗细</span>
                </div>
                <div className={styles.segmented} role="group" aria-label="粗细选择">
                  {DRAWING_BOARD_SIZES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.segmentBtn} ${size === item.id ? styles.segmentBtnActive : ""}`}
                      aria-pressed={size === item.id}
                      disabled={disabled}
                      onClick={() => onSizeChange?.(item.id)}
                    >
                      <span
                        className={styles.strokeLine}
                        style={{ height: item.px }}
                      />
                      <span>{item.label.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Dash / Line Style */}
              <section className={styles.styleSection}>
                <div className={styles.sectionHeading}>
                  <span>线条类型</span>
                </div>
                <div className={styles.segmented} role="group" aria-label="线条类型">
                  {DRAWING_BOARD_DASHES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.segmentBtn} ${dash === item.id ? styles.segmentBtnActive : ""}`}
                      aria-pressed={dash === item.id}
                      disabled={disabled}
                      onClick={() => onDashChange?.(item.id)}
                    >
                      <span className={`${styles.dashLine} ${styles[`dash_${item.id}`]}`} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Fill Style */}
              <section className={styles.styleSection}>
                <div className={styles.sectionHeading}>
                  <span>图形填充</span>
                </div>
                <div className={styles.segmented} role="group" aria-label="填充模式">
                  {DRAWING_BOARD_FILLS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.segmentBtn} ${fill === item.id ? styles.segmentBtnActive : ""}`}
                      aria-pressed={fill === item.id}
                      disabled={disabled}
                      onClick={() => onFillChange?.(item.id)}
                    >
                      <span className={`${styles.fillPreviewBox} ${styles[`fill_${item.id}`]}`} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Opacity */}
              <section className={styles.styleSection}>
                <div className={styles.sectionHeading}>
                  <span>画笔透明度</span>
                  <span className={styles.opacityValue}>{opacity}%</span>
                </div>
                <div className={styles.segmented} role="group" aria-label="透明度">
                  {DRAWING_BOARD_OPACITIES.map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`${styles.segmentBtn} ${opacity === val ? styles.segmentBtnActive : ""}`}
                      aria-pressed={opacity === val}
                      disabled={disabled}
                      onClick={() => onOpacityChange?.(val)}
                    >
                      <span>{val}%</span>
                    </button>
                  ))}
                </div>
              </section>
            </ToolbarMenu>
          </div>

          <span className={styles.separator} aria-hidden="true" />

          {/* Group 4: Shapes & Insert (Collapsed dropdown) */}
          <div className={styles.group} role="group" aria-label="图形与插入">
            <ToolbarMenu
              label="图形与标注"
              Icon={ShapeTriggerIcon}
              active={isShapesOrInsertActive}
              disabled={disabled}
              menuClassName={styles.combinedMenu}
            >
              <div className={styles.menuHeader}>
                <span className={styles.menuTitle}>图形与标注</span>
                <span className={styles.menuSubtitle}>选择几何图形或插入文本素材</span>
              </div>

              {/* Shapes Section */}
              <div className={styles.menuSubHeader}>几何图形</div>
              <div className={styles.shapeGrid} role="group" aria-label="几何图形列表">
                {GEOMETRIC_SHAPES.map(({ id, label, Icon }) => (
                  <MenuOption
                    key={id}
                    label={label}
                    Icon={Icon}
                    active={activeShape === id || activeTool === id}
                    disabled={disabled}
                    className={styles.shapeOption}
                    onClick={() =>
                      onShapeChange ? onShapeChange(id) : onToolChange?.(id)
                    }
                  >
                    <span>{label}</span>
                  </MenuOption>
                ))}
              </div>

              {/* Annotation & Text Section */}
              <div className={styles.menuSubHeader} style={{ marginTop: 12 }}>文字与素材</div>
              <div className={styles.annotationList} role="group" aria-label="标注与媒体工具">
                {ANNOTATION_TOOLS.map(({ id, label, Icon, desc }) => (
                  <MenuOption
                    key={id}
                    label={label}
                    Icon={Icon}
                    active={activeTool === id}
                    disabled={disabled}
                    className={styles.annotationOption}
                    onClick={() => onToolChange?.(id)}
                  >
                    <div className={styles.annotationContent}>
                      <span className={styles.annotationLabel}>{label}</span>
                      <span className={styles.annotationDesc}>{desc}</span>
                    </div>
                  </MenuOption>
                ))}
              </div>
            </ToolbarMenu>
          </div>

          {/* Group 5: More Actions (Collapsed: Hand, Duplicate, Delete, Zoom) */}
          <div className={styles.group} role="group" aria-label="更多操作">
            <ToolbarMenu
              label="更多辅助与视图"
              Icon={MoreHorizontal}
              active={isMoreActive}
              disabled={disabled}
              menuClassName={styles.moreMenu}
            >
              <div className={styles.menuHeader}>
                <span className={styles.menuTitle}>更多工具</span>
                <span className={styles.menuSubtitle}>画布拖拽、编辑操作与缩放视图</span>
              </div>

              {/* Canvas & Selection Operations */}
              <div className={styles.moreActionList} role="group" aria-label="辅助编辑">
                <MenuOption
                  label="拖拽移动画布"
                  Icon={Hand}
                  active={activeTool === "hand"}
                  disabled={disabled}
                  className={styles.moreOption}
                  onClick={() => onToolChange?.("hand")}
                >
                  <div className={styles.moreOptionContent}>
                    <span>拖拽移动画布</span>
                    <span className={styles.moreOptionShortcut}>空格+拖拽</span>
                  </div>
                </MenuOption>

                <MenuOption
                  label="复制选中对象"
                  Icon={CopyPlus}
                  disabled={disabled || !canDuplicate}
                  className={styles.moreOption}
                  onClick={onDuplicate}
                >
                  <div className={styles.moreOptionContent}>
                    <span>复制选中对象</span>
                    <span className={styles.moreOptionShortcut}>Ctrl+D</span>
                  </div>
                </MenuOption>

                <MenuOption
                  label="删除选中对象"
                  Icon={Trash2}
                  disabled={disabled || !canDelete}
                  className={`${styles.moreOption} ${styles.deleteOption}`}
                  onClick={onDelete}
                >
                  <div className={styles.moreOptionContent}>
                    <span>删除选中对象</span>
                    <span className={styles.moreOptionShortcut}>Delete</span>
                  </div>
                </MenuOption>
              </div>

              {/* Zoom Controls inside More */}
              <div className={styles.menuSubHeader} style={{ marginTop: 12 }}>画布缩放</div>
              <div className={styles.zoomControlRow}>
                <button
                  type="button"
                  className={styles.zoomActionBtn}
                  title="缩小画布"
                  disabled={disabled}
                  onClick={onZoomOut}
                >
                  <ZoomOut size={14} />
                  <span>缩小</span>
                </button>
                <button
                  type="button"
                  className={styles.zoomResetBtn}
                  title={`重置为 100% (当前 ${zoomLabel})`}
                  disabled={disabled}
                  onClick={onZoomReset}
                >
                  <RotateCcw size={12} />
                  <span>{zoomLabel} (重置)</span>
                </button>
                <button
                  type="button"
                  className={styles.zoomActionBtn}
                  title="放大画布"
                  disabled={disabled}
                  onClick={onZoomIn}
                >
                  <ZoomIn size={14} />
                  <span>放大</span>
                </button>
              </div>
            </ToolbarMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

