import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animate?: boolean;
}

// Base Skeleton component
export function Skeleton({ 
  className = '', 
  width, 
  height, 
  rounded = 'md',
  animate = true 
}: SkeletonProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  };

  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 ${roundedClasses[rounded]} ${animate ? 'animate-pulse' : ''} ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    />
  );
}

// TaskCard Skeleton - mimics the appearance of a task card
export function TaskCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 mt-0.5 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
          
          {/* Description preview */}
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
          
          {/* Tags and meta */}
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        </div>

        {/* Priority indicator */}
        <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      </div>
    </div>
  );
}

// TaskList Skeleton - multiple task cards
export function TaskListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Project Card Skeleton
export function ProjectCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
        
        <div className="flex-1">
          {/* Title */}
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
          {/* Subtitle */}
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-3" />
      
      {/* Stats */}
      <div className="flex gap-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      </div>
    </div>
  );
}

// Kanban Column Skeleton
export function KanbanColumnSkeleton() {
  return (
    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-4 min-w-[300px] animate-pulse">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
        <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-24" />
        <div className="h-5 w-6 bg-gray-300 dark:bg-gray-600 rounded-full ml-auto" />
      </div>
      
      {/* Task cards */}
      <div className="space-y-2">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    </div>
  );
}

// Statistics Widget Skeleton
export function StatsWidgetSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
      
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
    </div>
  );
}

// Full Page Loading Skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
        <div className="flex gap-2">
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
      
      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsWidgetSkeleton />
        <StatsWidgetSkeleton />
        <StatsWidgetSkeleton />
      </div>
      
      {/* Task List */}
      <div className="mt-8">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
        <TaskListSkeleton count={4} />
      </div>
    </div>
  );
}

// Inline Text Skeleton (for loading text)
export function TextSkeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  const widths = ['w-full', 'w-5/6', 'w-4/5', 'w-3/4', 'w-2/3'];
  
  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${widths[i % widths.length]}`} 
        />
      ))}
    </div>
  );
}

// Avatar/Profile Skeleton
export function AvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  };
  
  return (
    <div className={`${sizes[size]} rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse`} />
  );
}

// Export all components
export default {
  Skeleton,
  TaskCardSkeleton,
  TaskListSkeleton,
  ProjectCardSkeleton,
  KanbanColumnSkeleton,
  StatsWidgetSkeleton,
  PageLoadingSkeleton,
  TextSkeleton,
  AvatarSkeleton
};

