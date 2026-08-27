import {
  DefaultColorStyle, DefaultDashStyle, DefaultFillStyle, DefaultSizeStyle,
  GeoShapeGeoStyle, Tldraw,
} from 'tldraw';
import 'tldraw/tldraw.css';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import styles from './HandwritingBoard.module.css';
import {
  createHandwritingBoardStore,
  subscribeToHandwritingSnapshots,
} from './handwritingBoardRuntime';
import { exportTldrawPageToPng, createImageAnswerContent } from './tldrawImageAdapter';

const BOARD_COMPONENTS = {
  Background: null,
  ErrorFallback: null,
  MainMenu: null,
  PageMenu: null,
  SharePanel: null,
  HelpMenu: null,
};
/**
 * Reuses the mistakes-book handwriting-board boundary: this component owns
 * handwriting and image export, while the assessment flow owns submission.
 */
const HandwritingBoard = forwardRef(function HandwritingBoard({
  backgroundImageDataUrl = '',
  disabled = false,
  initialSnapshot,
  onActivity,
  paperOpacity = 100,
  persistenceMode = 'application',
  onDirtyChange,
  onSnapshotChange,
  onStateChange,
}, ref) {
  const editorRef = useRef(null);
  const mediaInputRef = useRef(null);
  const tldrawContainerRef = useRef(null);
  const onActivityRef = useRef(onActivity);
  const onSnapshotChangeRef = useRef(onSnapshotChange);
  const onStateChangeRef = useRef(onStateChange);
  const unsubscribeRef = useRef(null);
  const boardStateRef = useRef(null);
  const stateSyncTimerRef = useRef(null);
  const storeDisposeTimerRef = useRef(null);
  const [shapeCount, setShapeCount] = useState(0);
  const [store] = useState(() => createHandwritingBoardStore(initialSnapshot));
  const hasInk = shapeCount > 0;

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    onActivityRef.current = onActivity;
  }, [onActivity]);

  useEffect(() => {
    onSnapshotChangeRef.current = onSnapshotChange;
  }, [onSnapshotChange]);

  useEffect(() => {
    onDirtyChange?.(hasInk);
  }, [hasInk, onDirtyChange]);

  useEffect(() => {
    window.clearTimeout(storeDisposeTimerRef.current);
    return () => {
      unsubscribeRef.current?.();
      window.clearTimeout(stateSyncTimerRef.current);
      editorRef.current = null;
      storeDisposeTimerRef.current = window.setTimeout(() => store.dispose(), 0);
    };
  }, [store]);

  const emitStateChange = (editor = editorRef.current) => {
    if (!editor) return;
    const nextShapeCount = editor.getCurrentPageShapeIds().size;
    const nextState = {
      canUndo: editor.getCanUndo(),
      canRedo: editor.getCanRedo(),
      zoom: editor.getZoomLevel(),
      selectedCount: editor.getSelectedShapeIds().length,
      shapeCount: nextShapeCount,
    };
    const previous = boardStateRef.current;
    if (previous
      && previous.canUndo === nextState.canUndo
      && previous.canRedo === nextState.canRedo
      && previous.zoom === nextState.zoom
      && previous.selectedCount === nextState.selectedCount
      && previous.shapeCount === nextState.shapeCount) return;
    boardStateRef.current = nextState;
    setShapeCount(nextShapeCount);
    onStateChangeRef.current?.(nextState);
  };

  const clear = () => {
    const editor = editorRef.current;
    if (editor) editor.deleteShapes([...editor.getCurrentPageShapeIds()]);
    setShapeCount(0);
  };

  const refreshViewportBounds = () => {
    const editor = editorRef.current;
    const container = tldrawContainerRef.current;
    if (!editor || !container || container.getClientRects().length === 0) return;
    editor.updateViewportScreenBounds(container.querySelector('.tl-canvas') || container);
  };

  useImperativeHandle(ref, () => ({
    clear,
    refreshViewportBounds,
    undo() {
      editorRef.current?.undo();
    },
    redo() {
      editorRef.current?.redo();
    },
    setTool(toolId) {
      const editor = editorRef.current;
      if (!editor) return;
      if (toolId === 'media') {
        mediaInputRef.current?.click();
        return;
      }
      editor.updateInstanceState({ isToolLocked: !['hand', 'select'].includes(toolId) });
      if (['rectangle', 'ellipse', 'triangle', 'diamond'].includes(toolId)) {
        editor.setStyleForNextShapes(GeoShapeGeoStyle, toolId);
        editor.setCurrentTool('geo');
        return;
      }
      editor.setCurrentTool(toolId);
    },
    setColor(color) {
      const editor = editorRef.current;
      if (!editor) return;
      editor.setStyleForSelectedShapes(DefaultColorStyle, color);
      editor.setStyleForNextShapes(DefaultColorStyle, color);
    },
    setStrokeSize(size = 's') {
      const editor = editorRef.current;
      if (!editor) return;
      editor.setStyleForSelectedShapes(DefaultSizeStyle, size);
      editor.setStyleForNextShapes(DefaultSizeStyle, size);
    },
    setOpacity(opacity = 1) {
      const editor = editorRef.current;
      if (!editor) return;
      editor.setOpacityForSelectedShapes(opacity);
      editor.setOpacityForNextShapes(opacity);
    },
    setFill(fill = 'none') {
      const editor = editorRef.current;
      if (!editor) return;
      editor.setStyleForSelectedShapes(DefaultFillStyle, fill);
      editor.setStyleForNextShapes(DefaultFillStyle, fill);
    },
    setDash(dash = 'draw') {
      const editor = editorRef.current;
      if (!editor) return;
      editor.setStyleForSelectedShapes(DefaultDashStyle, dash);
      editor.setStyleForNextShapes(DefaultDashStyle, dash);
    },
    zoomIn() {
      editorRef.current?.zoomIn();
    },
    zoomOut() {
      editorRef.current?.zoomOut();
    },
    resetZoom() {
      editorRef.current?.resetZoom();
    },
    deleteSelected() {
      const editor = editorRef.current;
      if (!editor) return;
      editor.deleteShapes(editor.getSelectedShapeIds());
    },
    duplicateSelected() {
      const editor = editorRef.current;
      if (!editor) return;
      editor.duplicateShapes(editor.getSelectedShapeIds(), { x: 16, y: 16 });
    },
    async exportAnswerContent() {
      return createImageAnswerContent(await exportTldrawPageToPng(
        editorRef.current,
        backgroundImageDataUrl,
      ));
    },
  }), [backgroundImageDataUrl]);

  const handleMount = (editor) => {
    unsubscribeRef.current?.();
    editorRef.current = editor;
    boardStateRef.current = null;
    editor.setStyleForNextShapes(DefaultSizeStyle, 's');
    editor.updateInstanceState({ isToolLocked: true });
    editor.setCurrentTool('draw');
    emitStateChange(editor);
    const stopActivityListener = editor.store.listen(() => {
      onActivityRef.current?.();
    }, { source: 'user' });
    const snapshotSubscription = subscribeToHandwritingSnapshots(
      editor,
      (snapshot) => onSnapshotChangeRef.current?.(snapshot),
    );
    const stopStateListener = editor.store.listen(() => {
      window.clearTimeout(stateSyncTimerRef.current);
      stateSyncTimerRef.current = window.setTimeout(() => emitStateChange(editor), 50);
    });
    unsubscribeRef.current = () => {
      stopActivityListener();
      stopStateListener();
      snapshotSubscription.dispose();
    };
  };

  return (
    <section
      className={styles.board}
      aria-label="通用作答画板"
      data-persistence-mode={persistenceMode}
      data-shape-count={shapeCount}
      style={{
        background: `color-mix(in srgb, var(--color-surface-card-default) ${paperOpacity}%, transparent)`,
      }}
    >
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*"
        aria-label="向画板插入图片"
        hidden
        multiple
        onChange={async (event) => {
          const files = [...(event.currentTarget.files || [])];
          event.currentTarget.value = '';
          const editor = editorRef.current;
          if (!editor || !files.length) return;
          await editor.putExternalContent({
            type: 'files',
            files,
            point: editor.getViewportPageBounds().center,
          });
        }}
      />
      {backgroundImageDataUrl ? (
        <img
          aria-hidden="true"
          alt=""
          className={styles.background}
          draggable="false"
          src={backgroundImageDataUrl}
        />
      ) : null}
      <div
        ref={tldrawContainerRef}
        className={styles.tldraw}
        role="img"
        aria-label="手写作答画布"
      >
        <Tldraw
          autoFocus={!disabled}
          components={BOARD_COMPONENTS}
          inferDarkMode={false}
          isReadonly={disabled}
          onMount={handleMount}
          store={store}
        />
      </div>
    </section>
  );
});

export default HandwritingBoard;
