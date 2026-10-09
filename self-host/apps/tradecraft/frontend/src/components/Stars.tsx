"use client";

import { Star } from "lucide-react";

/**
 * A process grade of 1 to 5 stars as a group of five radio options: arrow keys move between them, each reads as
 * "n of 5" to a screen reader. Pressing the chosen star again clears the grade.
 */
export function Stars({ label, value, onChange, name }: { label: string; value: number | null; onChange: (v: number | null) => void; name: string }) {
  return (
    <fieldset className="stars" aria-label={`${label} grade`}>
      <legend className="stars-label">{label}</legend>
      <div className="stars-row">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="star" onClick={() => value === n && onChange(null)}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} aria-label={`${n} of 5`} />
            <Star size={24} strokeWidth={1.75} aria-hidden="true" className={value !== null && n <= value ? "star-on" : "star-off"} fill={value !== null && n <= value ? "currentColor" : "none"} />
          </label>
        ))}
      </div>
      <span className="helper stars-value">{value === null ? "Not graded" : `${value} of 5`}</span>
    </fieldset>
  );
}
