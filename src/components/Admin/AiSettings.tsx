import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { aiAPI, type AISettings } from '../../services/apiService';
import { 
  Sparkles, 
  Save, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Zap,
  Settings,
  Key
} from 'lucide-react';

const AVAILABLE_MODELS = [
  { id: 'Qwen/Qwen3-235B-A22B-Instruct-2507', name: 'Qwen3 235B A22B (Recommended)' },
  { id: 'Qwen/Qwen3-30B-A3B-Instruct', name: 'Qwen3 30B A3B (Faster)' },
  { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B Instruct' },
  { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
];

export function AiSettings() {
  const { t } = useTranslation();
  const { state: authState } = useAuth();
  const { state: appState } = useApp();
  
  // Get accent color
  const accentColor = appState.preferences?.accentColor || '#0ea5e9';
  
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Form state - enabled by default
  const [enabled, setEnabled] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('Qwen/Qwen3-235B-A22B-Instruct-2507');
  const [baseUrl, setBaseUrl] = useState('https://api.studio.nebius.com/v1');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (authState.isAdmin) {
      loadSettings();
    }
  }, [authState.isAdmin]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await aiAPI.getSettings();
      setSettings(response.settings);
      setEnabled(response.settings.enabled);
      setModel(response.settings.model);
      setBaseUrl(response.settings.baseUrl);
      // Don't populate apiKey - it's masked
    } catch (err: any) {
      setError(err.message || 'Failed to load AI settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    setTestResult(null);
    
    try {
      const updateData: any = {
        enabled,
        model,
        baseUrl
      };
      
      // Only include API key if it was changed (not empty)
      if (apiKey.trim()) {
        updateData.apiKey = apiKey.trim();
      }
      
      const response = await aiAPI.updateSettings(updateData);
      setSettings(response.settings);
      setApiKey(''); // Clear the input after save
      setSuccess(t('ai.settingsSaved', 'AI settings saved successfully'));
      
      // Clear success after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save AI settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);
    
    try {
      const result = await aiAPI.testConnection();
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  // Not admin - show access denied
  if (!authState.isAdmin) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl max-w-md border border-gray-200/50 dark:border-gray-700/50">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {t('admin.accessDenied', 'Access Denied')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('admin.adminRequired', 'You need admin privileges to view this page.')}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: accentColor }}
          >
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('ai.settings', 'AI Settings')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('ai.settingsDescription', 'Configure AI-powered task parsing with Nebius API')}
            </p>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700 dark:text-green-300">{success}</p>
          </div>
        )}

        {/* Settings Card */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* Enable Toggle */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                <Zap className="w-5 h-5 flex-shrink-0" style={{ color: accentColor }} />
                <div className="min-w-0 overflow-hidden">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {t('ai.enableAI', 'Enable AI Features')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {t('ai.enableDescription', 'Allow users to use AI for task parsing')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className="relative w-12 h-6 flex-shrink-0 rounded-full transition-colors"
                style={{ backgroundColor: enabled ? accentColor : '#d1d5db' }}
              >
                <span 
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* API Key */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-5 h-5" style={{ color: accentColor }} />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t('ai.apiKey', 'API Key')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {settings?.hasApiKey 
                    ? t('ai.apiKeyConfigured', 'API key is configured') + ` (${settings.maskedApiKey})`
                    : t('ai.apiKeyRequired', 'Enter your Nebius API key')}
                </p>
              </div>
            </div>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={settings?.hasApiKey ? t('ai.enterNewKey', 'Enter new key to replace...') : t('ai.enterApiKey', 'Enter API key...')}
                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5" style={{ color: accentColor }} />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t('ai.model', 'AI Model')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('ai.modelDescription', 'Select the AI model for task parsing')}
                </p>
              </div>
            </div>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-gray-900 dark:text-white"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Settings */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">
                {t('ai.advancedSettings', 'Advanced Settings')}
              </span>
              <span className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {showAdvanced && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('ai.baseUrl', 'Base URL')}
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.studio.nebius.com/v1"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-gray-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Test Connection */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t('ai.testConnection', 'Test Connection')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('ai.testDescription', 'Verify your API key and connection')}
                </p>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !settings?.hasApiKey}
                className="px-4 py-2 disabled:bg-gray-400 text-white rounded-xl flex items-center gap-2 transition-colors hover:opacity-90"
                style={{ backgroundColor: isTesting || !settings?.hasApiKey ? undefined : accentColor }}
              >
                {isTesting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {t('ai.test', 'Test')}
              </button>
            </div>
            
            {testResult && (
              <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                testResult.success 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}>
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="text-sm">{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="p-6 bg-gray-50 dark:bg-gray-900/50">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full px-4 py-3 disabled:bg-gray-400 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors hover:opacity-90"
              style={{ backgroundColor: isSaving ? undefined : accentColor }}
            >
              {isSaving ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {t('common.save', 'Save Settings')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AiSettings;

