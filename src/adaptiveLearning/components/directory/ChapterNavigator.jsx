import React, { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock3,
  Search,
} from "lucide-react";

/**
 * 章节目录导航侧边栏
 * @param root0
 * @param root0.course
 * @param root0.selectedSection
 * @param root0.onChooseSection
 */
export default function ChapterNavigator({
  course,
  selectedSection,
  onChooseSection,
}) {
  const [keyword, setKeyword] = useState("");

  // 默认让所有章节保持展开状态，用户可随时独立折叠/展开任意章节
  const [expandedIds, setExpandedIds] = useState(() => {
    return new Set(course?.chapters?.map((c) => c.id) || []);
  });

  const toggleChapter = (chapterId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  // 根据搜索关键词过滤章节与课时
  const filteredChapters = useMemo(() => {
    if (!keyword.trim()) return course.chapters;
    const lower = keyword.trim().toLowerCase();
    return course.chapters
      .map((chapter) => {
        const matchedSections = chapter.sections.filter(
          (sec) =>
            sec.title.toLowerCase().includes(lower) ||
            sec.index.toLowerCase().includes(lower) ||
            sec.knowledgePoints?.some((kp) =>
              kp.name.toLowerCase().includes(lower),
            ),
        );
        if (
          chapter.title.toLowerCase().includes(lower) ||
          matchedSections.length > 0
        ) {
          return {
            ...chapter,
            sections:
              matchedSections.length > 0 ? matchedSections : chapter.sections,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [course.chapters, keyword]);

  return (
    <aside className="modern-sidebar-panel" aria-label="学习目录导航">
      <div className="sidebar-top-bar">
        <div className="sidebar-search-box">
          <Search size={15} className="sidebar-search-icon" />
          <input
            type="search"
            className="sidebar-search-input"
            placeholder="搜索章节或知识点..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            aria-label="搜索章节"
          />
        </div>
      </div>

      <div className="sidebar-scroll-container">
        {filteredChapters.length > 0 ? (
          filteredChapters.map((chapter, idx) => {
            const isExpanded =
              expandedIds.has(chapter.id) || Boolean(keyword.trim());
            return (
              <div
                className={`modern-chapter-card ${isExpanded ? "expanded" : "collapsed"}`}
                key={chapter.id}
              >
                <button
                  type="button"
                  className="modern-chapter-header"
                  onClick={() => toggleChapter(chapter.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="chapter-header-left">
                    <span className="chapter-idx-pill">
                      {chapter.index
                        ? chapter.index.replaceAll(/\D/g, "") || idx + 1
                        : idx + 1}
                    </span>
                    <span className="chapter-title-text">{chapter.title}</span>
                  </div>
                  <div className="chapter-header-right">
                    <span className="chapter-section-count">
                      {chapter.sections.length} 课时
                    </span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 text-slate-400 ${
                        isExpanded ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="section-items-wrapper">
                    {chapter.sections.map((section) => {
                      const isSelected = selectedSection?.id === section.id;
                      return (
                        <button
                          type="button"
                          key={section.id}
                          className={`modern-section-button ${isSelected ? "active" : ""}`}
                          onClick={() => onChooseSection(chapter, section)}
                        >
                          <div className="section-btn-left">
                            <span className="section-num-tag">
                              {section.index}
                            </span>
                            <span className="section-title-label">
                              {section.title}
                            </span>
                          </div>
                          <div className="section-btn-right">
                            {isSelected ? (
                              <ChevronRight
                                size={15}
                                className="text-indigo-600 font-bold"
                              />
                            ) : (
                              <Clock3 size={13} className="text-slate-400" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center text-slate-400 text-sm">
            未找到与「{keyword}」匹配的课时
          </div>
        )}
      </div>
    </aside>
  );
}
