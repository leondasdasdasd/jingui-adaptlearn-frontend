import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import PropTypes from "prop-types";

import FabricBoardRuntime from "./fabricBoardRuntime";
import {
  createImageAnswerContent,
  exportFabricBoardToPng,
} from "./fabricImageAdapter";

import styles from "./HandwritingBoard.module.css";

/**
 * 画板组件只管理 React 生命周期；绘制状态、历史和持久化由 Fabric runtime 统一负责。
 * 上层继续依赖原 imperative API，不需要理解 Fabric 的对象或序列化格式。
 */
const HandwritingBoard = forwardRef(function HandwritingBoard(
  {
    backgroundImageDataUrl = "",
    disabled = false,
    initialSnapshot,
    onActivity,
    paperOpacity = 100,
    persistenceMode = "application",
    onDirtyChange,
    onSnapshotChange,
    onStateChange,
  },
  ref,
) {
  const canvasElementRef = useRef(null);
  const mediaInputRef = useRef(null);
  const runtimeRef = useRef(null);
  const optionsRef = useRef(null);
  optionsRef.current = {
    disabled,
    initialSnapshot,
    onActivity,
    onDirtyChange,
    onSnapshotChange,
    onStateChange,
  };

  useEffect(() => {
    const runtime = new FabricBoardRuntime(
      canvasElementRef.current,
      optionsRef.current,
    );
    runtimeRef.current = runtime;
    return () => {
      runtimeRef.current = null;
      runtime.dispose();
    };
  }, []);

  useEffect(() => {
    runtimeRef.current?.setDisabled(disabled);
  }, [disabled]);

  useImperativeHandle(
    ref,
    () => ({
      clear: () => runtimeRef.current?.clear(),
      delete: () => runtimeRef.current?.deleteSelected(),
      deleteSelected: () => runtimeRef.current?.deleteSelected(),
      duplicate: () => runtimeRef.current?.duplicateSelected(),
      duplicateSelected: () => runtimeRef.current?.duplicateSelected(),
      redo: () => runtimeRef.current?.redo(),
      refreshViewportBounds: () => runtimeRef.current?.refreshViewportBounds(),
      resetZoom: () => runtimeRef.current?.resetZoom(),
      setColor: (color) => runtimeRef.current?.setColor(color),
      setDash: (dash) => runtimeRef.current?.setDash(dash),
      setFill: (fill) => runtimeRef.current?.setFill(fill),
      setOpacity: (opacity) => runtimeRef.current?.setOpacity(opacity),
      setStrokeSize: (size) => runtimeRef.current?.setStrokeSize(size),
      setTool(tool) {
        if (tool === "media") mediaInputRef.current?.click();
        else runtimeRef.current?.setTool(tool);
      },
      undo: () => runtimeRef.current?.undo(),
      zoomIn: () => runtimeRef.current?.zoomIn(),
      zoomOut: () => runtimeRef.current?.zoomOut(),
      async exportAnswerContent() {
        const ink = await exportFabricBoardToPng(
          runtimeRef.current?.canvas,
          backgroundImageDataUrl,
        );
        return createImageAnswerContent(ink);
      },
    }),
    [backgroundImageDataUrl],
  );

  return (
    <section
      className={styles.board}
      aria-label="通用作答画板"
      data-persistence-mode={persistenceMode}
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
        onChange={(event) => {
          runtimeRef.current?.addImages(event.currentTarget.files || []);
          event.currentTarget.value = "";
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
      <div className={styles.fabricCanvas} role="img" aria-label="手写作答画布">
        <canvas ref={canvasElementRef} />
      </div>
    </section>
  );
});

HandwritingBoard.propTypes = {
  backgroundImageDataUrl: PropTypes.string,
  disabled: PropTypes.bool,
  initialSnapshot: PropTypes.shape({}),
  onActivity: PropTypes.func,
  onDirtyChange: PropTypes.func,
  onSnapshotChange: PropTypes.func,
  onStateChange: PropTypes.func,
  paperOpacity: PropTypes.number,
  persistenceMode: PropTypes.string,
};

export default HandwritingBoard;
