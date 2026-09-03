import React from "react";
import PropTypes from "prop-types";

import {
  difficultyBadgeClassName,
  difficultyBadgeTagText,
  difficultyStarCount,
  difficultyStarsCopy,
} from "../shared/presentation/difficultyPresentation";
import { Star } from "./Icons";

/**
 *
 * @param root0
 * @param root0.difficulty
 * @param root0.variant
 */
export default function DifficultyBadge({ difficulty, variant = "tag" }) {
  if (variant === "stars") {
    const filledStars = difficultyStarCount(difficulty);
    const starCopy = difficultyStarsCopy(filledStars);
    return (
      <span
        className="difficulty-stars"
        aria-label={starCopy.ariaLabel}
        title={starCopy.title}
      >
        <span className="difficulty-stars-icons" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              className={star <= filledStars ? "filled" : "empty"}
              key={star}
              size={15}
            />
          ))}
        </span>
      </span>
    );
  }
  return (
    <span
      className={`difficulty-badge ${difficultyBadgeClassName(difficulty)}`}
    >
      {difficultyBadgeTagText(difficulty)}
    </span>
  );
}

DifficultyBadge.propTypes = {
  difficulty: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    .isRequired,
  variant: PropTypes.oneOf(["stars", "tag"]),
};
