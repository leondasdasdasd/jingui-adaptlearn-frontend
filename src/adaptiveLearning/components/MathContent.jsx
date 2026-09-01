import React, { useEffect, useRef } from "react";
import renderMathInElement from "katex/dist/contrib/auto-render.js";

import {
  mathDelimiters,
  normalizeMathForRendering,
} from "../lib/mathRendering";

import "katex/dist/katex.min.css";

const ignoredTags = new Set([
  "SCRIPT",
  "NOSCRIPT",
  "STYLE",
  "TEXTAREA",
  "PRE",
  "CODE",
  "OPTION",
]);

/**
 *
 * @param root
 */
function normalizeMathInElement(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  for (const node of textNodes) {
    const parent = node.parentElement;
    if (
      !parent ||
      ignoredTags.has(parent.tagName) ||
      parent.closest(".katex, .math-no-render")
    )
      continue;
    const normalized = normalizeMathForRendering(node.nodeValue);
    if (normalized !== node.nodeValue) node.nodeValue = normalized;
  }
}

/**
 * 仅增强展示层：保留原题数据和编辑器 JSON，已有题目无需重新生成。
 * renderKey 变化时会整体替换被 KaTeX 增强过的子树，避免 React 复用外部改写的 DOM。
 * @param root0
 * @param root0.as
 * @param root0.children
 * @param root0.className
 * @param root0.renderKey
 */
export default function MathContent({
  as: Component = "span",
  children,
  className,
  renderKey,
  ...props
}) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    });
    const render = () => {
      observer.disconnect();
      normalizeMathInElement(root);
      renderMathInElement(root, {
        delimiters: mathDelimiters,
        ignoredTags: [
          "script",
          "noscript",
          "style",
          "textarea",
          "pre",
          "code",
          "option",
        ],
        ignoredClasses: ["katex", "math-no-render"],
        throwOnError: false,
        strict: "ignore",
        trust: false,
      });
      observer.observe(root, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [renderKey]);

  return (
    <Component key={renderKey} ref={rootRef} className={className} {...props}>
      {children}
    </Component>
  );
}
