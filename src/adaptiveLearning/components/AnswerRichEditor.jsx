import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createEditor,
  Editor,
  Element as SlateElement,
  Node,
  Transforms,
} from "slate";
import { withHistory } from "slate-history";
import {
  Editable,
  ReactEditor,
  Slate,
  useFocused,
  useSelected,
  useSlateStatic,
  withReact,
} from "slate-react";

const ANSWER_IMAGE_TYPE = "answer-image";
const MIN_IMAGE_WIDTH = 240;
const MAX_INITIAL_IMAGE_WIDTH = 560;
const MAX_INITIAL_IMAGE_HEIGHT = 360;
const IMAGE_DRAG_TYPE = "application/x-yungu-answer-image";

/**
 *
 * @param text
 */
function paragraph(text = "") {
  return { type: "paragraph", children: [{ text }] };
}

/**
 *
 * @param image
 */
function answerImageNode(image) {
  return {
    type: ANSWER_IMAGE_TYPE,
    src: image?.dataUrl || "",
    name: image?.name || "",
    source: image?.source || (image?.answerContent ? "drawing" : "photo"),
    width: Number(image?.layout?.width) || undefined,
    height: Number(image?.layout?.height) || undefined,
    children: [{ text: "" }],
  };
}

/**
 *
 * @param value
 */
function answerParagraphs(value = "") {
  return String(value).split("\n").map(paragraph);
}

/**
 *
 * @param value
 * @param image
 */
export function createAnswerEditorValue(value = "", image = null) {
  const nodes = answerParagraphs(value);
  if (!image?.dataUrl) return nodes;
  const requestedPosition = Number(image?.layout?.position);
  const position = Number.isInteger(requestedPosition)
    ? Math.max(0, Math.min(requestedPosition, nodes.length))
    : nodes.length;
  nodes.splice(position, 0, answerImageNode(image));
  return nodes;
}

/**
 *
 * @param nodes
 */
export function readAnswerEditorText(nodes = []) {
  return nodes
    .filter(
      (node) =>
        !SlateElement.isElement(node) || node.type !== ANSWER_IMAGE_TYPE,
    )
    .map((node) => Node.string(node))
    .join("\n");
}

/**
 *
 * @param editor
 */
function withAnswerImages(editor) {
  const { isVoid, normalizeNode } = editor;
  editor.isVoid = (element) =>
    element.type === ANSWER_IMAGE_TYPE || isVoid(element);
  editor.normalizeNode = (entry) => {
    const [node] = entry;
    if (Editor.isEditor(node)) {
      const hasParagraph = node.children.some(
        (child) =>
          SlateElement.isElement(child) && child.type !== ANSWER_IMAGE_TYPE,
      );
      if (!hasParagraph) {
        Transforms.insertNodes(editor, paragraph(), {
          at: [node.children.length],
        });
        return;
      }
    }
    normalizeNode(entry);
  };
  return editor;
}

/**
 *
 * @param editor
 */
function imageEntry(editor) {
  const entry = Editor.nodes(editor, {
    at: [],
    match: (node) =>
      SlateElement.isElement(node) && node.type === ANSWER_IMAGE_TYPE,
  }).next();
  return entry.done ? null : entry.value;
}

/**
 *
 * @param imageElement
 */
function imageMaxWidth(imageElement) {
  const editable = imageElement.closest(".answer-rich-editor-editable");
  const styles = editable ? window.getComputedStyle(editable) : null;
  const horizontalPadding = styles
    ? Number.parseFloat(styles.paddingLeft) +
      Number.parseFloat(styles.paddingRight)
    : 0;
  const width =
    Math.floor((editable?.clientWidth || 0) - horizontalPadding) - 10;
  return Math.max(MIN_IMAGE_WIDTH, width || MIN_IMAGE_WIDTH);
}

/**
 *
 * @param width
 * @param maxWidth
 */
function clampedImageWidth(width, maxWidth) {
  return Math.max(MIN_IMAGE_WIDTH, Math.min(Math.round(width), maxWidth));
}

/**
 *
 * @param root0
 * @param root0.attributes
 * @param root0.children
 * @param root0.disabled
 * @param root0.element
 */
function AnswerImageElement({ attributes, children, disabled, element }) {
  const editor = useSlateStatic();
  const focused = useFocused();
  const selected = useSelected();
  const imageRef = useRef(null);
  const resizeCleanupRef = useRef(null);
  const [previewSize, setPreviewSize] = useState(null);
  const width = Number(previewSize?.width || element.width) || undefined;
  const height = Number(previewSize?.height || element.height) || undefined;
  const path = ReactEditor.findPath(editor, element);
  const position = path[0];
  const drawing = element.source === "drawing";

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  const selectImage = (event) => {
    if (disabled) return;
    event.preventDefault();
    Transforms.select(editor, path);
    ReactEditor.focus(editor);
  };

  const startResize = (event) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    const imageElement = imageRef.current;
    if (!imageElement) return;

    resizeCleanupRef.current?.();
    Transforms.select(editor, path);
    const rect = imageElement.getBoundingClientRect();
    const startWidth = Math.max(MIN_IMAGE_WIDTH, Math.round(rect.width));
    const startHeight = Math.max(1, Math.round(rect.height || startWidth));
    const ratio = startHeight / startWidth;
    const maxWidth = imageMaxWidth(imageElement);
    const startX = event.clientX;
    const startY = event.clientY;
    let latest = { width: startWidth, height: startHeight };
    const previousCursor = document.body.style.cursor;
    const previousSelection = document.body.style.userSelect;
    document.body.style.cursor = "nwse-resize";
    document.body.style.userSelect = "none";

    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelection;
      resizeCleanupRef.current = null;
    };
    const handlePointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const nextWidth = clampedImageWidth(
        Math.abs(deltaY) > Math.abs(deltaX)
          ? startWidth + deltaY / Math.max(ratio, 0.01)
          : startWidth + deltaX,
        maxWidth,
      );
      latest = {
        width: nextWidth,
        height: Math.max(1, Math.round(nextWidth * ratio)),
      };
      setPreviewSize(latest);
    };
    const handlePointerUp = () => {
      cleanup();
      setPreviewSize(null);
      if (latest.width !== startWidth || latest.height !== startHeight) {
        Transforms.setNodes(editor, latest, { at: path });
      }
      ReactEditor.focus(editor);
    };

    resizeCleanupRef.current = cleanup;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const resizeWithKeyboard = (event) => {
    if (
      disabled ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    const imageElement = imageRef.current;
    if (!imageElement) return;
    const rect = imageElement.getBoundingClientRect();
    const currentWidth = Math.max(MIN_IMAGE_WIDTH, Math.round(rect.width));
    const currentHeight = Math.max(1, Math.round(rect.height || currentWidth));
    const step = event.shiftKey ? 40 : 12;
    const increasing = event.key === "ArrowRight" || event.key === "ArrowDown";
    const nextWidth = clampedImageWidth(
      currentWidth + (increasing ? step : -step),
      imageMaxWidth(imageElement),
    );
    if (nextWidth === currentWidth) return;
    Transforms.setNodes(
      editor,
      {
        width: nextWidth,
        height: Math.max(
          1,
          Math.round(nextWidth * (currentHeight / currentWidth)),
        ),
      },
      { at: path },
    );
  };

  const setInitialSize = () => {
    const imageElement = imageRef.current;
    if (
      !imageElement ||
      width ||
      !imageElement.naturalWidth ||
      !imageElement.naturalHeight
    )
      return;
    const availableWidth = imageMaxWidth(imageElement);
    const maxWidth = drawing
      ? availableWidth
      : Math.min(MAX_INITIAL_IMAGE_WIDTH, availableWidth);
    const scale = Math.min(
      1,
      maxWidth / imageElement.naturalWidth,
      drawing
        ? Number.POSITIVE_INFINITY
        : MAX_INITIAL_IMAGE_HEIGHT / imageElement.naturalHeight,
    );
    Transforms.setNodes(
      editor,
      {
        width: Math.max(
          MIN_IMAGE_WIDTH,
          Math.round(imageElement.naturalWidth * scale),
        ),
        height: Math.max(1, Math.round(imageElement.naturalHeight * scale)),
      },
      { at: path },
    );
  };

  return (
    <div {...attributes} className="answer-rich-image-node">
      {children}
      <figure
        contentEditable={false}
        className={`answer-rich-image-block${selected && focused ? " selected" : ""}`}
        draggable={!disabled}
        onClick={selectImage}
        onDragStart={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData(IMAGE_DRAG_TYPE, String(position));
        }}
        style={
          width
            ? {
                width,
                ...(height ? { aspectRatio: `${width} / ${height}` } : {}),
              }
            : undefined
        }
      >
        <div className="answer-rich-image-canvas">
          <img
            ref={imageRef}
            src={element.src}
            alt={drawing ? "画板作答" : "拍照作答"}
            onLoad={setInitialSize}
          />
          {disabled ? null : (
            <span
              aria-label="调整图片大小"
              className="answer-rich-image-resize"
              role="button"
              tabIndex={0}
              title="拖动或使用方向键调整图片大小"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.focus();
              }}
              onKeyDown={resizeWithKeyboard}
              onPointerDown={startResize}
            />
          )}
        </div>
      </figure>
    </div>
  );
}

const AnswerRichEditor = forwardRef(function AnswerRichEditor(
  { disabled, image, onChange, onImageChange, placeholder, value },
  ref,
) {
  const editor = useMemo(
    () => withAnswerImages(withHistory(withReact(createEditor()))),
    [],
  );
  const initialValue = useMemo(() => createAnswerEditorValue(value, image), []); // eslint-disable-line react-hooks/exhaustive-deps
  const imageRef = useRef(image);
  imageRef.current = image;

  const replaceExternalText = useCallback(
    (nextText) => {
      if (readAnswerEditorText(editor.children) === String(nextText || ""))
        return;
      const currentImage = imageEntry(editor);
      const requestedPosition = Number(imageRef.current?.layout?.position);
      const paragraphs = answerParagraphs(nextText);
      Editor.withoutNormalizing(editor, () => {
        for (const [indexFromEnd, node] of [...editor.children]
          .reverse()
          .entries()) {
          if (SlateElement.isElement(node) && node.type === ANSWER_IMAGE_TYPE)
            continue;
          const index = editor.children.length - 1 - indexFromEnd;
          Transforms.removeNodes(editor, { at: [index] });
        }
        const imagePosition = currentImage
          ? Math.max(
              0,
              Math.min(
                Number.isInteger(requestedPosition)
                  ? requestedPosition
                  : paragraphs.length,
                paragraphs.length,
              ),
            )
          : paragraphs.length;
        for (const [index, node] of paragraphs.entries()) {
          const at = currentImage && index >= imagePosition ? index + 1 : index;
          Transforms.insertNodes(editor, node, { at: [at] });
        }
      });
    },
    [editor],
  );

  useImperativeHandle(ref, () => ({ replaceText: replaceExternalText }), [
    replaceExternalText,
  ]);

  useEffect(() => {
    replaceExternalText(value);
  }, [replaceExternalText, value]);

  useEffect(() => {
    const existing = imageEntry(editor);
    if (!image?.dataUrl) {
      if (existing) Transforms.removeNodes(editor, { at: existing[1] });
      return;
    }
    const nextNode = answerImageNode(image);
    if (existing) {
      const [node, path] = existing;
      const nextProperties = {
        src: nextNode.src,
        name: nextNode.name,
        source: nextNode.source,
        width: nextNode.width || node.width,
        height: nextNode.height || node.height,
      };
      if (
        Object.entries(nextProperties).some(
          ([key, nextValue]) => node[key] !== nextValue,
        )
      ) {
        Transforms.setNodes(editor, nextProperties, { at: path });
      }
      return;
    }
    const selectionPosition = editor.selection?.anchor?.path?.[0];
    const requestedPosition = Number(image.layout?.position);
    const position = Number.isInteger(requestedPosition)
      ? Math.max(0, Math.min(requestedPosition, editor.children.length))
      : Number.isInteger(selectionPosition)
        ? Math.min(selectionPosition + 1, editor.children.length)
        : editor.children.length;
    Transforms.insertNodes(editor, nextNode, { at: [position] });
  }, [editor, image]);

  const renderElement = useCallback(
    (properties) => {
      if (properties.element.type === ANSWER_IMAGE_TYPE) {
        return <AnswerImageElement {...properties} disabled={disabled} />;
      }
      return (
        <p {...properties.attributes} className="answer-rich-paragraph">
          {properties.children}
        </p>
      );
    },
    [disabled, onImageChange],
  );

  const syncValue = () => {
    if (
      !editor.operations.some((operation) => operation.type !== "set_selection")
    )
      return;
    const nextText = readAnswerEditorText(editor.children);
    if (nextText !== String(value || "")) onChange(nextText);
    const entry = imageEntry(editor);
    if (!entry) {
      if (imageRef.current) onImageChange(null);
      return;
    }
    if (!imageRef.current) return;
    const [node, path] = entry;
    const nextLayout = {
      position: path[0],
      ...(Number(node.width) ? { width: Math.round(Number(node.width)) } : {}),
      ...(Number(node.height)
        ? { height: Math.round(Number(node.height)) }
        : {}),
    };
    const currentLayout = imageRef.current.layout || {};
    if (
      nextLayout.position !== currentLayout.position ||
      nextLayout.width !== currentLayout.width ||
      nextLayout.height !== currentLayout.height
    ) {
      onImageChange({ ...imageRef.current, layout: nextLayout });
    }
  };

  const dropImage = (event) => {
    if (disabled) return;
    const sourcePosition = Number(event.dataTransfer.getData(IMAGE_DRAG_TYPE));
    if (!Number.isInteger(sourcePosition)) return;
    event.preventDefault();
    try {
      const range = ReactEditor.findEventRange(editor, event);
      const targetPosition = Math.max(
        0,
        Math.min(range.anchor.path[0], editor.children.length - 1),
      );
      Transforms.moveNodes(editor, {
        at: [sourcePosition],
        to: [targetPosition],
      });
      ReactEditor.focus(editor);
    } catch {
      // The up/down controls remain available when a browser cannot resolve a drop range.
    }
  };

  return (
    <div className={`answer-rich-editor${disabled ? " disabled" : ""}`}>
      <Slate editor={editor} initialValue={initialValue} onChange={syncValue}>
        <Editable
          className="answer-rich-editor-editable"
          disabled={disabled}
          placeholder={placeholder}
          renderElement={renderElement}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes(IMAGE_DRAG_TYPE))
              event.preventDefault();
          }}
          onDrop={dropImage}
          onKeyDown={(event) => {
            if (
              disabled ||
              !["Backspace", "Delete"].includes(event.key) ||
              !editor.selection
            )
              return;
            const selectedImage = Editor.nodes(editor, {
              at: editor.selection,
              match: (node) =>
                SlateElement.isElement(node) && node.type === ANSWER_IMAGE_TYPE,
            }).next();
            if (selectedImage.done) return;
            event.preventDefault();
            Transforms.removeNodes(editor, { at: selectedImage.value[1] });
          }}
        />
      </Slate>
    </div>
  );
});

export default AnswerRichEditor;
