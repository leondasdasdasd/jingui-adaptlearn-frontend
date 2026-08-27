export function voiceInputEnvironment({
  isSecureContext = globalThis.isSecureContext,
  mediaDevices = globalThis.navigator?.mediaDevices,
  AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext,
} = {}) {
  if (!isSecureContext) {
    return {
      available: false,
      message: '当前地址无法使用麦克风，请通过 HTTPS 学生链接打开',
    };
  }
  if (!mediaDevices?.getUserMedia || !AudioContext) {
    return {
      available: false,
      message: '当前浏览器暂不支持录音，请使用最新版 Chrome 或 Safari',
    };
  }
  return { available: true, message: '' };
}

export function speechStreamUrl(location = globalThis.location) {
  const protocol = location?.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location?.host || ''}/api/speech/stream`;
}
