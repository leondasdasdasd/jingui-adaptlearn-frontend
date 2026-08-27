const CHOICE_TYPES = new Set(['single_choice', 'multiple_choice']);

function serializedChoiceOptions(question) {
  return (question?.platformQuestion?.elements || [])
    .find((element) => element?.type === 'choice')
    ?.options || [];
}

export function choiceOptionText(option) {
  if (typeof option === 'string') return option;
  if (typeof option?.text === 'string') return option.text;
  if (typeof option?.content?.text === 'string') return option.content.text;
  if (Array.isArray(option?.cells)) {
    return option.cells.map((cell) => cell?.text || cell?.content?.text || '').join(' ');
  }
  return '';
}

function containsBlockMedia(option) {
  const serialized = JSON.stringify(option || '');
  return /<(?:img|svg|video|canvas|table)\b|"type"\s*:\s*"(?:image|table|video)"/i.test(serialized);
}

export function choiceDisplayLength(option) {
  if (containsBlockMedia(option)) return Number.POSITIVE_INFINITY;
  const text = choiceOptionText(option)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return [...text].reduce((width, character) => (
    width + ((character.codePointAt(0) || 0) > 0xff ? 2 : 1)
  ), 0);
}

export function questionChoiceOptions(question) {
  if (!CHOICE_TYPES.has(question?.type)) return [];
  if (Array.isArray(question.options) && question.options.length) return question.options;
  return serializedChoiceOptions(question);
}

export function choiceColumnCount(question) {
  const options = questionChoiceOptions(question);
  if (options.length < 2) return 1;

  const maximumLength = Math.max(...options.map(choiceDisplayLength));
  const preferredColumns = maximumLength <= 18
    ? 4
    : maximumLength <= 30
      ? 3
      : maximumLength <= 48
        ? 2
        : 1;
  const maximumColumns = Math.min(preferredColumns, options.length);
  for (let columns = maximumColumns; columns >= 2; columns -= 1) {
    if (options.length % columns === 0) return columns;
  }
  for (let columns = maximumColumns; columns >= 2; columns -= 1) {
    if (options.length % columns !== 1) return columns;
  }
  return maximumColumns;
}

export function choiceLayoutClassName(question) {
  if (!CHOICE_TYPES.has(question?.type)) return '';
  return `question-option-columns-${choiceColumnCount(question)}`;
}
