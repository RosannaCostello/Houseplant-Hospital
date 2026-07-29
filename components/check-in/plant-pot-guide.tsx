/** Semi-transparent pot silhouette for photo framing — guide only, not baked into the image. */
export function PlantPotGuide({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Rim */}
      <ellipse cx="100" cy="28" rx="72" ry="14" stroke="white" strokeWidth="3" opacity="0.9" />
      <ellipse cx="100" cy="28" rx="58" ry="10" stroke="white" strokeWidth="2" opacity="0.55" />
      {/* Body */}
      <path
        d="M36 32 L48 138 Q100 152 152 138 L164 32"
        stroke="white"
        strokeWidth="3"
        strokeLinejoin="round"
        opacity="0.9"
      />
      {/* Base */}
      <path
        d="M56 138 Q100 148 144 138"
        stroke="white"
        strokeWidth="2.5"
        opacity="0.75"
      />
    </svg>
  );
}
