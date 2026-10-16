'use client';

import React from 'react';
import clsx from 'clsx';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'critical'
  | 'info'
  | 'outline'
  | 'muted';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  glow?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Badge({
  children,
  variant = 'default',
  glow = false,
  size = 'md',
  className,
  ...props
}: BadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] font-medium tracking-wide',
    md: 'px-2 py-0.5 text-xs font-medium tracking-wider',
    lg: 'px-2.5 py-1 text-xs font-semibold tracking-wider',
  };

  const variantClasses = {
    default: 'bg-slate-800 text-slate-200 border-slate-700',
    success: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80',
    warning: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    critical: 'bg-rose-950/80 text-rose-400 border-rose-800/80',
    info: 'bg-sky-950/80 text-sky-400 border-sky-800/80',
    outline: 'bg-transparent text-slate-300 border-slate-700',
    muted: 'bg-slate-900 text-slate-400 border-slate-800',
  };

  const glowClasses = {
    default: '',
    success: glow ? 'glow-emerald' : '',
    warning: glow ? 'glow-amber' : '',
    critical: glow ? 'glow-rose' : '',
    info: glow ? 'glow-cyan' : '',
    outline: '',
    muted: '',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded border uppercase transition-colors',
        sizeClasses[size],
        variantClasses[variant],
        glowClasses[variant],
        className
      )}
      {...props}
    >
      {glow && (
        <span
          className={clsx('h-1.5 w-1.5 rounded-full animate-pulse', {
            'bg-emerald-400': variant === 'success',
            'bg-amber-400': variant === 'warning',
            'bg-rose-500': variant === 'critical',
            'bg-sky-400': variant === 'info',
            'bg-slate-400': variant === 'default' || variant === 'outline',
          })}
        />
      )}
      {children}
    </span>
  );
}

