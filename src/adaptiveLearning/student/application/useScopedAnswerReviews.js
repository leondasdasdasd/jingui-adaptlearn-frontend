import { useEffect, useMemo, useState } from "react";

import { loadAnswerReviews } from "../../lib/gradingApi";

const emptySnapshot = Object.freeze({ status: "idle", items: {} });

/**
 * 加载并隔离当前内容版本与学生会话的答案复核结果。
 * @param {object} input 请求上下文
 * @param {string} input.contentVersionId 内容版本
 * @param {string[]} input.questionIds 本轮题目 ID
 * @param {string} input.questionIdsSignature 题目集合稳定签名
 * @param {string} input.studentSessionId 学生会话
 * @param {string} input.accessToken 课堂访问凭证
 * @returns {{items: object, status: string}} 当前作用域复核快照
 */
export function useScopedAnswerReviews({
  contentVersionId,
  questionIds,
  questionIdsSignature,
  studentSessionId,
  accessToken,
}) {
  // 只保留请求代次对象；凭证参与失效判断，但不会进入任何状态或领域 shape。
  const requestIdentity = useMemo(
    () =>
      Object.freeze({
        ready: Boolean(accessToken && contentVersionId && studentSessionId),
      }),
    [accessToken, contentVersionId, studentSessionId],
  );
  const [snapshot, setSnapshot] = useState({
    requestIdentity: null,
    status: "idle",
    items: {},
  });

  useEffect(() => {
    if (
      !contentVersionId ||
      !studentSessionId ||
      !accessToken ||
      questionIds.length === 0
    ) {
      setSnapshot({ requestIdentity, status: "idle", items: {} });
      return;
    }
    let cancelled = false;
    setSnapshot({ requestIdentity, status: "loading", items: {} });
    loadAnswerReviews(contentVersionId, questionIds, {
      studentSessionId,
      accessToken,
    })
      .then((items) => {
        if (!cancelled)
          setSnapshot({ requestIdentity, status: "ready", items });
        return items;
      })
      .catch(() => {
        if (!cancelled)
          setSnapshot({ requestIdentity, status: "failed", items: {} });
      });
    return () => {
      cancelled = true;
    };
    // 题目数组由会话状态派生，只有稳定签名变化时才应重新请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    accessToken,
    contentVersionId,
    questionIdsSignature,
    requestIdentity,
    studentSessionId,
  ]);

  return snapshot.requestIdentity === requestIdentity ? snapshot : emptySnapshot;
}
