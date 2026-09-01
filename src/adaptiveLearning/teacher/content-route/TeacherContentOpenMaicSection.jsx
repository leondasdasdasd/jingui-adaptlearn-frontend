/* eslint-disable complexity, sonarjs/cognitive-complexity -- 单一预览面板完整呈现加载、失败、生成中和可用状态。 */
import React from "react";
import { ExternalLink, LoaderCircle, Settings2, Sparkles } from "lucide-react";
import PropTypes from "prop-types";

import { trans } from "../../../utils/i18n";
import StatePanel from "../../components/StatePanel";
import {
  openMaicPlaybackUrl,
  openMaicProfessionalUrl,
} from "../../shared/infrastructure/openMaicRuntimeAdapter.js";

/**
 *
 * @param root0
 * @param root0.scope
 * @param root0.title
 * @param root0.targetRuntime
 * @param root0.openMaicJob
 * @param root0.previewExpanded
 * @param root0.activeLearningScope
 * @param root0.previewRef
 * @param root0.previewFrameState
 * @param root0.contentMutationLocked
 * @param root0.generateOpenMaic
 * @param root0.previewFrameKey
 * @param root0.setPreviewFrameKey
 * @param root0.setPreviewFrameState
 */
export default function TeacherContentOpenMaicSection({
  scope,
  title,
  targetRuntime,
  openMaicJob,
  previewExpanded,
  activeLearningScope,
  previewRef,
  previewFrameState,
  contentMutationLocked,
  generateOpenMaic,
  previewFrameKey,
  setPreviewFrameKey,
  setPreviewFrameState,
}) {
  const isGenerating =
    openMaicJob?.scope === scope &&
    openMaicJob?.status &&
    !["failed", "succeeded"].includes(openMaicJob.status);
  const hasUrl = Boolean(targetRuntime?.classroomUrl);
  const playbackUrl = openMaicPlaybackUrl(targetRuntime?.classroomUrl);
  const professionalUrl = openMaicProfessionalUrl(targetRuntime?.classroomUrl);
  const isExpanded = previewExpanded && activeLearningScope === scope;

  return (
    <div className="openmaic-section-clean">
      <header className="openmaic-section-toolbar">
        <div className="openmaic-status-group">
          {hasUrl && (
            <span className="openmaic-confirm-status confirmed">
              {trans("adaptiveLearning.openMaic.ready", "已生成可用")}
            </span>
          )}
        </div>
        <div className="openmaic-action-btns">
          {hasUrl && (
            <>
              <a
                className="teacher-neutral"
                href={playbackUrl}
                target="_blank"
                rel="noreferrer"
              >
                {trans("adaptiveLearning.openMaic.studentView", "学生模式")} {" "}
                <ExternalLink size={14} />
              </a>
              <a
                className="teacher-neutral"
                href={professionalUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Settings2 size={14} /> {" "}
                {trans("adaptiveLearning.openMaic.proMode", "专业模式")}
              </a>
              <button
                className="teacher-neutral"
                type="button"
                disabled={contentMutationLocked}
                onClick={() => generateOpenMaic(scope)}
              >
                <Sparkles size={14} />
                {trans("adaptiveLearning.openMaic.regenerate", "重新生成")}
              </button>
            </>
          )}
          {!hasUrl && !isGenerating && (
            <button
              className="teacher-primary"
              type="button"
              disabled={contentMutationLocked}
              onClick={() => generateOpenMaic(scope)}
            >
              <Sparkles size={14} />
              {trans("adaptiveLearning.openMaic.generate", "生成学习课堂")}
            </button>
          )}
        </div>
      </header>

      <div className="openmaic-review-workspace" style={{ padding: 0 }}>
        <section
          className={`openmaic-review-preview${isExpanded ? " expanded" : ""}`}
          ref={isExpanded ? previewRef : undefined}
          aria-busy={hasUrl && previewFrameState !== "ready"}
        >
          {hasUrl ? (
            <>
              <div className="openmaic-mobile-preview-note">
                <StatePanel
                  compact
                  title={trans(
                    "adaptiveLearning.openMaic.desktopPreviewTitle",
                    "请在桌面端预览学习课堂",
                  )}
                  description={trans(
                    "adaptiveLearning.openMaic.desktopPreviewDescription",
                    "学习课堂画布需要更宽的屏幕，当前可在新窗口打开。",
                  )}
                  action={
                    <a
                      className="teacher-neutral"
                      href={playbackUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {trans(
                        "adaptiveLearning.openMaic.studentView",
                        "学生模式",
                      )}{" "}
                      <ExternalLink size={14} />
                    </a>
                  }
                />
              </div>
              <div
                className="openmaic-review-frame-wrap"
                style={{ minHeight: isExpanded ? "100%" : "440px" }}
              >
                {previewFrameState !== "ready" && (
                  <div className="openmaic-review-frame-state">
                    <StatePanel
                      compact
                      tone={previewFrameState === "error" ? "error" : "loading"}
                      title={
                        previewFrameState === "slow"
                          ? trans(
                              "adaptiveLearning.openMaic.previewSlow",
                              "预览加载时间较长",
                            )
                          : previewFrameState === "error"
                            ? trans(
                                "adaptiveLearning.openMaic.previewFailed",
                                "预览加载失败",
                              )
                            : trans(
                                "adaptiveLearning.openMaic.previewLoading",
                                "正在加载学习课堂",
                              )
                      }
                      description={
                        previewFrameState === "slow"
                          ? trans(
                              "adaptiveLearning.openMaic.previewSlowDescription",
                              "可以继续等待、重新加载，或在新窗口打开",
                            )
                          : undefined
                      }
                      action={
                        ["slow", "error"].includes(previewFrameState) ? (
                          <button
                            className="teacher-neutral"
                            type="button"
                            onClick={() =>
                              setPreviewFrameKey((value) => value + 1)
                            }
                          >
                            {trans(
                              "adaptiveLearning.openMaic.reload",
                              "重新加载",
                            )}
                          </button>
                        ) : null
                      }
                    />
                  </div>
                )}
                <iframe
                  key={`${scope}-${previewFrameKey}`}
                  title={trans(
                    "adaptiveLearning.openMaic.previewTitle",
                    "{$title} 预览",
                    { title },
                  )}
                  src={playbackUrl}
                  allow="fullscreen; autoplay; microphone"
                  onLoad={() => setPreviewFrameState("ready")}
                  onError={() => setPreviewFrameState("error")}
                />
              </div>
            </>
          ) : isGenerating ? (
            <div
              className="openmaic-generating"
              style={{ padding: "36px 20px" }}
            >
              <LoaderCircle className="spin" size={28} />
              <strong>
                {trans(
                  "adaptiveLearning.openMaic.generating",
                  "正在生成学习课堂",
                )}
              </strong>
              {(openMaicJob?.message || openMaicJob?.step) && (
                <p>{openMaicJob.message || openMaicJob.step}</p>
              )}
              <div>
                <span style={{ width: `${openMaicJob?.progress || 4}%` }} />
              </div>
              <small>
                {trans(
                  "adaptiveLearning.openMaic.generationProgress",
                  "{$progress}% · 生成完成前可以离开本页",
                  { progress: openMaicJob?.progress || 0 },
                )}
              </small>
            </div>
          ) : (
            <div className="openmaic-empty" style={{ padding: "36px 20px" }}>
              <Sparkles size={28} />
              <strong>
                {trans(
                  "adaptiveLearning.openMaic.emptyTitle",
                  "还没有可预览的学习课堂",
                )}
              </strong>
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                {trans(
                  "adaptiveLearning.openMaic.emptyDescription",
                  "点击按钮由 AI 基于本教学内容生成互动微课",
                )}
              </p>
              <button
                className="teacher-primary"
                type="button"
                disabled={contentMutationLocked}
                onClick={() => generateOpenMaic(scope)}
              >
                <Sparkles size={15} />
                {trans("adaptiveLearning.openMaic.generate", "生成学习课堂")}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

TeacherContentOpenMaicSection.propTypes = {
  scope: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  targetRuntime: PropTypes.shape({ classroomUrl: PropTypes.string }),
  openMaicJob: PropTypes.shape({
    scope: PropTypes.string,
    status: PropTypes.string,
    message: PropTypes.string,
    step: PropTypes.string,
    progress: PropTypes.number,
  }),
  previewExpanded: PropTypes.bool.isRequired,
  activeLearningScope: PropTypes.string.isRequired,
  previewRef: PropTypes.shape({ current: PropTypes.object }).isRequired,
  previewFrameState: PropTypes.string.isRequired,
  contentMutationLocked: PropTypes.bool.isRequired,
  generateOpenMaic: PropTypes.func.isRequired,
  previewFrameKey: PropTypes.number.isRequired,
  setPreviewFrameKey: PropTypes.func.isRequired,
  setPreviewFrameState: PropTypes.func.isRequired,
};
