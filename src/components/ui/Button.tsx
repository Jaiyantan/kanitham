'use client';

import React from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-7 px-2.5 text-xs',
      md: 'h-8 px-3.5 text-xs font-medium',
      lg: 'h-10 px-4 text-sm font-medium',
      icon: 'h-8 w-8 p-0 flex items-center justify-center',
    };

    const variantClasses = {
      primary:
        'bg-sky-600 hover:bg-sky-500 text-white border border-sky-500/40 shadow-sm shadow-sky-950',
      secondary:
        'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700',
      outline:
        'bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700',
      danger:
        'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80',
      success:
        'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80',
      warning:
        'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/80',
      ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-100',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center gap-1.5 rounded font-sans transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none tracking-wide cursor-pointer',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
