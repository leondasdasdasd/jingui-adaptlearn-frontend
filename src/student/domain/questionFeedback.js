import { formatQuestionResult } from '../../shared/question-platform/gradingDisplay.js';

const retryQualities = new Set(['off_task', 'no_attempt', 'pending_review']);

export function isAiGraded(grading) {
  if (grading?.feedbackSource === 'ai' || grading?.aiGraded === true || String(grading?.gradingMethod || '').toLowerCase() === 'ai') return true;
  return String(grading?.gradedBy || '')
    .toLowerCase()
    .split(/[+:/_-]+/)
    .includes('doubao');
}

export function aiGeneratedCommentary(questionType, grading) {
  const normalizedType = String(questionType || '').trim().toLowerCase().replaceAll('-', '_');
  if (normalizedType !== 'short_answer' || grading?.feedbackSource !== 'ai') return '';
  return String(grading?.aiCommentary || '').trim();
}

export function aiGeneratedErrorReason(questionType, grading) {
  const normalizedType = String(questionType || '').trim().toLowerCase().replaceAll('-', '_');
  if (normalizedType !== 'short_answer' || grading?.feedbackSource !== 'ai') return '';
  if (grading?.correct === true || retryQualities.has(grading?.answerQuality)) return '';
  const score = Number(grading?.score);
  const maxScore = Number(grading?.maxScore);
  if (Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0 && score >= maxScore) return '';
  return String(grading?.errorReason || '').trim();
}

export function aiGeneratedImprovement(questionType, grading) {
  const normalizedType = String(questionType || '').trim().toLowerCase().replaceAll('-', '_');
  if (normalizedType !== 'short_answer' || grading?.feedbackSource !== 'ai') return '';
  if (grading?.correct === true || retryQualities.has(grading?.answerQuality)) return '';
  const score = Number(grading?.score);
  const maxScore = Number(grading?.maxScore);
  if (Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0 && score >= maxScore) return '';
  const errorReason = String(grading?.errorReason || '').replace(/\s+/g, ' ').trim();
  const reasonCore = errorReason.replace(/[。！？!?]+$/, '');
  const withoutRepeatedReason = (value) => {
    let text = String(value || '').replace(/\s+/g, ' ').trim();
    if (errorReason) text = text.replace(errorReason, '');
    if (reasonCore) text = text.replace(reasonCore, '');
    return text.replace(/^[，,。；;：:\s]+/, '').trim();
  };
  const suggestions = (Array.isArray(grading?.improvements) ? grading.improvements : [])
    .map(withoutRepeatedReason)
    .filter(Boolean);
  if (suggestions.length) return [...new Set(suggestions)].slice(0, 2).join('；');
  return withoutRepeatedReason(grading?.aiCommentary);
}

function achievedPoints(grading) {
  const rubricPoints = (grading?.rubricResults || [])
    .filter((item) => Number(item.earned || 0) > 0)
    .map((item) => String(item.point || '').trim())
    .filter(Boolean);
  const redundantPoints = new Set(['结论正确', '回答正确']);
  return [...new Set([...(grading?.strengths || []), ...rubricPoints]
    .map(String)
    .map((point) => point.trim())
    .filter((point) => point && !redundantPoints.has(point)))]
    .slice(0, 2);
}

function recognizedAnswer(grading) {
  if (!isAiGraded(grading)) return '';
  const answer = String(grading?.recognizedAnswer || '').trim();
  if (!answer || ['未识别到答案', '[图片作答]'].includes(answer)) return '';
  return answer;
}

export function requiresQuestionRetry(grading) {
  return retryQualities.has(grading?.answerQuality);
}

export function buildQuestionFeedback({
  grading,
  questionType = '',
  diagnostic = false,
  needsIntervention = false,
  adaptiveOutcome = null,
}) {
  if (!grading) return null;
  if (diagnostic && (grading.skipped || grading.disposition === 'SKIPPED_DONT_KNOW')) {
    return {
      state: 'recorded', title: '已记录为不会做', scoreText: '',
      achieved: [], errorReason: '', improvement: '', aiComment: '',
      learningGain: '本题已跳过', adaptiveCue: null,
    };
  }
  if (diagnostic && !requiresQuestionRetry(grading)) {
    return {
      state: 'recorded', title: '已记录', scoreText: '',
      achieved: [], errorReason: '', improvement: '', aiComment: '',
      learningGain: `本题已提交`, adaptiveCue: null,
    };
  }
  if (grading.answerQuality === 'off_task') {
    const recognized = recognizedAnswer(grading);
    return {
      state: 'retry',
      title: recognized ? '已识别作答，但还不能用于判断' : '这次答案还不能用于判断',
      scoreText: '', achieved: [], recognizedAnswer: recognized,
      errorReason: '', improvement: '',
      aiComment: diagnostic ? '' : aiGeneratedCommentary(questionType, grading),
      learningGain: '', adaptiveCue: null,
    };
  }
  if (grading.answerQuality === 'no_attempt') {
    return {
      state: 'retry', title: '不会也可以从第一步开始', scoreText: '', achieved: [],
      errorReason: '', improvement: '',
      aiComment: diagnostic ? '' : aiGeneratedCommentary(questionType, grading), learningGain: '', adaptiveCue: null,
    };
  }
  if (grading.answerQuality === 'pending_review' || grading.evidenceEligible === false) {
    return {
      state: 'retry', title: '这次答案暂未完成判定', scoreText: '', achieved: [],
      errorReason: '', improvement: '', aiComment: '',
      learningGain: '', adaptiveCue: null,
    };
  }
  if (grading.correctionRequired) {
    if (!isAiGraded(grading)) {
      return {
        state: 'incorrect', title: '错误', scoreText: '',
        achieved: [], errorReason: '', improvement: '', aiComment: '', learningGain: '', adaptiveCue: null,
      };
    }
    return {
      state: 'correction', title: '先别到下一题，订正一下', scoreText: '', achieved: [],
      errorReason: diagnostic ? '' : aiGeneratedErrorReason(questionType, grading),
      improvement: diagnostic ? '' : aiGeneratedImprovement(questionType, grading),
      aiComment: diagnostic ? '' : aiGeneratedCommentary(questionType, grading),
      learningGain: '', adaptiveCue: null,
    };
  }

  const ratio = Number(grading.scoreRatio || 0);
  const state = grading.correct ? 'correct' : ratio > 0 ? 'partial' : 'incorrect';
  const aiGraded = isAiGraded(grading);
  const titles = {
    correct: '答对了，方法有效',
    partial: grading.answerQuality === 'incomplete' ? '再补一步就完整了' : '已经做对一部分',
    incorrect: grading.answerQuality === 'careless' ? '方法基本对，检查一个细节' : '这题还没通过',
  };
  let learningGain = state === 'correct' ? '方法已验证' : state === 'partial' ? '正确步骤已保留' : '完成一次有效尝试';
  const adaptiveTitle = String(adaptiveOutcome?.title || '').trim();
  const adaptiveDetail = String(adaptiveOutcome?.message || '').trim();
  let adaptiveCue = adaptiveTitle || adaptiveDetail
    ? { tone: 'progress', title: adaptiveTitle || '继续练习', detail: adaptiveDetail }
    : null;
  if (needsIntervention) {
    learningGain = '学习路径已调整';
    adaptiveCue = { tone: 'support', title: '先停一下，找出共同卡点', detail: '回顾后再用一道未见题验证。' };
  }

  return {
    state,
    title: aiGraded ? titles[state] : formatQuestionResult(ratio),
    scoreText: aiGraded ? formatQuestionResult(ratio) : '',
    achieved: aiGraded ? achievedPoints(grading) : [],
    errorReason: diagnostic || state === 'correct' ? '' : aiGeneratedErrorReason(questionType, grading),
    improvement: diagnostic || state === 'correct' ? '' : aiGeneratedImprovement(questionType, grading),
    aiComment: diagnostic ? '' : aiGeneratedCommentary(questionType, grading),
    learningGain,
    adaptiveCue,
  };
}
