import React from 'react';

interface MarqueeProps {
  text: string;
  reverse?: boolean;
  className?: string;
  repeat?: number;
}

export default function Marquee({ text, reverse = false, className = "", repeat = 10 }: MarqueeProps) {
  return (
    <div className={`marquee-container w-full overflow-hidden ${className}`}>
      <div className={`marquee-content flex gap-8 items-center ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}>
        {Array.from({ length: repeat }).map((_, i) => (
          <span key={i} className="whitespace-nowrap flex items-center gap-8">
            {text}
          </span>
        ))}
      </div>
      {/* Duplicate for seamless loop */}
      <div aria-hidden="true" className={`marquee-content flex gap-8 items-center ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}>
        {Array.from({ length: repeat }).map((_, i) => (
          <span key={i} className="whitespace-nowrap flex items-center gap-8">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}