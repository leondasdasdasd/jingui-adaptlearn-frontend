import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Presentation,
  Search,
  ChevronDown,
  ChevronRight,
  Clock3,
  CheckCircle2,
  Lock,
} from "lucide-react";

/**
 * 章节导航与课堂切换侧边栏
 */
export default function ChapterNavigator({
  course,
  openChapter,
  selectedSection,
  onToggleChapter,
  onChooseSection,
  directoryMode,
  onModeChange,
  classroomDirectory,
  openClassroom,
  selectedClassroom,
  onToggleClassroom,
}) {
  const [keyword, setKeyword] = useState("");

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
        <div className="modern-mode-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={directoryMode === "textbook"}
            className={`modern-mode-tab ${directoryMode === "textbook" ? "active" : ""}`}
            onClick={() => onModeChange("textbook")}
          >
            <BookOpen size={16} />
            <span>教材进阶</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={directoryMode === "classroom"}
            className={`modern-mode-tab ${directoryMode === "classroom" ? "active" : ""}`}
            onClick={() => onModeChange("classroom")}
          >
            <Presentation size={16} />
            <span>老师课堂</span>
            {classroomDirectory?.items?.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-xs bg-indigo-100 text-indigo-700 rounded-full font-bold">
                {classroomDirectory.items.length}
              </span>
            )}
          </button>
        </div>

        {directoryMode === "textbook" && (
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
        )}
      </div>

      <div className="sidebar-scroll-container">
        {directoryMode === "textbook" ? (
          filteredChapters.length > 0 ? (
            filteredChapters.map((chapter, idx) => {
              const isExpanded =
                openChapter === chapter.id || Boolean(keyword.trim());
              return (
                <div
                  className={`modern-chapter-card ${isExpanded ? "expanded" : ""}`}
                  key={chapter.id}
                >
                  <button
                    type="button"
                    className="modern-chapter-header"
                    onClick={() => onToggleChapter(chapter.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="chapter-header-left">
                      <span className="chapter-idx-pill">
                        {chapter.index ? chapter.index.replace(/[^0-9]/g, "") || (idx + 1) : (idx + 1)}
                      </span>
                      <span className="chapter-title-text">{chapter.title}</span>
                    </div>
                    <div className="chapter-header-right">
                      <span className="chapter-section-count">
                        {chapter.sections.length} 课时
                      </span>
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="section-items-wrapper">
                      {chapter.sections.map((section) => {
                        const isSelected = selectedSection.id === section.id;
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
                                <ChevronRight size={15} className="text-indigo-600 font-bold" />
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
          )
        ) : classroomDirectory.status === "loading" ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            正在同步老师课堂数据…
          </div>
        ) : classroomDirectory.items?.length > 0 ? (
          classroomDirectory.items.map((classroom) => {
            const isSelected =
              selectedClassroom?.id === classroom.id ||
              openClassroom === classroom.id;
            return (
              <div
                key={classroom.id}
                className={`modern-classroom-item ${isSelected ? "active" : ""}`}
                onClick={() => onToggleClassroom(classroom)}
                role="button"
                tabIndex={0}
              >
                <div className="classroom-item-header">
                  <span
                    className={`classroom-status-pill ${classroom.status.toLowerCase().replaceAll("_", "-")}`}
                  >
                    {classroom.statusLabel}
                  </span>
                  <span className="text-xs text-slate-400">
                    {classroom.knowledgePoints?.length || 0} 个知识点
                  </span>
                </div>
                <h4 className="classroom-item-title">{classroom.title}</h4>
                <div className="classroom-item-meta">
                  <span>
                    {classroom.sourceLessons?.length > 0
                      ? `${classroom.sourceLessons.length} 课时方案`
                      : "自适应课堂"}
                  </span>
                  {classroom.estimatedMinutes && (
                    <span>· 约 {classroom.estimatedMinutes} 分钟</span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">
            暂无老师发布的课堂安排
          </div>
        )}
      </div>
    </aside>
  );
}
