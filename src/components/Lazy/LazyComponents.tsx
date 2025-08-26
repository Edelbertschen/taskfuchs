import { lazy } from 'react';

// Lazy load components that are not immediately needed
export const StatisticsView = lazy(() => import('../Statistics/StatisticsView').then(module => ({ default: module.StatisticsView })));
export const ArchiveView = lazy(() => import('../Archive/ArchiveView').then(module => ({ default: module.ArchiveView })));
export const SeriesView = lazy(() => import('../Series/SeriesView').then(module => ({ default: module.SeriesView })));
export const TagManager = lazy(() => import('../Tags/TagManager').then(module => ({ default: module.TagManager })));
export const Settings = lazy(() => import('../Layout/Settings').then(module => ({ default: module.Settings })));
export const PerformanceDashboard = lazy(() => import('../Common/PerformanceDashboard').then(module => ({ default: module.PerformanceDashboard }))); 