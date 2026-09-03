export const kp = (
  id,
  name,
  objective,
  type = "concept",
  summary = "",
  example = "",
) => ({
  id,
  name,
  objective,
  type,
  summary,
  example,
});
export const section = (
  id,
  index,
  title,
  knowledgePoints,
  estimatedMinutes = 22,
) => ({
  id,
  index,
  title,
  estimatedMinutes,
  knowledgePoints,
});
