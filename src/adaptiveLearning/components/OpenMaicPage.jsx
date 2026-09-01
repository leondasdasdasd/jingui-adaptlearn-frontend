import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import AppShell from "./AppShell";
import StatePanel from "./StatePanel";

/**
 *
 * @param root0
 * @param root0.lesson
 * @param root0.runtimeUrl
 * @param root0.completeLabel
 * @param root0.actionLabel
 * @param root0.onComplete
 * @param root0.onRuntimeEvent
 * @param root0.runtimeCredentials
 */
export default function OpenMaicPage({
  lesson,
  runtimeUrl,
  completeLabel = "完成学习，开始练习",
  actionLabel = "开始练习",
  onComplete,
  onRuntimeEvent,
  runtimeCredentials,
}) {
  const frameRef = useRef(null);
  const completionHandledRef = useRef(false);
  const runtimeSettledRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onRuntimeEventRef = useRef(onRuntimeEvent);
  onCompleteRef.current = onComplete;
  onRuntimeEventRef.current = onRuntimeEvent;
  const [frameState, setFrameState] = useState("loading");
  const [frameError, setFrameError] = useState("");
  const [frameKey, setFrameKey] = useState(0);
  const studentRuntimeUrl = useMemo(() => {
    const url = new URL(runtimeUrl, window.location.href);
    url.searchParams.set("view", "student");
    url.searchParams.set("runtimeInstanceId", String(frameKey));
    if (runtimeCredentials?.sessionId && runtimeCredentials?.accessToken) {
      url.hash = new URLSearchParams({
        runtimeSessionId: runtimeCredentials.sessionId,
        runtimeAccessToken: runtimeCredentials.accessToken,
      }).toString();
    }
    return url.toString();
  }, [
    frameKey,
    runtimeCredentials?.accessToken,
    runtimeCredentials?.sessionId,
    runtimeUrl,
  ]);
  const completeOnce = useCallback(() => {
    if (completionHandledRef.current) return;
    completionHandledRef.current = true;
    onCompleteRef.current?.();
  }, []);

  useEffect(() => {
    completionHandledRef.current = false;
    runtimeSettledRef.current = false;
    setFrameState("loading");
    setFrameError("");
    const slowTimer = window.setTimeout(() => {
      if (!runtimeSettledRef.current) setFrameState("slow");
    }, 15_000);
    const errorTimer = window.setTimeout(() => {
      if (runtimeSettledRef.current) return;
      runtimeSettledRef.current = true;
      setFrameError("课堂在 30 秒内未准备完成，请重新加载");
      setFrameState("error");
      onRuntimeEventRef.current?.({
        type: "runtime_timeout",
        durationMs: 30_000,
      });
    }, 30_000);
    return () => {
      window.clearTimeout(slowTimer);
      window.clearTimeout(errorTimer);
    };
  }, [studentRuntimeUrl]);

  useEffect(() => {
    const runtimeOrigin = new URL(studentRuntimeUrl).origin;
    const receiveRuntimeEvent = (event) => {
      if (
        event.origin !== runtimeOrigin ||
        event.source !== frameRef.current?.contentWindow
      )
        return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      const type = String(data.type || data.event || "");
      if (
        ["runtime_loading", "runtime_ready", "runtime_error"].includes(type)
      ) {
        if (
          data.source !== "openmaic-classroom" ||
          String(data.runtimeInstanceId) !== String(frameKey)
        )
          return;
        if (type === "runtime_loading") {
          runtimeSettledRef.current = false;
          setFrameState("loading");
          return;
        }
        const durationMs = Number.isFinite(Number(data.durationMs))
          ? Math.max(0, Number(data.durationMs))
          : null;
        if (type === "runtime_ready") {
          runtimeSettledRef.current = true;
          setFrameState("ready");
          setFrameError("");
          onRuntimeEventRef.current?.({
            type,
            durationMs,
            loadMode: String(data.loadMode || "unknown"),
          });
        } else {
          runtimeSettledRef.current = true;
          setFrameState("error");
          setFrameError(
            String(data.message || "课堂内容加载失败").slice(0, 160),
          );
          onRuntimeEventRef.current?.({
            type,
            durationMs,
            code: String(data.code || "CLASSROOM_LOAD_FAILED"),
          });
        }
        return;
      }
      if (
        ![
          "scene_entered",
          "scene_completed",
          "progress_changed",
          "classroom_completed",
        ].includes(type)
      )
        return;
      onRuntimeEventRef.current?.({
        type,
        sceneId: String(data.sceneId || data.scene?.id || "").slice(0, 128),
        progress: Number.isFinite(Number(data.progress))
          ? Math.max(0, Math.min(100, Number(data.progress)))
          : null,
      });
      if (type === "classroom_completed") completeOnce();
    };
    window.addEventListener("message", receiveRuntimeEvent);
    return () => window.removeEventListener("message", receiveRuntimeEvent);
  }, [completeOnce, frameKey, studentRuntimeUrl]);

  return (
    <AppShell
      title={lesson.title}
      eyebrow="互动学习"
      immersive
      actions={
        <button
          className="primary-button header-practice-button"
          type="button"
          onClick={completeOnce}
          title={completeLabel}
        >
          {actionLabel}
        </button>
      }
    >
      <div className="real-openmaic-wrap">
        <div className="real-openmaic-frame-wrap">
          {frameState !== "ready" && (
            <div className="openmaic-frame-state">
              <StatePanel
                compact
                tone={frameState === "error" ? "error" : "loading"}
                title={
                  frameState === "slow"
                    ? "课堂加载时间较长"
                    : frameState === "error"
                      ? "课堂加载失败"
                      : "正在进入互动课堂"
                }
                description={
                  frameState === "slow"
                    ? "可以继续等待，或重新加载课堂"
                    : frameState === "error"
                      ? frameError
                      : undefined
                }
                action={
                  ["slow", "error"].includes(frameState) ? (
                    <button
                      className="neutral-button"
                      type="button"
                      onClick={() => setFrameKey((value) => value + 1)}
                    >
                      重新加载
                    </button>
                  ) : null
                }
              />
            </div>
          )}
          <iframe
            key={frameKey}
            ref={frameRef}
            className="openmaic-frame"
            src={studentRuntimeUrl}
            title={`互动课堂：${lesson.title}`}
            allow="microphone; camera; clipboard-write; fullscreen"
            onLoad={() =>
              onRuntimeEventRef.current?.({ type: "runtime_document_loaded" })
            }
            onError={() => {
              runtimeSettledRef.current = true;
              setFrameError("课堂页面无法打开，请重新加载");
              setFrameState("error");
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
