/* eslint-disable complexity, sonarjs/cognitive-complexity -- 教师内容视图集中表达同一工作台的互斥页面状态。 */
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Grid3X3,
  History,
  ListChecks,
  LoaderCircle,
  Play,
  Sparkles,
} from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import { assignmentContextPropType } from "../../components/teacher-question-review/propTypes";
import TeacherQuestionAgent from "../../components/TeacherQuestionAgent";
import TeacherQuestionReview from "../../components/TeacherQuestionReview";
import TeacherShell from "../../components/TeacherShell";
import AssessmentQuestionPickerModal from "../components/AssessmentQuestionPickerModal";
import KnowledgeAssessmentMatrix from "../components/KnowledgeAssessmentMatrix";
import QuestionPoolRequirements from "../components/QuestionPoolRequirements";
import { assessmentQuestionSourceKey } from "../domain/assessmentSlotManagement";
import { assessmentQuestionCreationRequest } from "./assessmentQuestionCreationRequest";
import AssessmentScopeSlots from "./AssessmentScopeSlots";
import TeacherContentOpenMaicSection from "./TeacherContentOpenMaicSection";
import { noticeTone } from "./teacherContentRouteSupport";

const WHOLE_LESSON_I18N_KEY = "adaptiveLearning.content.wholeLesson";
const LEARNING_CONTENT_I18N_KEY = "adaptiveLearning.content.learningContent";
const TEST_QUESTIONS_I18N_KEY = "adaptiveLearning.content.testQuestions";

/**
 *
 * @param version
 * @param latestPublishedVersion
 */
function versionOptionLabel(version, latestPublishedVersion) {
  const currentReleaseLabel =
    version.id === latestPublishedVersion.id
      ? ` · ${trans("adaptiveLearning.content.currentRelease", "当前发布")}`
      : "";
  return `V${version.versionNumber}${currentReleaseLabel}`;
}

const knowledgePointType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
});
const questionType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  phase: PropTypes.string,
});
const versionType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  versionNumber: PropTypes.number.isRequired,
});
const contentType = PropTypes.shape({
  status: PropTypes.string.isRequired,
  version: PropTypes.number.isRequired,
  updatedAt: PropTypes.string,
  preQuestions: PropTypes.arrayOf(questionType).isRequired,
  postQuestions: PropTypes.arrayOf(questionType).isRequired,
  generationStatus: PropTypes.shape({
    runId: PropTypes.string,
    phase: PropTypes.string,
    updatedAt: PropTypes.string,
    completedAt: PropTypes.string,
  }),
});
const assessmentType = PropTypes.shape({
  scopeId: PropTypes.string.isRequired,
  matrix: PropTypes.object,
  hasMatrix: PropTypes.bool.isRequired,
  assignmentContext: assignmentContextPropType.isRequired,
  slots: PropTypes.arrayOf(PropTypes.object).isRequired,
  unassignedQuestions: PropTypes.arrayOf(PropTypes.object).isRequired,
  slotGeneration: PropTypes.shape({
    states: PropTypes.arrayOf(PropTypes.object).isRequired,
    isPlanning: PropTypes.bool.isRequired,
    isRunning: PropTypes.bool.isRequired,
    canRetry: PropTypes.bool.isRequired,
  }).isRequired,
  isBusy: PropTypes.bool.isRequired,
  isGeneratingMatrix: PropTypes.bool.isRequired,
});

/**
 *
 * @param root0
 * @param root0.model
 * @param root0.actions
 */
export default function TeacherContentView({ model, actions }) {
  const {
    activeSectionTab,
    backendGenerationRun,
    base,
    compositeAssessment,
    contentMutationLocked,
    currentKp,
    currentKpRuntime,
    hasLessonContent,
    isCompositeSelected,
    knowledgeAssessment,
    knowledgeQuestions,
    latestPublishedVersion,
    learningContent,
    lesson,
    lessonGeneration,
    lessonGenerationModules,
    lessonGenerationRunning,
    notice,
    openMaicView,
    publishActionLabel,
    publishStatus,
    publishing,
    questionSourceScope,
    reviewQuestions,
    selectedKpId,
    selectedPublishedVersion,
    startingPreview,
    sortedPublishedVersions,
    teacherAgent,
    teacherAgentGeneration,
    teacherAgentQuestions,
    viewingHistoricalVersion,
  } = model;
  const {
    closeTeacherAgent,
    executeTeacherAgentStep,
    generateKnowledgePointAssessmentMatrix,
    generateKnowledgePointQuestionPool,
    generateKnowledgePointQuestionSlots,
    generateQuestionSet,
    navigate,
    openTeacherAgent,
    planTeacherAgentInstruction,
    publish,
    setActiveSectionTab,
    setSelectedKpId,
    setSelectedPublishedVersionId,
    startTeacherPreview,
    stopKnowledgePointQuestionPool,
    assignAssessmentQuestion,
    removeAssessmentQuestion,
    importAssessmentQuestions,
    stopWholeLessonGeneration,
    updatePostQuestionGroup,
    validateTeacherAgentPlan,
  } = actions;
  const [questionPicker, setQuestionPicker] = useState({
    open: false,
    source: "question_bank",
    scopeId: "",
    slotId: "",
    questionType: "",
  });
  const [questionCreationRequest, setQuestionCreationRequest] = useState(null);
  const [matrixTarget, setMatrixTarget] = useState({ scopeId: "", cellId: "" });
  const sectionNavRef = useRef(null);
  useEffect(() => {
    const navigation = sectionNavRef.current;
    const activeTab = navigation?.querySelector('[aria-selected="true"]');
    if (!navigation || !activeTab) return;
    navigation.scrollLeft = Math.max(
      0,
      activeTab.offsetLeft -
        (navigation.clientWidth - activeTab.offsetWidth) / 2,
    );
  }, [activeSectionTab]);
  const openQuestionPicker = (source, scopeId, slotId, questionType) =>
    setQuestionPicker({ open: true, source, scopeId, slotId, questionType });
  const openQuestionCreator = (scopeId, slotId) => {
    const assessment =
      scopeId === "composite" ? compositeAssessment : knowledgeAssessment;
    const request = assessmentQuestionCreationRequest({
      scopeId,
      slotId,
      assessment,
      requestId: `${scopeId}:${slotId}:${Date.now()}`,
      opener: document.activeElement,
    });
    if (request) setQuestionCreationRequest(request);
  };
  const openMatrixCell = (scopeId, cellId) => {
    if (!cellId) return;
    setMatrixTarget({ scopeId, cellId });
    setActiveSectionTab("matrix");
  };
  return (
    <TeacherShell
      title={lesson.title}
      currentLessonId={lesson.id}
      hideGlobalHeader={true}
      leadingAction={
        <button
          className="teacher-header-back"
          type="button"
          onClick={() =>
            navigate("/adaptive-learning/teacher/textbook-lessons")
          }
        >
          <ArrowLeft size={16} />
          <span>{trans("adaptiveLearning.content.back", "返回")}</span>
        </button>
      }
      actions={
        <>
          {latestPublishedVersion && (
            <label className="teacher-version-switch">
              <History size={15} aria-hidden="true" />
              <span>{trans("adaptiveLearning.content.version", "版本")}</span>
              <select
                aria-label={trans(
                  "adaptiveLearning.content.switchVersion",
                  "切换已发布版本",
                )}
                value={selectedPublishedVersion?.id || ""}
                onChange={(event) =>
                  setSelectedPublishedVersionId(event.target.value)
                }
              >
                {sortedPublishedVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {versionOptionLabel(version, latestPublishedVersion)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            className="teacher-secondary teacher-preview-button"
            type="button"
            aria-busy={startingPreview}
            onClick={startTeacherPreview}
            disabled={!selectedPublishedVersion || startingPreview}
            title={
              selectedPublishedVersion
                ? trans(
                    "adaptiveLearning.content.previewSelectedVersion",
                    "试做当前选中的发布版本",
                  )
                : trans(
                    "adaptiveLearning.content.previewRequiresPublish",
                    "发布课时后可试做",
                  )
            }
          >
            {startingPreview ? (
              <LoaderCircle className="spin" size={16} aria-hidden="true" />
            ) : (
              <Play size={16} aria-hidden="true" />
            )}
            <span>
              {startingPreview
                ? trans("adaptiveLearning.content.previewStarting", "正在进入…")
                : trans("adaptiveLearning.content.preview", "试做")}
            </span>
          </button>
          <span className={`teacher-header-publish-status ${publishStatus[1]}`}>
            {publishStatus[0]}
          </span>
          {base.status !== "published" && hasLessonContent && (
            <button
              className="teacher-primary"
              type="button"
              aria-busy={publishing}
              onClick={() => {
                void publish();
              }}
              disabled={
                publishing || lessonGenerationRunning || contentMutationLocked
              }
            >
              {publishing ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Check size={16} />
              )}
              {publishActionLabel}
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
              {trans(
                "adaptiveLearning.content.historicalVersionTitle",
                "正在查看 V{$version} 历史版本",
                { version: selectedPublishedVersion.versionNumber },
              )}
            </strong>
            <span>
              {trans(
                "adaptiveLearning.content.historicalVersionDescription",
                "该版本只读；切回 V{$version} 后可继续编辑。",
                { version: latestPublishedVersion.versionNumber },
              )}
            </span>
          </div>
        </div>
      )}
      {notice && (
        <div
          className={`teacher-notice ${noticeTone(notice)}${typeof notice === "object" && notice.items ? " has-list" : ""}`}
          role={noticeTone(notice) === "error" ? "alert" : "status"}
        >
          {typeof notice === "object" && notice.items ? (
            <>
              <strong>{notice.title}</strong>
              <ul>
                {notice.items.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
            </>
          ) : typeof notice === "object" ? (
            notice.message
          ) : (
            notice
          )}
        </div>
      )}

      <div className="teacher-lesson-split-layout">
        {/* Left Sidebar: Knowledge Point & Comprehensive list */}
        <aside
          className="teacher-lesson-sidebar"
          aria-label={trans(
            "adaptiveLearning.content.knowledgeNavigationAria",
            "知识点与整课导航",
          )}
        >
          <div className="teacher-lesson-sidebar-header">
            <strong>
              {trans(
                "adaptiveLearning.content.knowledgeNavigation",
                "知识点导航",
              )}
            </strong>
            <span>
              {trans("adaptiveLearning.content.itemCount", "{$count} 项", {
                count: lesson.knowledgePoints.length + 1,
              })}
            </span>
          </div>
          <div
            className="teacher-lesson-sidebar-nav"
            role="tablist"
            aria-label={trans(
              "adaptiveLearning.content.knowledgeList",
              "知识点列表",
            )}
          >
            {lesson.knowledgePoints.map((kp, index) => {
              const isSelected = selectedKpId === kp.id;
              return (
                <button
                  key={kp.id}
                  type="button"
                  role="tab"
                  id={`kp-sidebar-tab-${kp.id}`}
                  aria-selected={isSelected}
                  className={`teacher-lesson-sidebar-btn${isSelected ? " active" : ""}`}
                  onClick={() => setSelectedKpId(kp.id)}
                >
                  <span className="teacher-lesson-sidebar-badge">
                    {index + 1}
                  </span>
                  <span
                    className="teacher-lesson-sidebar-label"
                    title={kp.name}
                  >
                    {kp.name}
                  </span>
                  {isSelected && (
                    <Check
                      size={15}
                      className="teacher-lesson-sidebar-check"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}

            {/* 整课综合 */}
            <button
              key="composite"
              type="button"
              role="tab"
              id="kp-sidebar-tab-composite"
              aria-selected={isCompositeSelected}
              className={`teacher-lesson-sidebar-btn${isCompositeSelected ? " active" : ""}`}
              onClick={() => setSelectedKpId("composite")}
            >
              <span className="teacher-lesson-sidebar-badge composite">
                {trans("adaptiveLearning.content.wholeLessonBadge", "全")}
              </span>
              <span
                className="teacher-lesson-sidebar-label"
                title={trans(WHOLE_LESSON_I18N_KEY, "整课综合")}
              >
                {trans(WHOLE_LESSON_I18N_KEY, "整课综合")}
              </span>
              {isCompositeSelected && (
                <Check
                  size={15}
                  className="teacher-lesson-sidebar-check"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </aside>

        {/* Right Main Pane: Content workspace */}
        <main className="teacher-lesson-main-pane">
          {/* 顶栏横排小导航：优先评估矩阵，其次学习内容，最后是测试题目 */}
          <div
            className="teacher-section-nav"
            ref={sectionNavRef}
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
              id="section-tab-content"
              aria-selected={activeSectionTab === "content"}
              className={`teacher-section-tab-btn${activeSectionTab === "content" ? " active" : ""}`}
              onClick={() => setActiveSectionTab("content")}
            >
              <BookOpen size={15} />
              <span>{trans(LEARNING_CONTENT_I18N_KEY, "学习内容")}</span>
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
              <span>{trans(TEST_QUESTIONS_I18N_KEY, "测试题目")}</span>
            </button>
          </div>

          {/* 知识点内容详情 */}
          {!isCompositeSelected && currentKp && (
            <>
              {/* ① 评估矩阵 */}
              {activeSectionTab === "matrix" && (
                <KnowledgeAssessmentMatrix
                  assessment={knowledgeAssessment}
                  selectedCellId={
                    matrixTarget.scopeId === selectedKpId
                      ? matrixTarget.cellId
                      : ""
                  }
                  onGenerateMatrix={generateKnowledgePointAssessmentMatrix}
                  generationDisabled={
                    contentMutationLocked ||
                    viewingHistoricalVersion ||
                    knowledgeAssessment.isBusy
                  }
                />
              )}

              {/* ② 学习内容 (OpenMAIC 微课) */}
              {activeSectionTab === "content" && (
                <TeacherContentOpenMaicSection
                  {...openMaicView}
                  scope={selectedKpId}
                  title={trans(LEARNING_CONTENT_I18N_KEY, "学习内容")}
                  targetRuntime={currentKpRuntime}
                />
              )}

              {/* ③ 测试题目（含题目插槽与题池列表） */}
              {activeSectionTab === "questions" && (
                <>
                  <QuestionPoolRequirements questions={knowledgeQuestions} />
                  <AssessmentScopeSlots
                    assessment={knowledgeAssessment}
                    scopeId={selectedKpId}
                    knowledgePoints={[currentKp]}
                    generationDisabled={
                      contentMutationLocked || viewingHistoricalVersion
                    }
                    generateQuestionPool={generateKnowledgePointQuestionPool}
                    generateQuestionSlots={generateKnowledgePointQuestionSlots}
                    stopQuestionPool={stopKnowledgePointQuestionPool}
                    assignQuestion={assignAssessmentQuestion}
                    removeQuestion={removeAssessmentQuestion}
                    openQuestionPicker={openQuestionPicker}
                    openQuestionCreator={openQuestionCreator}
                    openMatrixCell={openMatrixCell}
                  />

                  <TeacherQuestionReview
                    key={`single-practice-pool-${selectedKpId}`}
                    mode="practice"
                    initialScope={selectedKpId}
                    title={trans(TEST_QUESTIONS_I18N_KEY, "测试题目")}
                    hideKnowledgePointTabs={true}
                    questions={knowledgeQuestions}
                    knowledgePoints={lesson.knowledgePoints}
                    disabled={contentMutationLocked}
                    assignmentContext={knowledgeAssessment.assignmentContext}
                    creationRequest={
                      questionCreationRequest?.scopeId === selectedKpId
                        ? questionCreationRequest
                        : null
                    }
                    onCreationRequestHandled={() =>
                      setQuestionCreationRequest(null)
                    }
                    onChange={(questions) =>
                      updatePostQuestionGroup("knowledge", questions)
                    }
                  />
                </>
              )}
            </>
          )}

          {/* 整课综合详情 */}
          {isCompositeSelected && (
            <>
              {/* ① 整课综合评估矩阵 */}
              {activeSectionTab === "matrix" && (
                <KnowledgeAssessmentMatrix
                  assessment={compositeAssessment}
                  selectedCellId={
                    matrixTarget.scopeId === "composite"
                      ? matrixTarget.cellId
                      : ""
                  }
                  onGenerateMatrix={generateKnowledgePointAssessmentMatrix}
                  generationDisabled={
                    contentMutationLocked ||
                    viewingHistoricalVersion ||
                    compositeAssessment.isBusy
                  }
                />
              )}

              {/* ② 整课综合学习内容 */}
              {activeSectionTab === "content" && (
                <TeacherContentOpenMaicSection
                  {...openMaicView}
                  scope="composite"
                  title={trans(LEARNING_CONTENT_I18N_KEY, "学习内容")}
                  targetRuntime={learningContent.composite}
                />
              )}

              {/* ③ 整课综合测试题目（含题目插槽与综合题池） */}
              {activeSectionTab === "questions" && (
                <>
                  <AssessmentScopeSlots
                    assessment={compositeAssessment}
                    scopeId="composite"
                    knowledgePoints={lesson.knowledgePoints}
                    generationDisabled={
                      contentMutationLocked || viewingHistoricalVersion
                    }
                    generateQuestionPool={generateKnowledgePointQuestionPool}
                    generateQuestionSlots={generateKnowledgePointQuestionSlots}
                    stopQuestionPool={stopKnowledgePointQuestionPool}
                    assignQuestion={assignAssessmentQuestion}
                    removeQuestion={removeAssessmentQuestion}
                    openQuestionPicker={openQuestionPicker}
                    openQuestionCreator={openQuestionCreator}
                    openMatrixCell={openMatrixCell}
                  />

                  <TeacherQuestionReview
                    key="composite-review-pool"
                    mode="practice"
                    initialScope="review"
                    title={trans(TEST_QUESTIONS_I18N_KEY, "测试题目")}
                    hideKnowledgePointTabs={true}
                    headerActions={
                      <button
                        className="teacher-primary"
                        type="button"
                        disabled={contentMutationLocked}
                        onClick={() =>
                          generateQuestionSet("practice", "", "review")
                        }
                      >
                        <Sparkles size={14} />
                        {trans(
                          "adaptiveLearning.content.generateCompositeQuestions",
                          "一键生成综合题目",
                        )}
                      </button>
                    }
                    questions={reviewQuestions}
                    knowledgePoints={[
                      {
                        id: "composite",
                        name: trans(WHOLE_LESSON_I18N_KEY, "整课综合"),
                      },
                      ...lesson.knowledgePoints,
                    ]}
                    disabled={contentMutationLocked}
                    assignmentContext={compositeAssessment.assignmentContext}
                    creationRequest={
                      questionCreationRequest?.scopeId === "composite"
                        ? questionCreationRequest
                        : null
                    }
                    onCreationRequestHandled={() =>
                      setQuestionCreationRequest(null)
                    }
                    onChange={(questions) =>
                      updatePostQuestionGroup("review", questions)
                    }
                  />
                </>
              )}
            </>
          )}
        </main>
      </div>

      <AssessmentQuestionPickerModal
        open={questionPicker.open}
        initialSource={questionPicker.source}
        preferredQuestionType={questionPicker.questionType}
        questionSourceScope={questionSourceScope}
        existingSourceKeys={base.postQuestions.flatMap((question) =>
          assessmentQuestionSourceKey(question.source)
            ? [assessmentQuestionSourceKey(question.source)]
            : [],
        )}
        onClose={() =>
          setQuestionPicker((current) => ({ ...current, open: false }))
        }
        onConfirm={(selections) => {
          importAssessmentQuestions(
            questionPicker.scopeId,
            questionPicker.slotId,
            selections,
          );
          setQuestionPicker((current) => ({ ...current, open: false }));
        }}
      />

      {!viewingHistoricalVersion && (
        <TeacherQuestionAgent
          key={lesson.id}
          lessonId={lesson.id}
          scope={teacherAgent.scope}
          open={teacherAgent.open}
          onOpen={() => openTeacherAgent("whole")}
          onClose={closeTeacherAgent}
          onPlanInstruction={planTeacherAgentInstruction}
          onExecuteStep={executeTeacherAgentStep}
          onValidatePlan={validateTeacherAgentPlan}
          generating={teacherAgentGeneration.generating}
          generationStatus={teacherAgentGeneration.status}
          lessonModules={lessonGenerationModules}
          questions={teacherAgentQuestions}
          lessonTask={{
            ...lessonGeneration,
            runId:
              backendGenerationRun?.runId || base.generationStatus?.runId || "",
            backendStatus:
              backendGenerationRun?.status ||
              base.generationStatus?.phase ||
              "",
            updatedAt:
              backendGenerationRun?.updatedAt ||
              base.generationStatus?.updatedAt ||
              "",
            completedAt:
              backendGenerationRun?.completedAt ||
              base.generationStatus?.completedAt ||
              "",
          }}
          onCancelLesson={stopWholeLessonGeneration}
          lessonActionsDisabled={publishing}
        />
      )}
    </TeacherShell>
  );
}

TeacherContentView.propTypes = {
  model: PropTypes.shape({
    activeSectionTab: PropTypes.string.isRequired,
    backendGenerationRun: PropTypes.object,
    base: contentType.isRequired,
    compositeAssessment: assessmentType.isRequired,
    contentMutationLocked: PropTypes.bool.isRequired,
    currentKp: PropTypes.object,
    currentKpRuntime: PropTypes.object,
    hasLessonContent: PropTypes.bool.isRequired,
    isCompositeSelected: PropTypes.bool.isRequired,
    knowledgeAssessment: assessmentType.isRequired,
    knowledgeQuestions: PropTypes.arrayOf(questionType).isRequired,
    latestPublishedVersion: versionType,
    learningContent: PropTypes.object,
    lesson: PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      knowledgePoints: PropTypes.arrayOf(knowledgePointType).isRequired,
      course: PropTypes.shape({
        questionSourceScope: PropTypes.shape({
          subject: PropTypes.string,
          publisher: PropTypes.string,
          grade: PropTypes.string,
          volume: PropTypes.string,
        }),
      }),
    }).isRequired,
    lessonGeneration: PropTypes.object,
    lessonGenerationModules: PropTypes.arrayOf(PropTypes.object).isRequired,
    lessonGenerationRunning: PropTypes.bool.isRequired,
    notice: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        tone: PropTypes.string,
        title: PropTypes.string,
        message: PropTypes.string,
        items: PropTypes.arrayOf(PropTypes.string),
      }),
    ]),
    openMaicView: PropTypes.object,
    publishActionLabel: PropTypes.string.isRequired,
    publishStatus: PropTypes.arrayOf(PropTypes.string).isRequired,
    publishing: PropTypes.bool.isRequired,
    questionSourceScope: PropTypes.shape({
      subject: PropTypes.string,
      publisher: PropTypes.string,
      grade: PropTypes.string,
      volume: PropTypes.string,
    }).isRequired,
    reviewQuestions: PropTypes.arrayOf(questionType).isRequired,
    selectedKpId: PropTypes.string.isRequired,
    selectedPublishedVersion: versionType,
    startingPreview: PropTypes.bool.isRequired,
    sortedPublishedVersions: PropTypes.arrayOf(versionType).isRequired,
    teacherAgent: PropTypes.object,
    teacherAgentGeneration: PropTypes.shape({
      generating: PropTypes.bool.isRequired,
      status: PropTypes.object,
    }).isRequired,
    teacherAgentQuestions: PropTypes.arrayOf(questionType).isRequired,
    viewingHistoricalVersion: PropTypes.bool.isRequired,
  }).isRequired,
  actions: PropTypes.shape({
    closeTeacherAgent: PropTypes.func.isRequired,
    executeTeacherAgentStep: PropTypes.func.isRequired,
    generateKnowledgePointAssessmentMatrix: PropTypes.func.isRequired,
    generateKnowledgePointQuestionPool: PropTypes.func.isRequired,
    generateKnowledgePointQuestionSlots: PropTypes.func.isRequired,
    generateQuestionSet: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
    openTeacherAgent: PropTypes.func.isRequired,
    planTeacherAgentInstruction: PropTypes.func.isRequired,
    publish: PropTypes.func.isRequired,
    setActiveSectionTab: PropTypes.func.isRequired,
    setSelectedKpId: PropTypes.func.isRequired,
    setSelectedPublishedVersionId: PropTypes.func.isRequired,
    startTeacherPreview: PropTypes.func.isRequired,
    stopKnowledgePointQuestionPool: PropTypes.func.isRequired,
    assignAssessmentQuestion: PropTypes.func.isRequired,
    removeAssessmentQuestion: PropTypes.func.isRequired,
    importAssessmentQuestions: PropTypes.func.isRequired,
    stopWholeLessonGeneration: PropTypes.func.isRequired,
    updatePostQuestionGroup: PropTypes.func.isRequired,
    validateTeacherAgentPlan: PropTypes.func.isRequired,
  }).isRequired,
};
