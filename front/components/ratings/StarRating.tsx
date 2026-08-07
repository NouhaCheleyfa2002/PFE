"use client";

import React from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

export function StarRating({
  rating,
  onRatingChange,
  readonly = false,
  size = "md",
  showValue = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState(0);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleClick = (value: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => {
        const isFilled = value <= (hoverRating || rating);
        return (
          <button
            key={value}
            type="button"
            onClick={() => handleClick(value)}
            onMouseEnter={() => !readonly && setHoverRating(value)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            disabled={readonly}
            className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-all`}
          >
            <Star
              className={`${sizeClasses[size]} ${
                isFilled
                  ? "fill-amber-500 text-amber-500"
                  : "text-gray-300"
              } transition-colors`}
            />
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-[#0d1b3e]">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
