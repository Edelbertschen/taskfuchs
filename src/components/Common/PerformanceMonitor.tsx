import React, { useState, useEffect } from 'react';
import { usePerformanceMonitor, useMemoryMonitor, generatePerformanceReport } from '../../utils/performance';
import { Activity, Clock, HardDrive } from 'lucide-react';

interface PerformanceMonitorProps {
  componentName?: string;
  enabled?: boolean;
  showDetails?: boolean;
}

export function PerformanceMonitor({ 
  componentName = 'App', 
  enabled = process.env.NODE_ENV === 'development',
  showDetails = false 
}: PerformanceMonitorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(null);
  
  const metrics = usePerformanceMonitor(componentName);
  const memoryUsage = useMemoryMonitor();

  // 🚀 Performance: Only run in development
  if (!enabled) return null;

  const handleGenerateReport = () => {
    const report = generatePerformanceReport();
    setPerformanceData(report);
    console.log('📊 Performance Report:', report);
  };

  const getPerformanceStatus = () => {
    if (metrics.averageRenderTime > 16) return { color: 'text-red-500', status: 'Slow' };
    if (metrics.averageRenderTime > 10) return { color: 'text-yellow-500', status: 'Moderate' };
    return { color: 'text-green-500', status: 'Fast' };
  };

  const status = getPerformanceStatus();

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-white text-xs font-mono">
      <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setIsVisible(!isVisible)}>
        <Activity className="w-4 h-4" />
        <span>Performance</span>
        <span className={status.color}>({status.status})</span>
      </div>
      
      {isVisible && (
        <div className="mt-2 space-y-2 min-w-[200px]">
          {/* Render Performance */}
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Renders:</span>
            </span>
            <span>{metrics.renderCount}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Avg Time:</span>
            <span className={status.color}>{metrics.averageRenderTime.toFixed(2)}ms</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Last Time:</span>
            <span>{metrics.lastRenderTime.toFixed(2)}ms</span>
          </div>

          {/* Memory Usage */}
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <HardDrive className="w-3 h-3" />
              <span>Memory:</span>
            </span>
            <span>{memoryUsage.toFixed(1)}MB</span>
          </div>

          {showDetails && (
            <>
              <hr className="border-gray-600" />
              <div className="text-xs">
                <div>Component: {metrics.componentName}</div>
                <div>Slow Renders: {metrics.isSlowRender ? 'Yes' : 'No'}</div>
              </div>
              
              <button
                onClick={handleGenerateReport}
                className="w-full mt-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
              >
                Generate Report
              </button>
            </>
          )}
        </div>
      )}

      {/* Performance Recommendations */}
      {metrics.averageRenderTime > 16 && isVisible && (
        <div className="mt-2 p-2 bg-red-900/50 rounded text-xs">
          ⚠️ Slow renders detected!
          <div className="mt-1 text-xs opacity-75">
            Consider: React.memo, useCallback, useMemo
          </div>
        </div>
      )}
    </div>
  );
}

// 🚀 Performance: HOC for automatic monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return React.memo((props: P) => {
    const metrics = usePerformanceMonitor(componentName || Component.displayName || 'Component');
    
    useEffect(() => {
      if (metrics.isSlowRender && process.env.NODE_ENV === 'development') {
        console.warn(`🐌 Slow render in ${componentName}: ${metrics.lastRenderTime.toFixed(2)}ms`);
      }
    }, [metrics.isSlowRender, metrics.lastRenderTime, componentName]);

    return <Component {...props} />;
  });
}

export default PerformanceMonitor; 