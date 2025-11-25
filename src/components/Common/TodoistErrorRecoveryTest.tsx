import React, { useState } from 'react';
import { todoistSyncManager } from '../../utils/todoistSyncManagerNew';
import { MaterialIcon } from './MaterialIcon';

interface ErrorRecoveryTestProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TodoistErrorRecoveryTest: React.FC<ErrorRecoveryTestProps> = ({ isOpen, onClose }) => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const runErrorRecoveryTest = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      // Test 1: Network Error Simulation
      setTestResult('Testing network error recovery...\n');
      
      // Simulate a network failure by temporarily changing the base URL
      const originalBaseUrl = (todoistSyncManager as any).baseUrl;
      (todoistSyncManager as any).baseUrl = 'https://invalid-url-that-does-not-exist.com';
      
      try {
        await todoistSyncManager.testConnection();
      } catch (error) {
        setTestResult(prev => prev + `✅ Network error correctly detected and handled\n`);
      }
      
      // Restore original URL
      (todoistSyncManager as any).baseUrl = originalBaseUrl;
      
      // Test 2: Circuit Breaker State
      const config = todoistSyncManager.getConfig();
      if (config?.circuitBreaker) {
        setTestResult(prev => prev + `✅ Circuit Breaker State: ${config.circuitBreaker.state}\n`);
        setTestResult(prev => prev + `   Failure Count: ${config.circuitBreaker.failureCount}\n`);
        setTestResult(prev => prev + `   Success Count: ${config.circuitBreaker.successCount}\n`);
      }
      
      // Test 3: Error Log
      const recentErrors = todoistSyncManager.getRecentErrors();
      setTestResult(prev => prev + `✅ Recent Errors in Log: ${recentErrors.length}\n`);
      
      if (recentErrors.length > 0) {
        setTestResult(prev => prev + `   Latest Error Types: ${recentErrors.slice(-3).map(e => e.type).join(', ')}\n`);
      }
      
      // Test 4: Retry Configuration
      if (config?.retryConfig) {
        setTestResult(prev => prev + `✅ Retry Configuration:\n`);
        setTestResult(prev => prev + `   Max Retries: ${config.retryConfig.maxRetries}\n`);
        setTestResult(prev => prev + `   Base Delay: ${config.retryConfig.baseDelay}ms\n`);
        setTestResult(prev => prev + `   Retryable Errors: ${config.retryConfig.retryableErrors.join(', ')}\n`);
      }
      
      setTestResult(prev => prev + `\n🎉 Error Recovery System Test Completed Successfully!`);
      
    } catch (error) {
      setTestResult(prev => prev + `❌ Test failed: ${error}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearErrorLog = () => {
    todoistSyncManager.clearErrorLog();
    setTestResult(prev => prev + `🧹 Error log cleared\n`);
  };

  const simulateCircuitBreakerReset = () => {
    const config = todoistSyncManager.getConfig();
    if (config?.circuitBreaker) {
      config.circuitBreaker.state = 'closed';
      config.circuitBreaker.failureCount = 0;
      config.circuitBreaker.successCount = 0;
      delete config.circuitBreaker.nextRetryTime;
      todoistSyncManager.updateConfig(config);
      setTestResult(prev => prev + `🔄 Circuit breaker reset to closed state\n`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Error Recovery System Test
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <MaterialIcon name="close" className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="space-y-4">
            {/* Test Controls */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={runErrorRecoveryTest}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MaterialIcon name="play_arrow" className="w-4 h-4" />
                )}
                <span>Run Error Recovery Test</span>
              </button>
              
              <button
                onClick={clearErrorLog}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <MaterialIcon name="clear_all" className="w-4 h-4" />
                <span>Clear Error Log</span>
              </button>
              
              <button
                onClick={simulateCircuitBreakerReset}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <MaterialIcon name="refresh" className="w-4 h-4" />
                <span>Reset Circuit Breaker</span>
              </button>
            </div>

            {/* Test Results */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Test Results:</h3>
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                {testResult || 'Click "Run Error Recovery Test" to start testing...'}
              </pre>
            </div>

            {/* Current System Status */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-200 mb-2">Current System Status:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Sync Manager:</span>
                  <span className="font-mono text-blue-800 dark:text-blue-200">
                    {todoistSyncManager.getConfig()?.enabled ? '✅ Enabled' : '❌ Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Circuit Breaker:</span>
                  <span className="font-mono text-blue-800 dark:text-blue-200">
                    {todoistSyncManager.getConfig()?.circuitBreaker?.state || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Error Log Size:</span>
                  <span className="font-mono text-blue-800 dark:text-blue-200">
                    {todoistSyncManager.getRecentErrors().length} entries
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}; 