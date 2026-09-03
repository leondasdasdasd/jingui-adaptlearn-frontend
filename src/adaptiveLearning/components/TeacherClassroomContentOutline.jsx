import React from "react";
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileQuestion,
  Layers3,
} from "lucide-react";

import { normalizePublishedContentPackage } from "../shared/domain/publishedLearningContent";

import "../classroom-content-visibility.css";

/**
 *
 * @param question
 * @param index
 */
function questionStem(question, index) {
  return question?.stem || question?.title || `第 ${index + 1} 题`;
}

/**
 *
 * @param root0
 * @param root0.title
 * @param root0.questions
 * @param root0.defaultOpen
 */
function QuestionList({ title, questions = [], defaultOpen = false }) {
  return (
    <details className="classroom-content-questions" open={defaultOpen}>
      <summary>
        <span>{title}</span>
        <b>{questions.length} 题</b>
      </summary>
      {questions.length > 0 ? (
        <ol>
          {questions.map((question, index) => (
            <li key={question.id || `${title}-${index}`}>
              {questionStem(question, index)}
            </li>
          ))}
        </ol>
      ) : (
        <p>尚未准备题目</p>
      )}
    </details>
  );
}

/**
 *
 * @param root0
 * @param root0.contentPackage
 * @param root0.title
 * @param root0.compact
 * @param root0.versionNumber
 */
export default function TeacherClassroomContentOutline({
  contentPackage,
  title = "本次课堂内容",
  compact = false,
  versionNumber,
}) {
  const content = normalizePublishedContentPackage(contentPackage || {});
  const objectiveById = Object.fromEntries(
    content.knowledgeObjectives.map((item) => [item.id, item]),
  );
  const knowledgeRuntimeById = Object.fromEntries(
    content.learningContent.knowledgePoints.map((item) => [
      item.knowledgeObjectiveId,
      item.openMaic,
    ]),
  );
  const composite = content.learningContent.composite;
  const sourceLessons =
    content.sourceLessons.length > 0
      ? content.sourceLessons
      : content.lesson?.title
        ? [{ title: content.lesson.title, versionNumber }]
        : [];

  return (
    <section
      className={`classroom-content-outline${compact ? " compact" : ""}`}
    >
      <header>
        <div>
          <Layers3 size={17} />
          <h3>{title}</h3>
        </div>
        <span>
          {sourceLessons.length || 1} 个课时 ·{" "}
          {content.knowledgeObjectives.length} 个知识点
        </span>
      </header>

      {sourceLessons.length > 0 && (
        <div className="classroom-content-sources">
          <strong>来源课时</strong>
          <div>
            {sourceLessons.map((lesson, index) => (
              <span
                key={
                  lesson.contentVersionId || lesson.textbookLessonId || index
                }
              >
                {lesson.order || index + 1}. {lesson.title}
                {lesson.versionNumber != null && (
                  <small>V{lesson.versionNumber}</small>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="classroom-content-mainline">
        <article>
          <span>
            <FileQuestion size={16} />
          </span>
          <div>
            <strong>课前测验</strong>
            <small>{content.diagnosticQuestionPool.length} 道题</small>
          </div>
          <CheckCircle2 size={16} />
        </article>
        <article>
          <span>
            <BookOpen size={16} />
          </span>
          <div>
            <strong>
              {sourceLessons.length > 1 ? "多课时综合讲解" : "课时讲解"}
            </strong>
            <small>
              覆盖全部 {content.knowledgeObjectives.length} 个知识点
            </small>
          </div>
          {composite.classroomUrl ? (
            <a href={composite.classroomUrl} target="_blank" rel="noreferrer">
              预览 <ExternalLink size={13} />
            </a>
          ) : (
            <b>未准备</b>
          )}
        </article>
      </div>

      <div className="classroom-content-knowledge">
        <strong>知识点学习与巩固</strong>
        <div>
          {content.knowledgeObjectives.map((objective, index) => {
            const runtime = knowledgeRuntimeById[objective.id];
            const practice = content.knowledgePracticePools[objective.id] || [];
            return (
              <article key={objective.id}>
                <span>{index + 1}</span>
                <div>
                  <strong>{objective.name}</strong>
                  <small>单点讲解 · {practice.length} 道巩固题</small>
                </div>
                {runtime?.classroomUrl ? (
                  <a
                    href={runtime.classroomUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`预览${objective.name}`}
                  >
                    预览
                  </a>
                ) : (
                  <b>未准备</b>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {!compact && (
        <div className="classroom-content-question-groups">
          <QuestionList
            title="课前测验题"
            questions={content.diagnosticQuestionPool}
            defaultOpen
          />
          {content.knowledgeObjectives.map((objective) => (
            <QuestionList
              key={objective.id}
              title={`${objectiveById[objective.id]?.name || objective.name}巩固题`}
              questions={content.knowledgePracticePools[objective.id] || []}
            />
          ))}
          <QuestionList
            title="课时巩固题"
            questions={content.compositeReviewPool}
            defaultOpen
          />
        </div>
      )}
      {compact && (
        <div className="classroom-content-review-total">
          <span>课时巩固</span>
          <strong>{content.compositeReviewPool.length} 题</strong>
        </div>
      )}
    </section>
  );
}
