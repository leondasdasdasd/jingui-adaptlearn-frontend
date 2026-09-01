import React, { useEffect, useMemo, useState } from "react";

import AppShell from "../components/AppShell";
import QuizPage from "../components/QuizPage";
import StatePanel from "../components/StatePanel";
import { routes } from "../routes/routePaths";
import { useNavigate, useSearchParams } from "../routing";
import { course } from "../shared/domain/courseCatalog";
import { readLocalStudentIdentity } from "../student/data/learningHistoryRepository";
import { loadPublishedLessonContent } from "../student/data/publishedLessonRepository";

const DEFAULT_LESSON_ID = "section-1-1";

/**
 *
 * @param lessonId
 */
function catalogLesson(lessonId) {
  return course.chapters
    .flatMap((chapter) =>
      chapter.sections.map((section) => ({ chapter, section })),
    )
    .find((item) => item.section.id === lessonId);
}

/**
 *
 */
export default function SubjectiveAnswerAcceptanceRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lessonId = searchParams.get("lessonId") || DEFAULT_LESSON_ID;
  const requestedQuestionId = searchParams.get("questionId") || "";
  const lesson = useMemo(() => catalogLesson(lessonId), [lessonId]);
  const [state, setState] = useState({
    loading: true,
    error: "",
    published: null,
  });

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: "", published: null });
    loadPublishedLessonContent(lessonId)
      .then((published) => {
        if (!active) return;
        if (!published) {
          setState({
            loading: false,
            error: "这个课时还没有发布可验收的题目",
            published: null,
          });
          return;
        }
        setState({ loading: false, error: "", published });
      })
      .catch((error) => {
        if (active)
          setState({ loading: false, error: error.message, published: null });
      });
    return () => {
      active = false;
    };
  }, [lessonId]);

  const questions = [
    ...(state.published?.preQuestions || []),
    ...(state.published?.postQuestions || []),
  ];
  const question =
    questions.find((item) => item.id === requestedQuestionId) ||
    questions.find((item) => item.type === "short_answer");

  if (state.loading || state.error || !lesson || !question) {
    const title = state.loading
      ? "正在读取已发布问答题"
      : state.error || (lesson ? "当前发布版本没有问答题" : "未找到指定课时");
    return (
      <AppShell
        title="问答题验收"
        eyebrow="功能验收"
        onBack={() => navigate(routes.directory)}
        compact
      >
        <StatePanel
          tone={state.loading ? "loading" : "error"}
          title={title}
          description={
            state.loading
              ? "正在同步老师已发布的真实题目…"
              : "请检查课时发布状态后重试。"
          }
        />
      </AppShell>
    );
  }

  const objectiveById = Object.fromEntries(
    (state.published.knowledgeObjectives || []).map((item) => [item.id, item]),
  );
  const knowledgePoints = lesson.section.knowledgePoints.map((item) => ({
    ...item,
    ...objectiveById[item.id],
  }));

  return (
    <QuizPage
      draftId={`acceptance:subjective-answer:${state.published.versionId}:${question.id}`}
      mode="pre"
      lessonTitle={lesson.section.title}
      questions={[question]}
      knowledgePoints={knowledgePoints}
      studentScope={readLocalStudentIdentity()?.id || "subjective-acceptance"}
      onComplete={() => {}}
      onExit={() => navigate(routes.directory)}
    />
  );
}
