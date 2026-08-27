import { difficultyMeta, normalizeDifficulty } from '../lib/adaptiveDifficulty';
import { Star } from './Icons';

export default function DifficultyBadge({ difficulty, variant = 'tag' }) {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const meta = difficultyMeta[normalizedDifficulty] || difficultyMeta.D3;
  const level = Number(normalizedDifficulty.slice(1));
  if (variant === 'stars') {
    const filledStars = Math.min(5, Math.max(1, level));
    return (
      <span className="difficulty-stars" aria-label={`难度 ${filledStars} 颗星`} title={`${filledStars} 颗星`}>
        <span className="difficulty-stars-icons" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star className={star <= filledStars ? 'filled' : 'empty'} key={star} size={15} />
          ))}
        </span>
      </span>
    );
  }
  return <span className={`difficulty-badge ${meta.className}`}>难度 · {meta.label}</span>;
}
