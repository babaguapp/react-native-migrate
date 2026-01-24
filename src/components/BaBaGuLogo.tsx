interface BaBaGuLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-24 h-12',
  md: 'w-32 h-16',
  lg: 'w-40 h-20',
};

export function BaBaGuLogo({ className = '', size = 'md' }: BaBaGuLogoProps) {
  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
      <svg viewBox="0 0 180 90" className="w-full h-full">
        {/* Speech bubble */}
        <path
          d="M15 10 Q5 10 5 25 L5 55 Q5 70 15 70 L30 70 L35 82 L45 70 L165 70 Q175 70 175 55 L175 25 Q175 10 165 10 Z"
          fill="none"
          stroke="hsl(187, 85%, 53%)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Text */}
        <text
          x="90"
          y="52"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="32"
          fontWeight="700"
          fill="hsl(187, 85%, 53%)"
        >
          BaBaGu
        </text>
      </svg>
    </div>
  );
}
