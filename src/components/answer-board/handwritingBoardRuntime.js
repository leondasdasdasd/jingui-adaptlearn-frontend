import {
  createTLStore,
  defaultAssetUtils,
  defaultBindingUtils,
  defaultShapeUtils,
} from 'tldraw';

const SNAPSHOT_DEBOUNCE_MS = 200;

export function createHandwritingBoardStore(initialSnapshot) {
  return createTLStore({
    assetUtils: defaultAssetUtils,
    bindingUtils: defaultBindingUtils,
    shapeUtils: defaultShapeUtils,
    ...(initialSnapshot ? { snapshot: initialSnapshot } : {}),
  });
}

export function subscribeToHandwritingSnapshots(editor, onSnapshotChange, {
  clearTimer = (timer) => window.clearTimeout(timer),
  debounceMs = SNAPSHOT_DEBOUNCE_MS,
  setTimer = (callback, delay) => window.setTimeout(callback, delay),
} = {}) {
  let disposed = false;
  let hasPendingSnapshot = false;
  let snapshotTimer = null;

  const clearPendingTimer = () => {
    if (snapshotTimer === null) return;
    clearTimer(snapshotTimer);
    snapshotTimer = null;
  };
  const emitPendingSnapshot = () => {
    if (disposed || !hasPendingSnapshot) return;
    hasPendingSnapshot = false;
    try {
      onSnapshotChange?.(editor.getSnapshot());
    } catch {
      // Session state can be unavailable while the editor is mounting or disposing.
    }
  };
  const flush = () => {
    clearPendingTimer();
    emitPendingSnapshot();
  };
  const schedule = () => {
    if (disposed) return;
    hasPendingSnapshot = true;
    clearPendingTimer();
    const timer = setTimer(() => {
      if (disposed || snapshotTimer !== timer) return;
      snapshotTimer = null;
      emitPendingSnapshot();
    }, debounceMs);
    snapshotTimer = timer;
  };
  const handleEditorEvent = (event) => {
    if (event.type === 'pointer' && event.name === 'pointer_up') flush();
  };

  const stopDocumentListener = editor.store.listen(schedule, { scope: 'document' });
  editor.on('event', handleEditorEvent);

  return {
    flush,
    dispose() {
      if (disposed) return;
      clearPendingTimer();
      stopDocumentListener();
      editor.off('event', handleEditorEvent);
      emitPendingSnapshot();
      disposed = true;
    },
  };
}
