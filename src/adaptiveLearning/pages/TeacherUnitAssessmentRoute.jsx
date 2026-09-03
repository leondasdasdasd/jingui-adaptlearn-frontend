import React, { useMemo, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";

import TeacherShell from "../components/TeacherShell";
import { routes } from "../routes/routePaths";
import { useLocation, useNavigate, useParams } from "../routing";
import { resolveUnitAssessmentChapter } from "../teacher/application/resolveUnitAssessmentChapter";
import AssessmentSlotsSection from "../teacher/components/AssessmentSlotsSection";
import { buildUnitAssessmentContent } from "../teacher/domain/unitAssessmentContent";
import { curriculumText } from "../teacher/presentation/curriculumPresentation";
import { projectUnitAssessmentContent } from "../teacher/presentation/unitAssessmentPresentation";

import "../unit-assessment.css";

/** 单元复用整课综合评估工作台，仅额外提供知识点覆盖查询。 */
export default function TeacherUnitAssessmentRoute() {
  const { chapterId, courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [variant, setVariant] = useState(0);
  const chapter = useMemo(
    () =>
      resolveUnitAssessmentChapter({
        courseId,
        chapterId,
        routedChapter: location.state?.chapter,
      }),
    [chapterId, courseId, location.state],
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
  const backButton = (
    <button
      className="unit-assessment-back"
      type="button"
      onClick={() => navigate(routes.teacherHome)}
    >
      <ArrowLeft size={16} />
      {curriculumText("backToCurriculum", "返回教材目录")}
    </button>
  );

  if (!chapter || !content) {
    return (
      <TeacherShell
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

  return (
    <TeacherShell
      title={`${chapter.title} · ${curriculumText("unitAssessment", "单元测试")}`}
      subtitle={curriculumText(
        "unitAssessmentPageSummary",
        "{$slotCount} 个混合知识点插槽，覆盖 {$knowledgeCount} 个知识点",
        {
          slotCount: content.plannedQuestionCount,
          knowledgeCount: content.knowledgePointCount,
        },
      )}
      leadingAction={backButton}
      actions={
        <button
          className="unit-assessment-replan"
          type="button"
          onClick={() => setVariant((value) => value + 1)}
        >
          <RefreshCw size={15} />
          {curriculumText("replanUnitSlots", "重新规划插槽")}
        </button>
      }
    >
      <div className="unit-assessment-page">
        <section className="unit-assessment-slot-workspace">
          <header>
            <span className="unit-assessment-plan-tag">
              {curriculumText("frontendPlan", "前端方案")}
            </span>
            <div>
              <h2>{curriculumText("unitAssessmentSlots", "单元测试插槽")}</h2>
              <p>
                {curriculumText(
                  "unitAssessmentSlotSummary",
                  "先生成单元认知矩阵，再按矩阵格、混合知识点、题型和难度形成插槽；真实生成等待后端接入。",
                )}
              </p>
            </div>
          </header>
          <AssessmentSlotsSection
            hasMatrix={content.assessment.hasMatrix}
            questionSlots={content.assessment.questionSlots}
            knowledgePoints={content.knowledgePoints}
            slotGeneration={content.assessment.slotGeneration}
            unassignedQuestions={content.assessment.unassignedQuestions}
            generationDisabled={true}
            countEmptySlotsAsPlanned={true}
          />
        </section>
      </div>
    </TeacherShell>
  );
}
