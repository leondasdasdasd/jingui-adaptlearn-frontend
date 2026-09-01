import { fabric } from "fabric";

import {
  fabricColor,
  fabricDashPattern,
  fabricFill,
  fabricStrokeWidth,
} from "./fabricBoardStyles";
import {
  configureFabricBrush,
  createFabricShape,
  createFabricText,
  isDragShapeTool,
} from "./fabricShapeFactory";

const SNAPSHOT_VERSION = 1;
const SNAPSHOT_DEBOUNCE_MS = 200;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

const defaultStyle = () => ({
  color: "black",
  dash: "draw",
  fill: "none",
  opacity: 1,
  size: "s",
});
const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), maximum);

export const createFabricBoardSnapshot = (canvas) => ({
  contract: "adaptive-fabric-board",
  version: SNAPSHOT_VERSION,
  document: canvas.toJSON(["boardTool"]),
});

export const isFabricBoardSnapshot = (snapshot) =>
  Boolean(
    snapshot?.contract === "adaptive-fabric-board" &&
    snapshot.version === SNAPSHOT_VERSION &&
    snapshot.document,
  );

export default class FabricBoardRuntime {
  constructor(element, options = {}) {
    this.callbacks = options;
    this.style = defaultStyle();
    this.tool = "draw";
    this.history = [];
    this.historyIndex = -1;
    this.applyingState = false;
    this.dragStart = null;
    this.dragShape = null;
    this.panStart = null;
    this.snapshotTimer = null;
    this.historyTimer = null;
    this.canvas = new fabric.Canvas(element, {
      backgroundColor: "transparent",
      preserveObjectStacking: true,
      selection: !options.disabled,
    });
    this.bindEvents();
    this.setDisabled(options.disabled);
    this.setTool("draw");
    this.refreshViewportBounds();
    this.restore(options.initialSnapshot);
  }

  bindEvents() {
    this.canvas.on("mouse:down", (event) => this.handlePointerDown(event));
    this.canvas.on("mouse:move", (event) => this.handlePointerMove(event));
    this.canvas.on("mouse:up", (event) => this.handlePointerUp(event));
    for (const name of [
      "object:added",
      "object:modified",
      "object:removed",
      "path:created",
    ]) {
      this.canvas.on(name, () => this.handleDocumentChange());
    }
    for (const name of [
      "selection:created",
      "selection:updated",
      "selection:cleared",
    ]) {
      this.canvas.on(name, () => this.emitState());
    }
  }

  restore(snapshot) {
    if (!isFabricBoardSnapshot(snapshot)) {
      this.commitHistory();
      this.emitState();
      return;
    }
    this.applyingState = true;
    this.canvas.loadFromJSON(snapshot.document, () => {
      this.applyingState = false;
      this.canvas.renderAll();
      this.commitHistory();
      this.emitState();
    });
  }

  handlePointerDown(event) {
    if (this.disabled) return;
    this.callbacks.onActivity?.();
    if (this.handleImmediateTool(event)) return;
    const point = this.canvas.getPointer(event.e);
    if (this.tool === "text" || this.tool === "note") {
      const text = createFabricText(this.tool, point, this.style);
      this.canvas.add(text).setActiveObject(text);
      if (text.enterEditing) text.enterEditing();
      return;
    }
    if (!isDragShapeTool(this.tool)) return;
    this.dragStart = point;
    this.dragShape = createFabricShape(this.tool, point, point, this.style);
    this.canvas.add(this.dragShape);
  }

  handleImmediateTool(event) {
    if (this.tool === "eraser" && event.target) {
      this.canvas.remove(event.target);
      return true;
    }
    if (this.tool !== "hand") return false;
    this.panStart = { x: event.e.clientX, y: event.e.clientY };
    return true;
  }

  handlePointerMove(event) {
    if (this.panStart) {
      const transform = this.canvas.viewportTransform;
      transform[4] += event.e.clientX - this.panStart.x;
      transform[5] += event.e.clientY - this.panStart.y;
      this.panStart = { x: event.e.clientX, y: event.e.clientY };
      this.canvas.requestRenderAll();
      return;
    }
    if (!this.dragShape || !this.dragStart) return;
    const next = createFabricShape(
      this.tool,
      this.dragStart,
      this.canvas.getPointer(event.e),
      this.style,
    );
    const properties = next.toObject(["boardTool"]);
    this.dragShape.set(properties).setCoords();
    this.canvas.requestRenderAll();
  }

  handlePointerUp() {
    this.panStart = null;
    this.dragStart = null;
    this.dragShape = null;
  }

  handleDocumentChange() {
    if (this.applyingState) return;
    this.callbacks.onActivity?.();
    window.clearTimeout(this.historyTimer);
    this.historyTimer = window.setTimeout(() => this.commitHistory(), 0);
    window.clearTimeout(this.snapshotTimer);
    this.snapshotTimer = window.setTimeout(
      () => this.emitSnapshot(),
      SNAPSHOT_DEBOUNCE_MS,
    );
    this.emitState();
  }

  commitHistory() {
    if (this.applyingState) return;
    const serialized = JSON.stringify(createFabricBoardSnapshot(this.canvas));
    if (serialized === this.history[this.historyIndex]) return;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(serialized);
    this.historyIndex = this.history.length - 1;
    this.emitState();
  }

  emitSnapshot() {
    window.clearTimeout(this.snapshotTimer);
    this.snapshotTimer = null;
    this.callbacks.onSnapshotChange?.(createFabricBoardSnapshot(this.canvas));
  }

  emitState() {
    const state = this.getState();
    this.callbacks.onDirtyChange?.(state.shapeCount > 0);
    this.callbacks.onStateChange?.(state);
  }

  getState() {
    return {
      canRedo: this.historyIndex < this.history.length - 1,
      canUndo: this.historyIndex > 0,
      selectedCount: this.canvas.getActiveObjects().length,
      shapeCount: this.canvas.getObjects().length,
      zoom: this.canvas.getZoom(),
    };
  }

  applyHistory(index) {
    const serialized = this.history[index];
    if (!serialized) return;
    this.historyIndex = index;
    this.applyingState = true;
    this.canvas.loadFromJSON(JSON.parse(serialized).document, () => {
      this.applyingState = false;
      this.canvas.renderAll();
      this.emitSnapshot();
      this.emitState();
    });
  }

  undo() {
    if (this.historyIndex > 0) this.applyHistory(this.historyIndex - 1);
  }

  redo() {
    if (this.historyIndex < this.history.length - 1)
      this.applyHistory(this.historyIndex + 1);
  }

  clear() {
    this.canvas.discardActiveObject();
    for (const object of this.canvas.getObjects()) this.canvas.remove(object);
    this.canvas.requestRenderAll();
  }

  setTool(tool) {
    this.tool = tool;
    this.canvas.isDrawingMode =
      !this.disabled && ["draw", "highlight"].includes(tool);
    this.canvas.selection = !this.disabled && tool === "select";
    this.canvas.skipTargetFind = !["select", "eraser"].includes(tool);
    configureFabricBrush(this.canvas, tool, this.style);
    this.canvas.defaultCursor = tool === "hand" ? "grab" : "default";
    this.canvas.discardActiveObject().requestRenderAll();
  }

  setDisabled(disabled) {
    this.disabled = Boolean(disabled);
    for (const object of this.canvas.getObjects())
      object.set({ evented: !this.disabled, selectable: !this.disabled });
    this.setTool(this.tool);
  }

  updateSelected(properties) {
    for (const object of this.canvas.getActiveObjects())
      object.set(properties).setCoords();
    this.canvas.requestRenderAll();
    if (this.canvas.getActiveObjects().length > 0) this.handleDocumentChange();
  }

  setColor(color) {
    this.style.color = color;
    this.updateSelected({
      fill: fabricFill(this.style.fill, color),
      stroke: fabricColor(color),
    });
    configureFabricBrush(this.canvas, this.tool, this.style);
  }

  setStrokeSize(size) {
    this.style.size = size;
    this.updateSelected({ strokeWidth: fabricStrokeWidth(size) });
    configureFabricBrush(this.canvas, this.tool, this.style);
  }

  setOpacity(opacity) {
    this.style.opacity = clamp(Number(opacity) || 1, 0.01, 1);
    this.updateSelected({ opacity: this.style.opacity });
  }

  setFill(fill) {
    this.style.fill = fill;
    this.updateSelected({ fill: fabricFill(fill, this.style.color) });
  }

  setDash(dash) {
    this.style.dash = dash;
    this.updateSelected({ strokeDashArray: fabricDashPattern(dash) });
    configureFabricBrush(this.canvas, this.tool, this.style);
  }

  setZoom(zoom) {
    const center = this.canvas.getCenter();
    this.canvas.zoomToPoint(
      new fabric.Point(center.left, center.top),
      clamp(zoom, MIN_ZOOM, MAX_ZOOM),
    );
    this.emitState();
  }

  zoomIn() {
    this.setZoom(this.canvas.getZoom() * 1.2);
  }
  zoomOut() {
    this.setZoom(this.canvas.getZoom() / 1.2);
  }

  resetZoom() {
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    this.emitState();
  }

  deleteSelected() {
    for (const object of this.canvas.getActiveObjects())
      this.canvas.remove(object);
    this.canvas.discardActiveObject().requestRenderAll();
  }

  duplicateSelected() {
    const selected = [...this.canvas.getActiveObjects()];
    this.canvas.discardActiveObject();
    for (const object of selected)
      object.clone((clone) => {
        clone.set({ left: (clone.left || 0) + 16, top: (clone.top || 0) + 16 });
        this.canvas.add(clone);
      });
  }

  addImages(files) {
    for (const file of files) {
      const reader = new FileReader();
      reader.addEventListener("load", () =>
        fabric.Image.fromURL(reader.result, (image) => {
          image.scaleToWidth(Math.min(320, this.canvas.getWidth() * 0.5));
          image.set({ left: 24, top: 24, boardTool: "media" });
          this.canvas.add(image).setActiveObject(image).requestRenderAll();
        }),
      );
      reader.readAsDataURL(file);
    }
  }

  refreshViewportBounds() {
    const parent = this.canvas.lowerCanvasEl.parentElement;
    const width = Math.max(parent?.clientWidth || 1, 1);
    const height = Math.max(parent?.clientHeight || 1, 1);
    this.canvas.setDimensions({ width, height });
    this.canvas.calcOffset();
  }

  dispose() {
    window.clearTimeout(this.historyTimer);
    window.clearTimeout(this.snapshotTimer);
    this.emitSnapshot();
    this.canvas.dispose();
  }
}
