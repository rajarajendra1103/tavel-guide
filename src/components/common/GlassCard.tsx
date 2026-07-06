import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  onClick,
  hoverEffect = true,
}) => {
  const baseStyle = 'glass-card rounded-2xl p-5 overflow-hidden transition-all duration-300';
  const hoverStyle = hoverEffect ? 'hover:scale-[1.02] active:scale-95 cursor-pointer' : '';
  const clickHandler = onClick ? { onClick } : {};

  return (
    <div
      className={`${baseStyle} ${hoverStyle} ${className}`}
      {...clickHandler}
    >
      {children}
    </div>
  );
};
