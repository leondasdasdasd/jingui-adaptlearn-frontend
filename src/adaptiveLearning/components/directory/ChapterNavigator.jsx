import React from "react";

export default function ChapterNavigator({
  chapters = [],
  openChapter,
  onToggleChapter,
  selectedSection,
  onSelectSection,
}) {
  return (
    <div className="modern-chapter-navigator">
      {chapters.map((chapter) => {
        const isOpen = openChapter === chapter.id;
        return (
          <div key={chapter.id} className={`modern-chapter-card ${isOpen ? "" : "collapsed"}`}>
            <div
              className="modern-chapter-header"
              onClick={() => onToggleChapter && onToggleChapter(chapter.id)}
              style={{ cursor: "pointer", padding: "12px 16px", fontWeight: "bold" }}
            >
              <span>{chapter.title}</span>
            </div>
            {isOpen && (
              <div className="modern-chapter-sections" style={{ padding: "8px 16px" }}>
                {(chapter.sections || []).map((sec) => (
                  <div
                    key={sec.id}
                    onClick={() => onSelectSection && onSelectSection(sec)}
                    style={{
                      padding: "8px",
                      cursor: "pointer",
                      background: selectedSection?.id === sec.id ? "#e0f2fe" : "transparent",
                      borderRadius: "6px",
                      marginBottom: "4px",
                    }}
                  >
                    {sec.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
