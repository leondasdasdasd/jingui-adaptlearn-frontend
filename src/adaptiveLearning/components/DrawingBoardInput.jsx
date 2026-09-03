import React, { lazy, Suspense, useRef, useState } from "react";
import { Loader2, Pencil, Trash2, X } from "lucide-react";

import DrawingBoardDialog from "./answer-board/DrawingBoardDialog";
import DrawingBoardToolbar from "./answer-board/DrawingBoardToolbar";

const HandwritingBoard = lazy(() => import("./answer-board/HandwritingBoard"));
const DEFAULT_BOARD_STATE = {
  canRedo: false,
  canUndo: false,
  selectedCount: 0,
  shapeCount: 0,
  zoom: 1,
};

/**
 *
 * @param root0
 * @param root0.disabled
 * @param root0.image
 * @param root0.onChange
 */
export default function DrawingBoardInput({ disabled, image, onChange }) {
  const boardRef = useRef(null);
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [hasMarks, setHasMarks] = useState(false);
  const [toolMode, setToolMode] = useState("draw");
  const [drawingColor, setDrawingColor] = useState("black");
  const [drawingOpacity, setDrawingOpacity] = useState(100);
  const [drawingFill, setDrawingFill] = useState("none");
  const [drawingDash, setDrawingDash] = useState("draw");
  const [drawingSize, setDrawingSize] = useState("s");
  const [boardState, setBoardState] = useState(DEFAULT_BOARD_STATE);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const backgroundImageDataUrl = image?.source === "photo" ? image.dataUrl : "";

  const closeBoard = async () => {
    if (exporting) return;
    if (!hasMarks) {
      setOpen(false);
      return;
    }
    setExporting(true);
    setError("");
    try {
      const answerContent = await boardRef.current?.exportAnswerContent();
      if (!answerContent?.inkDataUrl)
        throw new Error("画板内容生成失败，请重试");
      onChange({
        dataUrl: answerContent.inkDataUrl,
        name: `画板作答-${Date.now()}.png`,
        width: 960,
        height: 540,
        source: "drawing",
        answerContent,
      });
      setOpen(false);
    } catch (exportError) {
      setError(exportError?.message || "画板内容生成失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  const selectTool = (nextTool) => {
    setToolMode(nextTool);
    boardRef.current?.setTool(nextTool);
  };

  const selectSize = (size) => {
    setDrawingSize(size);
    boardRef.current?.setStrokeSize(size);
  };

  const selectColor = (color) => {
    setDrawingColor(color);
    boardRef.current?.setColor(color);
  };

  return (
    <>
      <button
        ref={triggerRef}
        className="answer-tool-button"
        type="button"
        disabled={disabled}
        onClick={() => {
          setError("");
          setToolMode("draw");
          setOpen(true);
        }}
      >
        <Pencil size={17} />
        {image?.source === "photo"
          ? "在照片上标注"
          : image?.source === "drawing"
            ? "重新绘制"
            : "画板作答"}
      </button>

      <DrawingBoardDialog
        open={open}
        onClose={closeBoard}
        busy={exporting}
        returnFocusRef={triggerRef}
        title={backgroundImageDataUrl ? "在照片上标注" : "画板作答"}
        headerCenter={
          <DrawingBoardToolbar
            activeTool={toolMode}
            color={drawingColor}
            opacity={drawingOpacity}
            fill={drawingFill}
            dash={drawingDash}
            size={drawingSize}
            zoom={(boardState.zoom || 1) * 100}
            canUndo={boardState.canUndo}
            canRedo={boardState.canRedo}
            canDelete={boardState.selectedCount > 0}
            canDuplicate={boardState.selectedCount > 0}
            disabled={disabled || exporting}
            onToolChange={selectTool}
            onShapeChange={selectTool}
            onColorChange={selectColor}
            onOpacityChange={(opacity) => {
              setDrawingOpacity(opacity);
              boardRef.current?.setOpacity(opacity / 100);
            }}
            onFillChange={(fill) => {
              setDrawingFill(fill);
              boardRef.current?.setFill(fill);
            }}
            onDashChange={(dash) => {
              setDrawingDash(dash);
              boardRef.current?.setDash(dash);
            }}
            onSizeChange={selectSize}
            onUndo={() => boardRef.current?.undo()}
            onRedo={() => boardRef.current?.redo()}
            onDelete={() => boardRef.current?.deleteSelected()}
            onDuplicate={() => boardRef.current?.duplicateSelected()}
            onZoomOut={() => boardRef.current?.zoomOut()}
            onZoomReset={() => boardRef.current?.resetZoom()}
            onZoomIn={() => boardRef.current?.zoomIn()}
          />
        }
        headerActions={
          <div className="drawing-board-header-actions">
            <button
              className="icon-button"
              type="button"
              aria-label="清空画板"
              title="清空"
              disabled={!hasMarks || exporting}
              onClick={() => boardRef.current?.clear()}
            >
              <Trash2 size={17} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label={hasMarks ? "完成并关闭画板" : "关闭画板"}
              title={hasMarks ? "关闭后自动插入作答" : "关闭画板"}
              disabled={exporting}
              onClick={closeBoard}
            >
              {exporting ? (
                <Loader2 className="drawing-board-spinner" size={18} />
              ) : (
                <X size={20} />
              )}
            </button>
          </div>
        }
      >
        <div className="drawing-board-body">
          <div className="drawing-board-canvas-wrap">
            <Suspense
              fallback={
                <div className="drawing-board-loading">画板加载中…</div>
              }
            >
              <HandwritingBoard
                ref={boardRef}
                backgroundImageDataUrl={backgroundImageDataUrl}
                disabled={disabled}
                onDirtyChange={setHasMarks}
                onStateChange={setBoardState}
              />
            </Suspense>
          </div>
          {error ? (
            <p className="drawing-board-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </DrawingBoardDialog>
    </>
  );
}
