import React from "react";
/**
 *
 * @param root0
 * @param root0.label
 * @param root0.size
 */
export default function BrandLogo({ label = "云谷学习", size = "md" }) {
  return (
    <span
      className={`brand-logo brand-logo-${size}`}
      aria-label={label}
      role="img"
    >
      <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <rect
          className="brand-logo-tile"
          x="2"
          y="2"
          width="36"
          height="36"
          rx="11"
        />
        <path className="brand-logo-stem" d="M20 29V22" />
        <path
          className="brand-logo-branch-muted"
          d="M20 22C18.3 18.7 15.3 16.1 11 14"
        />
        <path
          className="brand-logo-branch"
          d="M20 22C22 18.2 25 14.9 29 11.5"
        />
        <circle className="brand-logo-node-origin" cx="20" cy="29" r="2.1" />
        <circle className="brand-logo-node-option" cx="11" cy="14" r="2.1" />
        <circle className="brand-logo-node-active" cx="29" cy="11.5" r="2.65" />
        <circle className="brand-logo-node-core" cx="29" cy="11.5" r="1" />
      </svg>
    </span>
  );
}
