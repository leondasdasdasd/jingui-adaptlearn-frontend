/**
 *
 * @param session
 */
export function shouldRecordSessionHeartbeat(session = {}) {
  const selection = session.selection || {};
  return Boolean(
    selection.studentSessionId &&
    selection.classroomAccessToken &&
    session.resultSource !== "authoritative",
  );
}
