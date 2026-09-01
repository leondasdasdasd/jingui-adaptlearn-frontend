import PropTypes from "prop-types";

export const questionPropType = PropTypes.shape({
  id: PropTypes.string,
  type: PropTypes.string,
  difficulty: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  stem: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.string, text: PropTypes.string }),
  ),
  answer: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
    PropTypes.array,
    PropTypes.object,
  ]),
  analysis: PropTypes.string,
  platformQuestion: PropTypes.object,
});

export const knowledgePointPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
});
