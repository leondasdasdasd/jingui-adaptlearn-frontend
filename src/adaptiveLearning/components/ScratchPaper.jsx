import React, {
  Component,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Blend, Minimize2, PencilLine, Trash2 } from "lucide-react";

import {
  flushScratchPaperSnapshot,
  persistScratchPaperSnapshot,
  readScratchPaperSnapshot,
  scratchPaperPersistenceKey,
} from "../student/data/scratchPaperSessionRepository";
import DrawingBoardDialog from "./answer-board/DrawingBoardDialog";
import DrawingBoardToolbar from "./answer-board/DrawingBoardToolbar";

import styles from "./ScratchPaper.module.css";

const HandwritingBoard = lazy(() => import("./answer-board/HandwritingBoard"));
const SCRATCH_PAPER_SIZE = { width: 480, height: 520 };
const DEFAULT_BOARD_STATE = {
  canRedo: false,
  canUndo: false,
  selectedCount: 0,
  shapeCount: 0,
  zoom: 1,
};

class ScratchPaperBoardBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch() {
    this.props.onBoardError?.();
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className={styles.loading} role="status">
          草稿纸正在恢复，请稍候...
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 *
 * @param root0
 * @param root0.sessionScope
 * @param root0.onActivity
 * @param root0.triggerVariant
 */
export default function ScratchPaper({
  sessionScope,
  onActivity,
  triggerVariant = "floating",
}) {
  const boardRef = useRef(null);
  const triggerRef = useRef(null);
  const volatileSnapshotRef = useRef(null);
  const persistenceKeyRef = useRef("");
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [hasMarks, setHasMarks] = useState(false);
  const [toolMode, setToolMode] = useState("draw");
  const [drawingColor, setDrawingColor] = useState("black");
  const [drawingOpacity, setDrawingOpacity] = useState(100);
  const [drawingFill, setDrawingFill] = useState("none");
  const [drawingDash, setDrawingDash] = useState("draw");
  const [drawingSize, setDrawingSize] = useState("s");
  const [paperOpacity, setPaperOpacity] = useState(88);
  const [boardState, setBoardState] = useState(DEFAULT_BOARD_STATE);
  const persistenceKey = useMemo(
    () => scratchPaperPersistenceKey(sessionScope),
    [sessionScope],
  );
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [snapshotReady, setSnapshotReady] = useState(false);
  const [persistenceMode, setPersistenceMode] = useState("application");
  persistenceKeyRef.current = persistenceKey;

  useEffect(() => {
    let cancelled = false;
    volatileSnapshotRef.current = null;
    setInitialSnapshot(null);
    setSnapshotReady(false);
    setPersistenceMode("application");
    void readScratchPaperSnapshot(persistenceKey).then((snapshot) => {
      if (cancelled) return;
      volatileSnapshotRef.current = snapshot;
      setInitialSnapshot(snapshot);
      setSnapshotReady(true);
    });
    return () => {
      cancelled = true;
      void flushScratchPaperSnapshot(persistenceKey);
    };
  }, [persistenceKey]);

  const selectTool = (nextTool) => {
    setToolMode(nextTool);
    boardRef.current?.setTool(nextTool);
  };

  return (
    <>
      {open ? null : (
        <button
          ref={triggerRef}
          className={`${styles.trigger}${triggerVariant === "inline" ? ` ${styles.triggerInline}` : ""}`}
          type="button"
          aria-expanded="false"
          onClick={() => {
            setHasOpened(true);
            setOpen(true);
          }}
        >
          <PencilLine aria-hidden="true" size={18} />
          <span>草稿纸</span>
        </button>
      )}

      <DrawingBoardDialog
        open={open}
        onClose={() => setOpen(false)}
        returnFocusRef={triggerRef}
        title="草稿纸"
        ariaLabel="草稿纸"
        modal={false}
        defaultSize={SCRATCH_PAPER_SIZE}
        defaultPlacement="right"
        resetLayoutOnOpen={false}
        keepMounted={hasOpened}
        onLayoutChange={() => boardRef.current?.refreshViewportBounds()}
        className={styles.dialog}
        bodyClassName={styles.body}
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
            onToolChange={selectTool}
            onShapeChange={selectTool}
            onColorChange={(color) => {
              setDrawingColor(color);
              boardRef.current?.setColor(color);
            }}
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
            onSizeChange={(size) => {
              setDrawingSize(size);
              boardRef.current?.setStrokeSize(size);
            }}
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
          <div className={styles.actions}>
            <label className={styles.opacityControl} title="调整纸张透明度">
              <Blend aria-hidden="true" size={16} />
              <input
                type="range"
                min="35"
                max="100"
                step="5"
                value={paperOpacity}
                aria-label="纸张透明度"
                onChange={(event) =>
                  setPaperOpacity(Number(event.currentTarget.value))
                }
              />
              <output>{paperOpacity}%</output>
            </label>
            <button
              className="icon-button"
              type="button"
              aria-label="清空草稿纸"
              title="清空草稿纸"
              disabled={!hasMarks}
              onClick={() => boardRef.current?.clear()}
            >
              <Trash2 aria-hidden="true" size={17} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="收起草稿纸"
              title="收起草稿纸"
              onClick={() => setOpen(false)}
            >
              <Minimize2 aria-hidden="true" size={18} />
            </button>
          </div>
        }
      >
        <div className={styles.boardBody}>
          <div className={styles.canvasWrap}>
            <Suspense
              fallback={<div className={styles.loading}>草稿纸加载中...</div>}
            >
              {snapshotReady ? (
                <ScratchPaperBoardBoundary resetKey={persistenceKey}>
                  <HandwritingBoard
                    key={persistenceKey}
                    ref={boardRef}
                    initialSnapshot={initialSnapshot || undefined}
                    onActivity={onActivity}
                    paperOpacity={paperOpacity}
                    persistenceMode={persistenceMode}
                    onDirtyChange={setHasMarks}
                    onSnapshotChange={(snapshot) => {
                      volatileSnapshotRef.current = snapshot;
                      void persistScratchPaperSnapshot(
                        persistenceKey,
                        snapshot,
                      ).then((result) => {
                        if (persistenceKeyRef.current !== persistenceKey)
                          return;
                        switch (result.status) {
                          case "memory-only": {
                            setPersistenceMode("memory");
                            break;
                          }
                          case "journal-only": {
                            setPersistenceMode("journal");
                            break;
                          }
                          case "persisted": {
                            {
                              setPersistenceMode("application");
                              // No default
                            }
                            break;
                          }
                        }
                      });
                    }}
                    onStateChange={setBoardState}
                  />
                </ScratchPaperBoardBoundary>
              ) : (
                <div className={styles.loading} role="status">
                  草稿纸正在恢复...
                </div>
              )}
            </Suspense>
          </div>
        </div>
      </DrawingBoardDialog>
    </>
  );
}
