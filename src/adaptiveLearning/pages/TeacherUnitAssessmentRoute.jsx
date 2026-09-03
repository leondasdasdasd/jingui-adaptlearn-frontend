import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Grid3X3,
  History,
  ListChecks,
  ListFilter,
  LoaderCircle,
  Play,
} from "lucide-react";

import { trans } from "../../utils/i18n";
import TeacherShell from "../components/TeacherShell";
import { routes } from "../routes/routePaths";
import { useLocation, useNavigate, useParams } from "../routing";
import { useLearningSession } from "../session/LearningSessionContext";
import { createEmptyLearningSession } from "../session/learningSessionModel";
import { resolveUnitAssessmentChapter } from "../teacher/application/resolveUnitAssessmentChapter";
import AssessmentKnowledgeCoverageQuery from "../teacher/components/AssessmentKnowledgeCoverageQuery";
import AssessmentQuestionCreateModal from "../teacher/components/AssessmentQuestionCreateModal";
import AssessmentQuestionPickerModal from "../teacher/components/AssessmentQuestionPickerModal";
import AssessmentSlotsSection from "../teacher/components/AssessmentSlotsSection";
import KnowledgeAssessmentMatrix from "../teacher/components/KnowledgeAssessmentMatrix";
import {
  readTeacherContent,
  writeTeacherContent,
} from "../teacher/data/teacherContentRepository";
import { buildUnitAssessmentContent } from "../teacher/domain/unitAssessmentContent";
import { projectAssessmentKnowledgeCoverage } from "../teacher/presentation/assessmentKnowledgeCoverage";
import { curriculumText } from "../teacher/presentation/curriculumPresentation";
import { projectUnitAssessmentContent } from "../teacher/presentation/unitAssessmentPresentation";

import "../unit-assessment.css";

/** 单元测试评估工作台，包含单元认知评估矩阵、测试题目插槽与知识点覆盖查询。 */
export default function TeacherUnitAssessmentRoute() {
  const { chapterId, courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { startTransientSession } = useLearningSession();
  const [variant, setVariant] = useState(0);
  const [activeSectionTab, setActiveSectionTab] = useState("matrix");
  const [selectedCellId, setSelectedCellId] = useState("");
  const [assignedQuestions, setAssignedQuestions] = useState({});
  const [isModified, setIsModified] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState(null);
  const [publishedVersions, setPublishedVersions] = useState([]);
  const [selectedPublishedVersionId, setSelectedPublishedVersionId] =
    useState("");

  const [pickerState, setPickerState] = useState({
    open: false,
    slotId: null,
    questionType: "",
  });
  const [createModalState, setCreateModalState] = useState({
    open: false,
    slot: null,
  });

  const chapter = useMemo(
    () =>
      resolveUnitAssessmentChapter({
        courseId,
        chapterId,
        routedChapter: location.state?.chapter,
      }),
    [chapterId, courseId, location.state],
  );

  const unitAssessmentKey = `unit-assessment-${chapter?.id || chapterId}`;

  useEffect(() => {
    if (!chapter?.id) return;
    const allContent = readTeacherContent();
    const stored = allContent[unitAssessmentKey] || {};
    const versions = stored.publishedVersions || [
      {
        id: "v1",
        versionNumber: stored.publishedVersionNumber || 1,
        publishedAt: stored.publishedAt || new Date().toISOString(),
      },
    ];
    setPublishedVersions(versions);
    setSelectedPublishedVersionId(versions[0]?.id || "v1");
    if (stored.assignedQuestions) {
      setAssignedQuestions(stored.assignedQuestions);
    }
  }, [chapter?.id, unitAssessmentKey]);

  const latestPublishedVersion = publishedVersions[0] || null;
  const selectedPublishedVersion =
    publishedVersions.find((v) => v.id === selectedPublishedVersionId) ||
    latestPublishedVersion;
  const viewingHistoricalVersion = Boolean(
    selectedPublishedVersion &&
      latestPublishedVersion &&
      selectedPublishedVersion.id !== latestPublishedVersion.id,
  );

  const content = useMemo(
    () =>
      chapter
        ? projectUnitAssessmentContent(
            buildUnitAssessmentContent(chapter, variant),
          )
        : null,
    [chapter, variant],
  );

  const questionSlotsWithAssigned = useMemo(() => {
    if (!content?.assessment?.questionSlots) return [];
    return content.assessment.questionSlots.map((slot) => {
      const bound = assignedQuestions[slot.id] || [];
      return {
        ...slot,
        questions: bound.length > 0 ? bound : slot.questions || [],
      };
    });
  }, [content, assignedQuestions]);

  const coverageRows = useMemo(() => {
    if (!content?.knowledgePoints || !questionSlotsWithAssigned) return [];
    return projectAssessmentKnowledgeCoverage({
      knowledgePoints: content.knowledgePoints,
      slots: questionSlotsWithAssigned,
      countEmptySlotsAsPlanned: true,
    });
  }, [content, questionSlotsWithAssigned]);

  const backButton = (
    <button
      className="teacher-header-back"
      type="button"
      onClick={() => navigate(routes.teacherHome)}
    >
      <ArrowLeft size={16} />
      <span>{trans("adaptiveLearning.content.back", "返回")}</span>
    </button>
  );

  if (!chapter || !content) {
    return (
      <TeacherShell
        hideGlobalHeader={true}
        title={curriculumText("unitAssessment", "单元测试")}
        leadingAction={backButton}
      >
        <section className="unit-assessment-missing" role="alert">
          <h2>{curriculumText("unitNotFound", "未找到这个单元")}</h2>
          <p>
            {curriculumText(
              "unitNotFoundDescription",
              "请返回教材目录，重新选择需要规划的章节。",
            )}
          </p>
        </section>
      </TeacherShell>
    );
  }

  const handleAssignQuestion = (slotId, question) => {
    if (viewingHistoricalVersion) return;
    setAssignedQuestions((prev) => ({
      ...prev,
      [slotId]: [...(prev[slotId] || []), question],
    }));
    setIsModified(true);
  };

  const handleRemoveQuestion = (questionId, slotId) => {
    if (viewingHistoricalVersion) return;
    setAssignedQuestions((prev) => ({
      ...prev,
      [slotId]: (prev[slotId] || []).filter((q) => q.id !== questionId),
    }));
    setIsModified(true);
  };

  const handlePublish = async () => {
    if (publishing || viewingHistoricalVersion) return;
    setPublishing(true);
    try {
      const nextVersionNumber =
        (latestPublishedVersion?.versionNumber || 1) + 1;
      const newVersion = {
        id: `v${nextVersionNumber}`,
        versionNumber: nextVersionNumber,
        publishedAt: new Date().toISOString(),
        assignedQuestions,
      };
      const updatedVersions = [newVersion, ...publishedVersions];
      const allContent = readTeacherContent();
      writeTeacherContent({
        ...allContent,
        [unitAssessmentKey]: {
          ...(allContent[unitAssessmentKey] || {}),
          id: unitAssessmentKey,
          chapterId: chapter.id,
          status: "published",
          publishedVersionNumber: nextVersionNumber,
          publishedVersions: updatedVersions,
          assignedQuestions,
          updatedAt: new Date().toISOString(),
        },
      });

      setPublishedVersions(updatedVersions);
      setSelectedPublishedVersionId(newVersion.id);
      setIsModified(false);
      setNotice({
        type: "success",
        message: `单元测试内容已成功发布 V${nextVersionNumber} 版本！`,
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleStartUnitAssessmentPreview = () => {
    const returnPath = `/adaptive-learning/teacher/curriculum/${encodeURIComponent(chapter.id)}/unit-assessment`;
    const allKps =
      chapter.knowledgePoints ||
      (chapter.sections || []).flatMap((s) => s.knowledgePoints || []);
    const questions = questionSlotsWithAssigned.flatMap(
      (slot) => slot.questions || [],
    );
    const session = {
      ...createEmptyLearningSession(),
      selection: {
        chapter: {
          id: chapter.id,
          title: chapter.title,
        },
        section: {
          id: `unit-assessment-${chapter.id}`,
          isUnitAssessment: true,
          chapterId: chapter.id,
          title: `${chapter.title} · 单元测试`,
          index: "单元测试",
          knowledgePoints: allKps,
        },
        knowledgePoints: allKps,
        studentSessionId: `teacher-preview:unit-assessment:${chapter.id}:${Date.now()}`,
        studentId: `teacher-preview:${chapter.id}`,
        studentName: "教师试做用户",
        startedAt: new Date().toISOString(),
        sessionType: "teacher_preview",
        teacherPreview: {
          returnPath,
          chapterId: chapter.id,
        },
      },
      preQuestions:
        questions.length > 0
          ? questions
          : content?.assessment?.questionSlots?.flatMap(
              (s) => s.questions || [],
            ) || [],
      postQuestions:
        questions.length > 0
          ? questions
          : content?.assessment?.questionSlots?.flatMap(
              (s) => s.questions || [],
            ) || [],
      publishedContent: {
        assessmentMatrices: content?.assessment?.matrix
          ? [content.assessment.matrix]
          : [],
        learningContent: null,
        knowledgePracticePools: [],
        compositeReviewPool: [],
      },
    };
    startTransientSession(session);
    navigate("/adaptive-learning/session/pre-assessment");
  };

  const publishStatusLabel = isModified
    ? "有未发布修改"
    : viewingHistoricalVersion
      ? `已发布 V${selectedPublishedVersion?.versionNumber}`
      : `已发布 V${latestPublishedVersion?.versionNumber || 1}`;
  const publishStatusTone = isModified ? "draft" : "published";

  return (
    <TeacherShell
      hideGlobalHeader={true}
      title={`${chapter.title} · ${curriculumText("unitAssessment", "单元测试")}`}
      leadingAction={backButton}
      actions={
        <>
          {publishedVersions.length > 0 && (
            <label className="teacher-version-switch">
              <History size={15} aria-hidden="true" />
              <span>{trans("adaptiveLearning.content.version", "版本")}</span>
              <select
                aria-label={trans(
                  "adaptiveLearning.content.switchVersion",
                  "切换已发布版本",
                )}
                value={selectedPublishedVersionId}
                onChange={(event) =>
                  setSelectedPublishedVersionId(event.target.value)
                }
              >
                {publishedVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.id === latestPublishedVersion?.id
                      ? `V${version.versionNumber} (最新发布)`
                      : `V${version.versionNumber} (历史版本)`}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            className="teacher-secondary teacher-preview-button"
            type="button"
            onClick={handleStartUnitAssessmentPreview}
            title={trans("adaptiveLearning.content.preview", "试做")}
          >
            <Play size={15} aria-hidden="true" />
            <span>{trans("adaptiveLearning.content.preview", "试做")}</span>
          </button>

          <span className={`teacher-header-publish-status ${publishStatusTone}`}>
            {publishStatusLabel}
          </span>

          {(isModified || !publishedVersions.length) && (
            <button
              className="teacher-primary"
              type="button"
              aria-busy={publishing}
              onClick={handlePublish}
              disabled={publishing || viewingHistoricalVersion}
            >
              {publishing ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Check size={16} />
              )}
              <span>{publishing ? "发布中…" : "发布"}</span>
            </button>
          )}
        </>
      }
    >
      {viewingHistoricalVersion && (
        <div className="teacher-version-readonly" role="status">
          <History size={18} aria-hidden="true" />
          <div>
            <strong>
              正在查看 V{selectedPublishedVersion.versionNumber} 历史版本
            </strong>
            <span>
              该版本只读；切回 V{latestPublishedVersion.versionNumber} 可继续编辑。
            </span>
          </div>
        </div>
      )}

      {notice && (
        <div className="teacher-notice success" role="status">
          {typeof notice === "object" ? notice.message : notice}
        </div>
      )}

      <div className="unit-assessment-page">
        <div
          className="teacher-section-nav"
          role="tablist"
          aria-label={trans(
            "adaptiveLearning.content.sectionNavigation",
            "内容板块导航",
          )}
        >
          <button
            type="button"
            role="tab"
            id="section-tab-matrix"
            aria-selected={activeSectionTab === "matrix"}
            className={`teacher-section-tab-btn${activeSectionTab === "matrix" ? " active" : ""}`}
            onClick={() => setActiveSectionTab("matrix")}
          >
            <Grid3X3 size={15} />
            <span>
              {trans("adaptiveLearning.assessment.matrixTitle", "评估矩阵")}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            id="section-tab-questions"
            aria-selected={activeSectionTab === "questions"}
            className={`teacher-section-tab-btn${activeSectionTab === "questions" ? " active" : ""}`}
            onClick={() => setActiveSectionTab("questions")}
          >
            <ListChecks size={15} />
            <span>
              {trans("adaptiveLearning.content.testQuestions", "测试题目")}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            id="section-tab-coverage"
            aria-selected={activeSectionTab === "coverage"}
            className={`teacher-section-tab-btn${activeSectionTab === "coverage" ? " active" : ""}`}
            onClick={() => setActiveSectionTab("coverage")}
          >
            <ListFilter size={15} />
            <span>
              {trans(
                "adaptiveLearning.assessment.queryKnowledgeCoverage",
                "知识点覆盖",
              )}
            </span>
          </button>
        </div>

        <div className="unit-assessment-tab-content">
          {activeSectionTab === "matrix" && (
            <KnowledgeAssessmentMatrix
              assessment={content.assessment}
              selectedCellId={selectedCellId}
              onGenerateMatrix={() => {
                if (!viewingHistoricalVersion) {
                  setVariant((v) => v + 1);
                  setIsModified(true);
                }
              }}
              generationDisabled={viewingHistoricalVersion}
            />
          )}

          {activeSectionTab === "questions" && (
            <section className="unit-assessment-slot-workspace">
              <AssessmentSlotsSection
                hasMatrix={content.assessment.hasMatrix}
                questionSlots={questionSlotsWithAssigned}
                knowledgePoints={content.knowledgePoints}
                slotGeneration={content.assessment.slotGeneration}
                unassignedQuestions={content.assessment.unassignedQuestions}
                generationDisabled={viewingHistoricalVersion}
                countEmptySlotsAsPlanned={true}
                onSelectQuestion={(slotId, questionType) => {
                  if (!viewingHistoricalVersion) {
                    setPickerState({ open: true, slotId, questionType });
                  }
                }}
                onCreateQuestion={(slotId) => {
                  if (viewingHistoricalVersion) return;
                  const slot =
                    questionSlotsWithAssigned.find((s) => s.id === slotId) ||
                    content?.assessment?.questionSlots?.find(
                      (s) => s.id === slotId,
                    );
                  setCreateModalState({ open: true, slot });
                }}
                onRemoveQuestion={handleRemoveQuestion}
                onOpenMatrixCell={(cellId) => {
                  setSelectedCellId(cellId);
                  setActiveSectionTab("matrix");
                }}
              />
            </section>
          )}

          {activeSectionTab === "coverage" && (
            <AssessmentKnowledgeCoverageQuery rows={coverageRows} />
          )}
        </div>

        {pickerState.open && (
          <AssessmentQuestionPickerModal
            open={true}
            initialSource="question_bank"
            preferredQuestionType={pickerState.questionType}
            questionSourceScope={{
              subject: "math",
              grade: "grade7-up",
              volume: "up",
            }}
            existingSourceKeys={[]}
            onClose={() =>
              setPickerState({ open: false, slotId: null, questionType: "" })
            }
            onConfirm={(selectedQuestions) => {
              if (pickerState.slotId && selectedQuestions?.[0]) {
                const item = selectedQuestions[0];
                handleAssignQuestion(pickerState.slotId, {
                  id: item.snapshot?.id || item.key,
                  stem: item.snapshot?.stem || item.label,
                  type: item.snapshot?.type || pickerState.questionType,
                  options: item.snapshot?.options || [],
                  answer: item.snapshot?.answer || "",
                  analysis: item.snapshot?.analysis || "",
                  source: "question_bank",
                });
              }
              setPickerState({ open: false, slotId: null, questionType: "" });
            }}
          />
        )}

        {createModalState.open && (
          <AssessmentQuestionCreateModal
            open={true}
            slot={createModalState.slot}
            knowledgePoints={content.knowledgePoints}
            onClose={() => setCreateModalState({ open: false, slot: null })}
            onConfirm={(newQuestion) => {
              if (createModalState.slot?.id) {
                handleAssignQuestion(createModalState.slot.id, newQuestion);
              }
              setCreateModalState({ open: false, slot: null });
            }}
          />
        )}
      </div>
    </TeacherShell>
  );
}
