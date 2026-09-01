import React, { useEffect, useRef, useState } from "react";
import { BookOpen, Check, ChevronDown, GraduationCap, X } from "lucide-react";

import {
  findCourse,
} from "../../shared/domain/courseCatalog";

/**
 * 顶部导航右上角课程/学科/年级/学期切换器
 * 允许切换：年级（七/八/九年级）、学科（数学等）、上下册
 * 不可切换：教材版本（锁定为浙教版）
 * @param root0
 * @param root0.currentCourse
 * @param root0.onSelectCourse
 */
export default function CourseSwitcher({ currentCourse, onSelectCourse }) {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef(null);

  // 解析当前课程的学科、年级、上下册
  const parseGradeAndTerm = (gradeStr = "") => {
    let grade = "七年级";
    let term = "上册";
    if (gradeStr.includes("八年级") || gradeStr.includes("8")) {
      grade = "八年级";
    } else if (gradeStr.includes("九年级") || gradeStr.includes("9")) {
      grade = "九年级";
    } else {
      grade = "七年级";
    }

    term =
      gradeStr.includes("下") || gradeStr.includes("volume2") ? "下册" : "上册";
    return { grade, term };
  };

  const currentParsed = parseGradeAndTerm(
    currentCourse?.grade || currentCourse?.name || "",
  );

  const [tempSubject, setTempSubject] = useState(
    currentCourse?.subject || "数学",
  );
  const [tempGrade, setTempGrade] = useState(currentParsed.grade);
  const [tempTerm, setTempTerm] = useState(currentParsed.term);

  // 同步外部课程状态
  useEffect(() => {
    const parsed = parseGradeAndTerm(
      currentCourse?.grade || currentCourse?.name || "",
    );
    setTempSubject(currentCourse?.subject || "数学");
    setTempGrade(parsed.grade);
    setTempTerm(parsed.term);
  }, [currentCourse]);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const grades = [
    { label: "七年级", value: "七年级" },
    { label: "八年级", value: "八年级" },
    { label: "九年级", value: "九年级" },
  ];

  const terms = [
    { label: "上册", value: "上册" },
    { label: "下册", value: "下册" },
  ];

  const handleConfirmSwitch = (
    grade = tempGrade,
    term = tempTerm,
    subject = tempSubject,
  ) => {
    if (subject !== "数学") {
      return;
    }
    const targetGrade = `${grade}${term}`;
    const matched = findCourse({
      subject: "数学",
      grade: targetGrade,
      publisher: "浙教版",
    });

    if (matched) {
      onSelectCourse(matched);
      setIsOpen(false);
    }
  };

  // 生成当前显示的精简标题
  const displayLabel = `${currentParsed.grade}${currentCourse?.subject || "数学"} · ${currentParsed.term}`;

  return (
    <div className="course-switcher-wrapper">
      {/* 顶部触发按钮 */}
      <button
        type="button"
        className={`course-switcher-trigger ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title="点击切换年级、学科与学期"
      >
        <span className="course-switcher-icon">
          <BookOpen size={14} />
        </span>
        <span className="course-switcher-text">{displayLabel}</span>
        <ChevronDown
          size={14}
          className={`course-switcher-arrow ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* 模态弹窗 / 下拉面板 */}
      {isOpen && (
        <div
          className="course-switcher-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div className="course-switcher-modal" ref={modalRef}>
            {/* 弹窗头部 */}
            <div className="course-switcher-header">
              <div
                className="course-switcher-header-title"
                style={{ display: "flex", alignItems: "center", gap: "8px", flexDirection: "row" }}
              >
                <GraduationCap size={18} style={{ color: "#4F46E5", flexShrink: 0 }} />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#1E293B", lineHeight: 1, whiteSpace: "nowrap" }}>
                  切换学科学段
                </h3>
              </div>
              <button
                type="button"
                className="course-switcher-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="course-switcher-body">
              {/* 1. 年级选择 */}
              <div className="switcher-section">
                <div className="switcher-section-title">
                  <span>年级选择</span>
                </div>
                <div className="switcher-chips-grid grades-grid">
                  {grades.map((g) => {
                    const isSelected = tempGrade === g.value;
                    return (
                      <button
                        type="button"
                        key={g.value}
                        className={`switcher-chip-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => setTempGrade(g.value)}
                      >
                        <span>{g.label}</span>
                        {isSelected && (
                          <Check size={14} className="chip-check-icon" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. 学科选择 */}
              <div className="switcher-section">
                <div className="switcher-section-title">
                  <span>学科选择</span>
                </div>
                <div className="switcher-chips-grid subjects-grid">
                  <button
                    type="button"
                    className="switcher-chip-btn selected"
                    onClick={() => setTempSubject("数学")}
                  >
                    <span>数学</span>
                    <Check size={14} className="chip-check-icon" />
                  </button>
                  <button
                    type="button"
                    disabled
                    className="switcher-chip-btn disabled"
                  >
                    <span>其他学科</span>
                    <span className="chip-tag-muted">敬请期待</span>
                  </button>
                </div>
              </div>

              {/* 3. 学期/上下册选择 */}
              <div className="switcher-section">
                <div className="switcher-section-title">
                  <span>学期分册</span>
                </div>
                <div className="switcher-chips-grid terms-grid">
                  {terms.map((t) => {
                    const isSelected = tempTerm === t.value;
                    return (
                      <button
                        type="button"
                        key={t.value}
                        className={`switcher-chip-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => setTempTerm(t.value)}
                      >
                        <span>{t.label}</span>
                        {isSelected && (
                          <Check size={14} className="chip-check-icon" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 弹窗底部操作 */}
            <div className="course-switcher-footer">
              <div className="flex items-center justify-end gap-3 w-full">
                <button
                  type="button"
                  className="switcher-cancel-btn"
                  onClick={() => setIsOpen(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="switcher-confirm-btn"
                  onClick={() => handleConfirmSwitch()}
                >
                  确认切换
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
