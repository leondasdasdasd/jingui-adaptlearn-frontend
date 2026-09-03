import React from "react";
import { BookOpen, Layers3, ScanSearch } from "lucide-react";
import PropTypes from "prop-types";

const MODE_ICONS = new Map([
  ["book-open", BookOpen],
  ["layers", Layers3],
  ["scan-search", ScanSearch],
]);

/**
 * @param {object} props 图标显示参数。
 * @param {string} props.name 学习模式图标名。
 * @param {number} props.size 图标尺寸。
 * @returns {React.ReactElement} 学习模式图标。
 */
export default function LearningModeIcon({ name, size }) {
  const Icon = MODE_ICONS.get(name) || BookOpen;
  return <Icon size={size} aria-hidden="true" />;
}

LearningModeIcon.propTypes = {
  name: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired,
};
