import PropTypes from "prop-types";

export const quizQuestionPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  stem: PropTypes.string,
  difficulty: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  answer: PropTypes.any,
  options: PropTypes.array,
  columns: PropTypes.array,
  items: PropTypes.array,
  maxScore: PropTypes.number,
});

export const quizKnowledgePointPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
});
