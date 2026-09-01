import React from "react";

import { normalizeDifficulty } from "../lib/adaptiveDifficulty";
import {
  difficultyBadgeClassName,
  difficultyBadgeTagText,
  difficultyStarsCopy,
} from "./difficulty-badge/presentation";
import { Star } from "./Icons";

/**
 *
 * @param root0
 * @param root0.difficulty
 * @param root0.variant
 */
export default function DifficultyBadge({ difficulty, variant = "tag" }) {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const level = Number(normalizedDifficulty.slice(1));
  if (variant === "stars") {
    const filledStars = Math.min(5, Math.max(1, level));
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
      className={`difficulty-badge ${difficultyBadgeClassName(normalizedDifficulty)}`}
    >
      {difficultyBadgeTagText(normalizedDifficulty)}
    </span>
  );
}
