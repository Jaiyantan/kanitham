'use client';

import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowBorder?: 'emerald' | 'amber' | 'rose' | 'sky' | null;
}

export function Card({ children, className, glowBorder, ...props }: CardProps) {
  const borderHighlight = {
    emerald: 'border-emerald-600/50 shadow-sm shadow-emerald-950/40',
    amber: 'border-amber-600/50 shadow-sm shadow-amber-950/40',
    rose: 'border-rose-600/50 shadow-sm shadow-rose-950/40',
    sky: 'border-sky-600/50 shadow-sm shadow-sky-950/40',
  };

  return (
    <div
      className={clsx(
        'rounded-md bg-[#0c1220] border border-[#1a2333] transition-all',
        glowBorder ? borderHighlight[glowBorder] : '',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between px-4 py-3 border-b border-[#1a2333]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={clsx(
        'text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('p-4', className)} {...props}>
      {children}
    </div>
  );
}

