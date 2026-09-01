import { fabric } from "fabric";

import {
  fabricColor,
  fabricShapeStyle,
  fabricStrokeWidth,
} from "./fabricBoardStyles";

const normalizedBox = (start, end) => ({
  height: Math.max(Math.abs(end.y - start.y), 1),
  left: Math.min(start.x, end.x),
  top: Math.min(start.y, end.y),
  width: Math.max(Math.abs(end.x - start.x), 1),
});

const linePoints = (start, end) => [start.x, start.y, end.x, end.y];

const shapeFactories = {
  arrow: (start, end, style) =>
    new fabric.Line(linePoints(start, end), {
      ...fabricShapeStyle(style),
      boardTool: "arrow",
    }),
  diamond: (start, end, style) => {
    const box = normalizedBox(start, end);
    return new fabric.Polygon(
      [
        { x: box.width / 2, y: 0 },
        { x: box.width, y: box.height / 2 },
        { x: box.width / 2, y: box.height },
        { x: 0, y: box.height / 2 },
      ],
      {
        ...fabricShapeStyle(style),
        left: box.left,
        top: box.top,
        boardTool: "diamond",
      },
    );
  },
  ellipse: (start, end, style) => {
    const box = normalizedBox(start, end);
    return new fabric.Ellipse({
      ...fabricShapeStyle(style),
      left: box.left,
      top: box.top,
      rx: box.width / 2,
      ry: box.height / 2,
      boardTool: "ellipse",
    });
  },
  line: (start, end, style) =>
    new fabric.Line(linePoints(start, end), {
      ...fabricShapeStyle(style),
      boardTool: "line",
    }),
  rectangle: (start, end, style) =>
    new fabric.Rect({
      ...normalizedBox(start, end),
      ...fabricShapeStyle(style),
      boardTool: "rectangle",
    }),
  triangle: (start, end, style) =>
    new fabric.Triangle({
      ...normalizedBox(start, end),
      ...fabricShapeStyle(style),
      boardTool: "triangle",
    }),
};

export const isDragShapeTool = (tool) => Boolean(shapeFactories[tool]);

/**
 *
 * @param tool
 * @param start
 * @param end
 * @param style
 */
export function createFabricShape(tool, start, end, style) {
  return shapeFactories[tool]?.(start, end, style) || null;
}

/**
 *
 * @param tool
 * @param point
 * @param style
 */
export function createFabricText(tool, point, style) {
  const common = {
    fill: fabricColor(style.color),
    fontFamily: "sans-serif",
    fontSize: 24,
    left: point.x,
    top: point.y,
    boardTool: tool,
  };
  if (tool === "note") {
    return new fabric.Textbox("便签", {
      ...common,
      backgroundColor: "#fef3c7",
      padding: 12,
      width: 160,
    });
  }
  return new fabric.IText("输入文字", common);
}

/**
 *
 * @param canvas
 * @param tool
 * @param style
 */
export function configureFabricBrush(canvas, tool, style) {
  const brush = new fabric.PencilBrush(canvas);
  brush.color = fabricColor(style.color);
  brush.width =
    tool === "highlight"
      ? fabricStrokeWidth(style.size) * 4
      : fabricStrokeWidth(style.size);
  brush.strokeDashArray = style.dash === "dashed" ? [12, 8] : null;
  canvas.freeDrawingBrush = brush;
}
