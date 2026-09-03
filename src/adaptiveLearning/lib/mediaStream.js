/**
 * 录音初始化可能在获取 MediaStream 前失败，释放流程必须同时兼容空流。
 * @param {MediaStream | null | undefined} stream 待释放的浏览器媒体流。
 */
export function stopMediaStreamTracks(stream) {
  for (const track of stream?.getTracks?.() || []) track.stop();
}
