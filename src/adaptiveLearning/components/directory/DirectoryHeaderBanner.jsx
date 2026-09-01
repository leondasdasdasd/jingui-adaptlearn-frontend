import React from "react";
import { Trophy, Sparkles, ChevronRight, Network } from "lucide-react";

/**
 * 学习首页顶部简洁欢迎横幅
 */
export default function DirectoryHeaderBanner({
  courseName = "七年级数学 · 上册",
  masteredCount = 0,
  totalCount = 0,
  onOpenKnowledgeMap,
}) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return "夜深了，注意休息";
    if (hour < 12) return "早晨好";
    if (hour < 14) return "中午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  };

  return (
    <header className="directory-hero-banner" role="banner">
      <div className="hero-banner-content">
        <div className="hero-greeting-tag">
          <Sparkles size={14} className="text-amber-300" />
          <span>{getGreeting()}</span>
        </div>
        <h1 className="hero-banner-title">{courseName}</h1>
      </div>

      <div className="hero-banner-stats">
        <button
          type="button"
          className="hero-stat-card hero-stat-card-clickable group"
          onClick={onOpenKnowledgeMap}
          title="点击查看认知图谱与学习画像"
          aria-label="查看认知图谱与学习画像"
        >
          <div className="hero-stat-card-top">
            <span className="stat-val flex items-center justify-center gap-1.5">
              <Trophy size={18} className="text-amber-300 inline flex-shrink-0" />
              <span>{masteredCount}/{totalCount}</span>
            </span>
          </div>
          <div className="hero-stat-card-bottom">
            <span className="stat-lbl flex items-center gap-1">
              <Network size={12} className="text-indigo-200" />
              <span>已掌握考点 · 认知画像</span>
              <ChevronRight size={13} className="text-indigo-200 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </button>
      </div>
    </header>
  );
}

