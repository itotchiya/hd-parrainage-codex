import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageFiltersBarProps {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageFiltersBar({ children, actions, className }: PageFiltersBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-4 rounded-xl border border-dashed bg-gray-50/50 p-4 lg:flex-row lg:flex-wrap lg:items-center',
        className
      )}
    >
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:max-w-full">
        {children}
      </div>
      {actions ? (
        <div className="flex w-full items-center gap-2 sm:w-auto lg:ml-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
