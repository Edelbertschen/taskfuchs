import React from 'react';

// Base shimmer animation class
const shimmerClass = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:400%_100%]';

// Individual skeleton elements
export function SkeletonText({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return <div className={`${shimmerClass} ${width} ${height} rounded`} />;
}

export function SkeletonCircle({ size = 'w-10 h-10' }: { size?: string }) {
  return <div className={`${shimmerClass} ${size} rounded-full`} />;
}

export function SkeletonButton({ width = 'w-24', height = 'h-9' }: { width?: string; height?: string }) {
  return <div className={`${shimmerClass} ${width} ${height} rounded-lg`} />;
}

// Task card skeleton
export function SkeletonTaskCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-sm">
      {/* Title */}
      <SkeletonText width="w-3/4" height="h-4" />
      
      {/* Tags/badges row */}
      <div className="flex gap-2">
        <SkeletonText width="w-16" height="h-5" />
        <SkeletonText width="w-12" height="h-5" />
      </div>
      
      {/* Bottom row with date/time */}
      <div className="flex justify-between items-center pt-1">
        <SkeletonText width="w-20" height="h-4" />
        <SkeletonCircle size="w-6 h-6" />
      </div>
    </div>
  );
}

// Column skeleton for Kanban/Planner views
export function SkeletonColumn({ taskCount = 3 }: { taskCount?: number }) {
  return (
    <div className="flex-shrink-0 w-72 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl p-3">
      {/* Column header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <SkeletonText width="w-24" height="h-5" />
        <SkeletonCircle size="w-6 h-6" />
      </div>
      
      {/* Tasks */}
      <div className="space-y-3">
        {Array.from({ length: taskCount }).map((_, i) => (
          <SkeletonTaskCard key={i} />
        ))}
      </div>
    </div>
  );
}

// Project sidebar skeleton
export function SkeletonProjectSidebar() {
  return (
    <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <SkeletonText width="w-20" height="h-6" />
        <SkeletonCircle size="w-8 h-8" />
      </div>
      
      {/* Project items */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
          <div className={`${shimmerClass} w-1.5 h-8 rounded-full`} />
          <SkeletonText width="w-32" height="h-4" />
        </div>
      ))}
    </div>
  );
}

// Full view skeletons
export function SkeletonPlanerView() {
  return (
    <div className="h-full flex flex-col">
      {/* Header area */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <SkeletonText width="w-40" height="h-8" />
          <div className="flex gap-2">
            <SkeletonButton width="w-28" />
            <SkeletonButton width="w-28" />
          </div>
        </div>
      </div>
      
      {/* Columns */}
      <div className="flex-1 p-4 overflow-x-auto">
        <div className="flex gap-4 h-full">
          <SkeletonColumn taskCount={4} />
          <SkeletonColumn taskCount={3} />
          <SkeletonColumn taskCount={5} />
          <SkeletonColumn taskCount={2} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonProjectView() {
  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <SkeletonProjectSidebar />
      
      {/* Main content */}
      <div className="flex-1 p-4 overflow-x-auto">
        <div className="flex gap-4 h-full">
          <SkeletonColumn taskCount={3} />
          <SkeletonColumn taskCount={4} />
          <SkeletonColumn taskCount={2} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonListView() {
  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonText width="w-48" height="h-8" />
        <div className="flex gap-2">
          <SkeletonButton />
          <SkeletonButton />
        </div>
      </div>
      
      {/* Group headers and tasks */}
      {Array.from({ length: 3 }).map((_, groupIdx) => (
        <div key={groupIdx} className="space-y-2">
          {/* Group header */}
          <div className="flex items-center gap-2 py-2">
            <SkeletonText width="w-32" height="h-5" />
            <SkeletonText width="w-8" height="h-5" />
          </div>
          
          {/* Task rows */}
          {Array.from({ length: 3 }).map((_, taskIdx) => (
            <div key={taskIdx} className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <SkeletonCircle size="w-5 h-5" />
              <SkeletonText width="w-1/2" height="h-4" />
              <div className="flex-1" />
              <SkeletonText width="w-20" height="h-4" />
              <SkeletonText width="w-16" height="h-4" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonPinsView() {
  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonCircle size="w-8 h-8" />
          <SkeletonText width="w-24" height="h-7" />
        </div>
        <SkeletonButton />
      </div>
      
      {/* Grid of pinned tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <SkeletonCircle size="w-5 h-5" />
              <SkeletonText width="w-3/4" height="h-5" />
            </div>
            <SkeletonText width="w-full" height="h-3" />
            <SkeletonText width="w-2/3" height="h-3" />
            <div className="flex gap-2 pt-2">
              <SkeletonText width="w-16" height="h-5" />
              <SkeletonText width="w-12" height="h-5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStatisticsView() {
  return (
    <div className="h-full flex flex-col p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonText width="w-40" height="h-8" />
        <SkeletonButton width="w-36" />
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <SkeletonText width="w-24" height="h-4" />
            <div className="mt-2">
              <SkeletonText width="w-16" height="h-8" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Chart placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <SkeletonText width="w-32" height="h-5" />
        <div className="mt-4 h-64 flex items-end justify-around gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div 
              key={i} 
              className={`${shimmerClass} w-12 rounded-t`} 
              style={{ height: `${30 + Math.random() * 70}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonSettingsView() {
  return (
    <div className="h-full flex flex-col p-4 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <SkeletonText width="w-48" height="h-8" />
      
      {/* Settings sections */}
      {Array.from({ length: 4 }).map((_, sectionIdx) => (
        <div key={sectionIdx} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <SkeletonText width="w-36" height="h-6" />
          
          {Array.from({ length: 3 }).map((_, itemIdx) => (
            <div key={itemIdx} className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <SkeletonText width="w-40" height="h-4" />
                <SkeletonText width="w-56" height="h-3" />
              </div>
              <SkeletonButton width="w-12" height="h-6" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Generic skeleton wrapper with fade-in
interface SkeletonWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function SkeletonWrapper({ children, className = '' }: SkeletonWrapperProps) {
  return (
    <div className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
}
