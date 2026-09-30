import React from 'react';

interface MealIconProps {
  className?: string;
  size?: number;
  withBackground?: boolean;
}

/**
 * MealIcon - Minimalist black apple silhouette on gray background (#CECFD2)
 * Designed to match the user's phone themed/monochrome icon style (fundo cinza, imagem preta)
 */
export const MealIcon: React.FC<MealIconProps> = ({
  className = 'w-6 h-6',
  size,
  withBackground = false,
}) => {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {withBackground && (
        <rect width="512" height="512" rx="115" fill="#CECFD2" />
      )}

      {/* Apple Silhouette in solid black */}
      <g fill="#000000">
        {/* Stem */}
        <path d="M 250 162 C 246 122, 266 90, 292 72 C 294 74, 296 78, 294 81 C 273 102, 262 128, 258 162 Z" />

        {/* Leaf */}
        <path d="M 270 148 C 282 102, 338 82, 378 95 C 374 138, 328 168, 270 148 Z" />

        {/* Apple Body */}
        <path
          d="M 256 174
             C 222 136, 130 140, 114 228
             C 98 304, 136 394, 214 422
             C 239 430, 248 422, 256 422
             C 264 422, 273 430, 298 422
             C 376 394, 414 304, 398 228
             C 382 140, 290 136, 256 174 Z"
        />
      </g>
    </svg>
  );
};

