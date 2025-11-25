import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Zap, RefreshCw, X, AlertTriangle, CheckCircle, TrendingUp, BarChart3, Lightbulb } from 'lucide-react';
import { useMemoryMonitor, generatePerformanceReport, PERFORMANCE_TIPS } from '../../utils/performance';

interface PerformanceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PerformanceDashboard({ isOpen, onClose }: PerformanceDashboardProps) {
  const memoryUsage = useMemoryMonitor();
  const [performanceReport, setPerformanceReport] = useState<any>(null);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Generate performance report
      const report = generatePerformanceReport();
      setPerformanceReport(report);
    }
  }, [isOpen]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPerformanceStatus = () => {
    if (memoryUsage < 50) return { status: 'good', color: 'text-green-500', icon: CheckCircle };
    if (memoryUsage < 100) return { status: 'warning', color: 'text-yellow-500', icon: AlertTriangle };
    return { status: 'critical', color: 'text-red-500', icon: AlertTriangle };
  };

  const performanceStatus = getPerformanceStatus();
  const StatusIcon = performanceStatus.icon;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Performance Dashboard</h2>
          </div>
            <button
              onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{memoryUsage.toFixed(1)} MB</p>
                </div>
                <StatusIcon className={`w-8 h-8 ${performanceStatus.color}`} />
                </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      performanceStatus.status === 'good' ? 'bg-green-500' :
                      performanceStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (memoryUsage / 200) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Performance Status</p>
                  <p className={`text-lg font-bold ${performanceStatus.color}`}>
                    {performanceStatus.status === 'good' ? 'Excellent' :
                     performanceStatus.status === 'warning' ? 'Good' : 'Needs Optimization'}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Browser</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {performanceReport?.userAgent?.includes('Chrome') ? 'Chrome' :
                     performanceReport?.userAgent?.includes('Firefox') ? 'Firefox' :
                     performanceReport?.userAgent?.includes('Safari') ? 'Safari' : 'Unknown'}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Performance Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance Tips</h3>
              </div>
              <button
                onClick={() => setShowTips(!showTips)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                {showTips ? 'Hide' : 'Show'} Tips
              </button>
            </div>
            
            {showTips && (
              <div className="space-y-2">
                {Object.entries(PERFORMANCE_TIPS).map(([key, tip]) => (
                  <div key={key} className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">{tip}</p>
                        </div>
                ))}
              </div>
            )}
          </div>

          {/* Performance Metrics */}
          {performanceReport && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Browser Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Navigation Type</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {performanceReport.navigation?.type === 0 ? 'Navigate' :
                     performanceReport.navigation?.type === 1 ? 'Reload' :
                     performanceReport.navigation?.type === 2 ? 'Back/Forward' : 'Unknown'}
                  </p>
              </div>
              <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Connection Type</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {(navigator as any).connection?.effectiveType || 'Unknown'}
                  </p>
                </div>
              </div>
                </div>
          )}

          {/* Optimization Recommendations */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Optimization Recommendations</h3>
            <div className="space-y-2">
              {performanceReport?.recommendations?.map((rec: string, index: number) => (
                <div key={index} className="flex items-start space-x-2">
                  <Zap className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                const report = generatePerformanceReport();
                setPerformanceReport(report);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 