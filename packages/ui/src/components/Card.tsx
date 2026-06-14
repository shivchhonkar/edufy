import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export default function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
}: CardProps) {
  const baseStyles = 'bg-white rounded-lg shadow';
  
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const classes = [
    baseStyles,
    paddings[padding],
    hover && 'hover:shadow-lg transition-shadow duration-200 cursor-pointer',
    className
  ].filter(Boolean).join(' ');
  
  return <div className={classes}>{children}</div>;
}

