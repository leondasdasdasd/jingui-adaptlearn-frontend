import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Layers3, Network } from "lucide-react";
import PropTypes from "prop-types";

import { isMasteredValue } from "../../shared/domain/masteryPolicy";

/**
 * 计算考点的掌握状态
 * @param {string} kpId
 * @param {object} knowledgeProfile
 */
export function getKpMasteryInfo(kpId, knowledgeProfile = {}) {
  const item = knowledgeProfile?.[kpId];
  if (!item) {
    return { status: "unassessed", label: "待检测", mastery: null };
  }
  const val = item.mastery;
  const isMastered =
    item.state === "mastered" ||
    item.status === "mastered" ||
    isMasteredValue(val);
  if (isMastered) {
    return { status: "mastered", label: "已掌握", mastery: val ?? 100 };
  }
  const isNeedsReview =
    item.state === "needs_review" ||
    item.status === "needs_review" ||
    (Number.isFinite(Number(val)) && Number(val) > 0);
  if (isNeedsReview) {
    return { status: "needs_review", label: "需要巩固", mastery: val };
  }
  return { status: "unassessed", label: "待检测", mastery: val };
}

/**
 * 单元考点中心向外发散思维导图
 * 第一级（中间）：单元名（如实数/有理数）
 * 第二级：课时名（去掉了1.1等序号）
 * 第三级：知识点名称（仅知识点名称与状态颜色指示，无多余文字标签）
 * 顶部悬浮栏：标题与图标单行 + 掌握状态颜色图例
 */
export default function UnitKnowledgeMindmap({ chapter, knowledgeProfile = {} }) {
  const containerRef = useRef(null);
  const centerNodeRef = useRef(null);
  const sectionRefs = useRef({});
  const kpRefs = useRef({});
  const [lines, setLines] = useState([]);

  const sections = useMemo(() => chapter?.sections || [], [chapter]);

  // 将章节课时左右均衡分组，构成中心发散的双侧布局
  const { leftSections, rightSections } = useMemo(() => {
    const total = sections.length;
    if (total === 0) return { leftSections: [], rightSections: [] };
    if (total === 1) return { leftSections: [], rightSections: sections };

    const mid = Math.ceil(total / 2);
    return {
      leftSections: sections.slice(0, mid),
      rightSections: sections.slice(mid),
    };
  }, [sections]);

  // 测量各节点中心及边缘位置，计算平滑三阶贝塞尔曲线
  const updateLines = () => {
    const container = containerRef.current;
    const centerNode = centerNodeRef.current;
    if (!container || !centerNode) return;

    const cRect = container.getBoundingClientRect();
    if (!cRect || cRect.width === 0 || cRect.height === 0) return;

    const centerRect = centerNode.getBoundingClientRect();
    const centerLeft = {
      x: centerRect.left - cRect.left,
      y: centerRect.top + centerRect.height / 2 - cRect.top,
    };
    const centerRight = {
      x: centerRect.right - cRect.left,
      y: centerRect.top + centerRect.height / 2 - cRect.top,
    };

    const newLines = [];

    // 计算左侧曲线（从中间向左散开）
    leftSections.forEach((sec) => {
      const secEl = sectionRefs.current[sec.id];
      if (!secEl) return;
      const secRect = secEl.getBoundingClientRect();
      const secRight = {
        x: secRect.right - cRect.left,
        y: secRect.top + secRect.height / 2 - cRect.top,
      };
      const secLeft = {
        x: secRect.left - cRect.left,
        y: secRect.top + secRect.height / 2 - cRect.top,
      };

      // 中心 -> 课时 (从右向左曲，统一柔和中性蓝紫线)
      const dx1 = Math.abs(centerLeft.x - secRight.x) * 0.5;
      newLines.push({
        id: `center-to-sec-${sec.id}`,
        d: `M ${centerLeft.x} ${centerLeft.y} C ${centerLeft.x - dx1} ${centerLeft.y}, ${secRight.x + dx1} ${secRight.y}, ${secRight.x} ${secRight.y}`,
        color: "#a5b4fc",
        width: 2,
      });

      // 课时 -> 知识点 (根据知识点掌握颜色匹配)
      (sec.knowledgePoints || []).forEach((kp) => {
        const kpEl = kpRefs.current[kp.id];
        if (!kpEl) return;
        const kpRect = kpEl.getBoundingClientRect();
        const kpRight = {
          x: kpRect.right - cRect.left,
          y: kpRect.top + kpRect.height / 2 - cRect.top,
        };
        const dx2 = Math.abs(secLeft.x - kpRight.x) * 0.5;

        const kpInfo = getKpMasteryInfo(kp.id, knowledgeProfile);
        let kpLineColor = "#cbd5e1";
        if (kpInfo.status === "mastered") kpLineColor = "#86efac";
        else if (kpInfo.status === "needs_review") kpLineColor = "#fde68a";

        newLines.push({
          id: `sec-${sec.id}-to-kp-${kp.id}`,
          d: `M ${secLeft.x} ${secLeft.y} C ${secLeft.x - dx2} ${secLeft.y}, ${kpRight.x + dx2} ${kpRight.y}, ${kpRight.x} ${kpRight.y}`,
          color: kpLineColor,
          width: 1.5,
        });
      });
    });

    // 计算右侧曲线（从中间向右散开）
    rightSections.forEach((sec) => {
      const secEl = sectionRefs.current[sec.id];
      if (!secEl) return;
      const secRect = secEl.getBoundingClientRect();
      const secLeft = {
        x: secRect.left - cRect.left,
        y: secRect.top + secRect.height / 2 - cRect.top,
      };
      const secRight = {
        x: secRect.right - cRect.left,
        y: secRect.top + secRect.height / 2 - cRect.top,
      };

      // 中心 -> 课时 (从左向右曲，统一柔和中性蓝紫线)
      const dx1 = Math.abs(secLeft.x - centerRight.x) * 0.5;
      newLines.push({
        id: `center-to-sec-${sec.id}`,
        d: `M ${centerRight.x} ${centerRight.y} C ${centerRight.x + dx1} ${centerRight.y}, ${secLeft.x - dx1} ${secLeft.y}, ${secLeft.x} ${secLeft.y}`,
        color: "#a5b4fc",
        width: 2,
      });

      // 课时 -> 知识点 (根据知识点掌握颜色匹配)
      (sec.knowledgePoints || []).forEach((kp) => {
        const kpEl = kpRefs.current[kp.id];
        if (!kpEl) return;
        const kpRect = kpEl.getBoundingClientRect();
        const kpLeft = {
          x: kpRect.left - cRect.left,
          y: kpRect.top + kpRect.height / 2 - cRect.top,
        };
        const dx2 = Math.abs(kpLeft.x - secRight.x) * 0.5;

        const kpInfo = getKpMasteryInfo(kp.id, knowledgeProfile);
        let kpLineColor = "#cbd5e1";
        if (kpInfo.status === "mastered") kpLineColor = "#86efac";
        else if (kpInfo.status === "needs_review") kpLineColor = "#fde68a";

        newLines.push({
          id: `sec-${sec.id}-to-kp-${kp.id}`,
          d: `M ${secRight.x} ${secRight.y} C ${secRight.x + dx2} ${secRight.y}, ${kpLeft.x - dx2} ${kpLeft.y}, ${kpLeft.x} ${kpLeft.y}`,
          color: kpLineColor,
          width: 1.5,
        });
      });
    });

    setLines(newLines);
  };

  useLayoutEffect(() => {
    updateLines();
  }, [chapter, leftSections, rightSections, knowledgeProfile]);

  useEffect(() => {
    const handleResize = () => {
      updateLines();
    };

    window.addEventListener("resize", handleResize);
    let observer;
    if (containerRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateLines();
      });
      observer.observe(containerRef.current);
    }

    const t = setTimeout(updateLines, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (observer) observer.disconnect();
      clearTimeout(t);
    };
  }, [chapter, knowledgeProfile]);

  return (
    <section className="unit-mindmap-section-card" id="unit-knowledge-mindmap">
      {/* 悬浮在导图画板上的单行标题与状态图例 */}
      <div className="unit-mindmap-floating-header">
        <div className="unit-mindmap-title-row">
          <div className="unit-mindmap-icon-badge">
            <Network size={16} />
          </div>
          <h2 className="unit-mindmap-title">知识地图</h2>
        </div>

        {/* 额外标签：表达不同颜色代表什么状态 */}
        <div className="unit-mindmap-legend" aria-label="掌握状态图例">
          <span className="unit-legend-item">
            <span className="unit-legend-dot dot-mastered" />
            <span>已掌握</span>
          </span>
          <span className="unit-legend-item">
            <span className="unit-legend-dot dot-needs-review" />
            <span>需要巩固</span>
          </span>
          <span className="unit-legend-item">
            <span className="unit-legend-dot dot-unassessed" />
            <span>待检测</span>
          </span>
        </div>
      </div>

      {/* 思维导图画板容器 */}
      <div className="unit-mindmap-canvas-wrapper">
        <div className="unit-mindmap-canvas" ref={containerRef}>
          {/* SVG 连接线 */}
          <svg className="unit-mindmap-svg" aria-hidden="true">
            {lines.map((line) => (
              <path
                key={line.id}
                d={line.d}
                fill="none"
                stroke={line.color}
                strokeWidth={line.width}
                strokeLinecap="round"
              />
            ))}
          </svg>

          {/* 左侧课时与知识点 */}
          <div className="unit-mindmap-side unit-mindmap-left">
            {leftSections.map((sec) => (
              <div key={sec.id} className="unit-mindmap-group unit-group-left">
                {/* 第三级：知识点（只包含颜色圆点与知识点名称，无多余文字标签） */}
                <div className="unit-mindmap-kps-col unit-kps-left">
                  {(sec.knowledgePoints || []).map((kp) => {
                    const kpStatus = getKpMasteryInfo(kp.id, knowledgeProfile);
                    return (
                      <div
                        key={kp.id}
                        ref={(el) => {
                          if (el) kpRefs.current[kp.id] = el;
                        }}
                        className={`unit-node-kp status-${kpStatus.status}`}
                        title={kp.name}
                      >
                        <span className={`unit-kp-status-dot dot-${kpStatus.status}`} />
                        <span className="unit-kp-text">{kp.name}</span>
                      </div>
                    );
                  })}
                </div>

                {/* 第二级：课时（去掉 1.1、1.2 序号，仅保留课时标题，无掌握度文字） */}
                <div
                  ref={(el) => {
                    if (el) sectionRefs.current[sec.id] = el;
                  }}
                  className="unit-node-section"
                  title={sec.title}
                >
                  <span className="unit-section-title-text">{sec.title}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 中心：第一级 单元名（不叫单元中心，仅单元名称，如“实数”或“有理数”） */}
          <div className="unit-mindmap-center">
            <div
              ref={centerNodeRef}
              className="unit-node-center"
              title={chapter?.title}
            >
              <div className="unit-center-icon">
                <Layers3 size={16} />
              </div>
              <span className="unit-center-title">{chapter?.title}</span>
            </div>
          </div>

          {/* 右侧课时与知识点 */}
          <div className="unit-mindmap-side unit-mindmap-right">
            {rightSections.map((sec) => (
              <div key={sec.id} className="unit-mindmap-group unit-group-right">
                {/* 第二级：课时（去掉 1.1、1.2 序号，仅保留课时标题，无掌握度文字） */}
                <div
                  ref={(el) => {
                    if (el) sectionRefs.current[sec.id] = el;
                  }}
                  className="unit-node-section"
                  title={sec.title}
                >
                  <span className="unit-section-title-text">{sec.title}</span>
                </div>

                {/* 第三级：知识点（只包含颜色圆点与知识点名称，无多余文字标签） */}
                <div className="unit-mindmap-kps-col unit-kps-right">
                  {(sec.knowledgePoints || []).map((kp) => {
                    const kpStatus = getKpMasteryInfo(kp.id, knowledgeProfile);
                    return (
                      <div
                        key={kp.id}
                        ref={(el) => {
                          if (el) kpRefs.current[kp.id] = el;
                        }}
                        className={`unit-node-kp status-${kpStatus.status}`}
                        title={kp.name}
                      >
                        <span className={`unit-kp-status-dot dot-${kpStatus.status}`} />
                        <span className="unit-kp-text">{kp.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

UnitKnowledgeMindmap.propTypes = {
  chapter: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    sections: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        index: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        title: PropTypes.string,
        knowledgePoints: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string,
            name: PropTypes.string,
          }),
        ),
      }),
    ),
  }),
  knowledgeProfile: PropTypes.object,
};
