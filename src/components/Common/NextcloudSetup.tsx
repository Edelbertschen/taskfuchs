import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { nextcloudManager, NextcloudConfig, NextcloudStatus } from '../../utils/nextcloudManager';
import {
  Cloud,
  CloudOff,
  Check,
  X,
  Eye,
  EyeOff,
  Settings,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronLeft,
  Zap,
  Shield,
  Clock,
  Globe
} from 'lucide-react';

interface NextcloudSetupProps {
  onClose: () => void;
  isOpen: boolean;
}

type SetupStep = 'welcome' | 'connection' | 'settings' | 'complete';

export const NextcloudSetup: React.FC<NextcloudSetupProps> = ({ onClose, isOpen }) => {
  const { t } = useTranslation();
  const { state } = useApp();
  
  // ===== STATE =====
  
  const [currentStep, setCurrentStep] = useState<SetupStep>('welcome');
  const [config, setConfig] = useState<Partial<NextcloudConfig>>({
    serverUrl: '',
    username: '',
    password: '',
    syncFolder: '/TaskFuchs',
    autoSync: true,
    syncInterval: 60, // 1 hour default
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [status, setStatus] = useState<NextcloudStatus | null>(null);

  // ===== EFFECTS =====

  useEffect(() => {
    if (isOpen) {
      // Load existing config if available
      const existingConfig = nextcloudManager.getConfig();
      if (existingConfig) {
        setConfig(existingConfig);
        if (existingConfig.enabled && nextcloudManager.isConfigured()) {
          setCurrentStep('settings');
        }
      }
      
      // Subscribe to status updates
      const unsubscribe = nextcloudManager.onStatusChange(setStatus);
      setStatus(nextcloudManager.getStatus());
      
      return unsubscribe;
    }
  }, [isOpen]);

  // ===== HANDLERS =====

  const handleTestConnection = async () => {
    if (!config.serverUrl || !config.username || !config.password) {
      setConnectionResult({
        success: false,
        message: '⚠️ Bitte füllen Sie alle Felder aus'
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionResult(null);

    try {
      const result = await nextcloudManager.testConnection(
        config.serverUrl,
        config.username,
        config.password
      );
      setConnectionResult(result);
      
      if (result.success) {
        setTimeout(() => setCurrentStep('settings'), 1500);
      }
    } catch (error) {
      setConnectionResult({
        success: false,
        message: '❌ Unerwarteter Fehler beim Testen der Verbindung'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveConfiguration = async () => {
    setIsConfiguring(true);

    try {
      // Update configuration
      await nextcloudManager.updateConfig({
        ...config,
        enabled: true
      } as NextcloudConfig);

      // Set up global app data accessor for auto-sync
      if (typeof window !== 'undefined') {
        (window as any).getAppDataForSync = () => state;
      }

      setCurrentStep('complete');
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      // Perform the sync
      const result = await nextcloudManager.performSync(state, true);
      
      if (result.success) {
        setSyncResult({
          success: true,
          message: `✅ Synchronisation erfolgreich! ${result.message}`
        });
        
        // Update status to reflect the sync
        setStatus(nextcloudManager.getStatus());
      } else {
        setSyncResult({
          success: false,
          message: `❌ Synchronisation fehlgeschlagen: ${result.message}`
        });
      }
    } catch (error) {
      setSyncResult({
        success: false,
        message: `❌ Sync-Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisableSync = async () => {
    await nextcloudManager.disable();
    onClose();
  };

  const handleFinish = () => {
    // Close modal and return to dashboard
    onClose();
  };

  const handleRestart = () => {
    setCurrentStep('welcome');
    setConfig({
      serverUrl: '',
      username: '',
      password: '',
      syncFolder: '/TaskFuchs',
      autoSync: true,
      syncInterval: 60,
    });
    setConnectionResult(null);
    setSyncResult(null);
  };

  // ===== STEP COMPONENTS =====

  const renderWelcomeStep = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ 
        background: `linear-gradient(135deg, ${state.preferences.accentColor}, ${state.preferences.accentColor}CC)` 
      }}>
        <Cloud className="w-10 h-10 text-white" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Nextcloud-Synchronisation einrichten
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
          Synchronisieren Sie Ihre TaskFuchs-Daten sicher mit Ihrer Nextcloud und haben Sie überall Zugriff darauf.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        <div className="p-4 rounded-lg" style={{ 
          backgroundColor: `${state.preferences.accentColor}15`, 
          borderColor: `${state.preferences.accentColor}40`,
          border: '1px solid'
        }}>
          <Shield className="w-8 h-8 mb-2" style={{ color: state.preferences.accentColor }} />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Sicher</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Verschlüsselte Verbindung zu Ihrer privaten Cloud
          </p>
        </div>
        
        <div className="p-4 rounded-lg" style={{ 
          backgroundColor: `${state.preferences.accentColor}15`, 
          borderColor: `${state.preferences.accentColor}40`,
          border: '1px solid'
        }}>
          <Zap className="w-8 h-8 mb-2" style={{ color: state.preferences.accentColor }} />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Automatisch</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Synchronisation läuft im Hintergrund
          </p>
        </div>
        
        <div className="p-4 rounded-lg" style={{ 
          backgroundColor: `${state.preferences.accentColor}15`, 
          borderColor: `${state.preferences.accentColor}40`,
          border: '1px solid'
        }}>
          <Globe className="w-8 h-8 mb-2" style={{ color: state.preferences.accentColor }} />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Überall</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Zugriff von allen Ihren Geräten
          </p>
        </div>
      </div>

      <div className="flex justify-center space-x-3">
        <button
          onClick={() => setCurrentStep('connection')}
          className="px-8 py-3 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium flex items-center space-x-2"
          style={{ 
            backgroundColor: state.preferences.accentColor,
            boxShadow: `0 4px 12px ${state.preferences.accentColor}40`
          }}
        >
          <span>Jetzt einrichten</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderConnectionStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4" style={{ 
          backgroundColor: `${state.preferences.accentColor}20`,
          color: state.preferences.accentColor 
        }}>
          <Cloud className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Nextcloud-Verbindung
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Geben Sie Ihre Nextcloud-Zugangsdaten ein
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Server-URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={config.serverUrl || ''}
            onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
            placeholder="https://ihre-nextcloud.de"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ 
              '--tw-ring-color': state.preferences.accentColor,
              focusRingColor: `${state.preferences.accentColor}60`
            } as React.CSSProperties}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            💡 Die komplette URL zu Ihrer Nextcloud-Installation
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Benutzername <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.username || ''}
            onChange={(e) => setConfig({ ...config, username: e.target.value })}
            placeholder="ihr-benutzername"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ 
              '--tw-ring-color': state.preferences.accentColor,
              focusRingColor: `${state.preferences.accentColor}60`
            } as React.CSSProperties}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Passwort <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={config.password || ''}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
              placeholder="Ihr Passwort oder App-Passwort"
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ 
                '--tw-ring-color': state.preferences.accentColor,
                focusRingColor: `${state.preferences.accentColor}60`
              } as React.CSSProperties}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            🔒 Empfehlung: Verwenden Sie ein App-Passwort für zusätzliche Sicherheit
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sync-Ordner
          </label>
          <input
            type="text"
            value={config.syncFolder || '/TaskFuchs'}
            onChange={(e) => setConfig({ ...config, syncFolder: e.target.value })}
            placeholder="/TaskFuchs"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ 
              '--tw-ring-color': state.preferences.accentColor,
              focusRingColor: `${state.preferences.accentColor}60`
            } as React.CSSProperties}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            📁 Ordner in Ihrer Nextcloud, wo die Daten gespeichert werden
          </p>
        </div>
      </div>

      {connectionResult && (
        <div className={`p-4 rounded-lg ${
          connectionResult.success 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-start space-x-3">
            {connectionResult.success ? (
              <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            )}
            <p className={`text-sm ${
              connectionResult.success 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-red-800 dark:text-red-200'
            }`}>
              {connectionResult.message}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep('welcome')}
          className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center space-x-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Zurück</span>
        </button>
        
        <button
          onClick={handleTestConnection}
          disabled={isTestingConnection || !config.serverUrl || !config.username || !config.password}
          className="px-8 py-3 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center space-x-2"
          style={{ 
            backgroundColor: state.preferences.accentColor,
            boxShadow: `0 4px 12px ${state.preferences.accentColor}40`
          }}
        >
          {isTestingConnection ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Teste Verbindung...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Verbindung testen</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderSettingsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4" style={{ 
          backgroundColor: `${state.preferences.accentColor}20`,
          color: state.preferences.accentColor 
        }}>
          <Settings className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Synchronisation konfigurieren
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Legen Sie fest, wie die Synchronisation ablaufen soll
        </p>
      </div>

      <div className="space-y-6">
        {/* Auto-Sync Settings */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5" style={{ color: state.preferences.accentColor }} />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Automatische Synchronisation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Daten werden automatisch im Hintergrund synchronisiert</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoSync || false}
                onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600"
                style={{ 
                  '--peer-checked-bg': state.preferences.accentColor,
                  '--peer-focus-ring-color': `${state.preferences.accentColor}40`
                } as React.CSSProperties}
              />
            </label>
          </div>

          {config.autoSync && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sync-Intervall
              </label>
              <select
                value={config.syncInterval || 60}
                onChange={(e) => setConfig({ ...config, syncInterval: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ 
                  '--tw-ring-color': state.preferences.accentColor,
                  focusRingColor: `${state.preferences.accentColor}60`
                } as React.CSSProperties}
              >
                <option value={15}>Alle 15 Minuten</option>
                <option value={30}>Alle 30 Minuten</option>
                <option value={60}>Jede Stunde</option>
                <option value={120}>Alle 2 Stunden</option>
                <option value={360}>Alle 6 Stunden</option>
                <option value={720}>Alle 12 Stunden</option>
                <option value={1440}>Täglich</option>
              </select>
            </div>
          )}
        </div>

        {/* Current Status */}
        {status && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Aktueller Status</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Verbindung:</span>
                <span className={`ml-2 font-medium ${status.connected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {status.connected ? 'Verbunden' : 'Getrennt'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Synchronisationen:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{status.totalSyncs}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{status.message}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep('connection')}
          className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center space-x-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Zurück</span>
        </button>
        
        <button
          onClick={handleSaveConfiguration}
          disabled={isConfiguring}
          className="px-8 py-3 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center space-x-2"
          style={{ 
            backgroundColor: state.preferences.accentColor,
            boxShadow: `0 4px 12px ${state.preferences.accentColor}40`
          }}
        >
          {isConfiguring ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Konfiguriere...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Aktivieren</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center" style={{ 
        background: `linear-gradient(135deg, ${state.preferences.accentColor}, ${state.preferences.accentColor}CC)` 
      }}>
        <Check className="w-10 h-10 text-white" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          🎉 Synchronisation aktiviert!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
          Ihre TaskFuchs-Daten werden jetzt automatisch mit Ihrer Nextcloud synchronisiert.
        </p>
      </div>

      {status && (
        <div className="rounded-lg p-4 border" style={{ 
          backgroundColor: `${state.preferences.accentColor}10`,
          borderColor: `${state.preferences.accentColor}30`
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: state.preferences.accentColor }}>{status.totalSyncs}</div>
              <div className="text-gray-600 dark:text-gray-400">Synchronisationen</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium text-gray-900 dark:text-white">
                {config.autoSync ? `Alle ${config.syncInterval! / 60}h` : 'Manuell'}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Sync-Modus</div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Result Feedback */}
      {syncResult && (
        <div className={`p-4 rounded-lg ${
          syncResult.success 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <p className={`text-sm ${
            syncResult.success 
              ? 'text-green-800 dark:text-green-200' 
              : 'text-red-800 dark:text-red-200'
          }`}>
            {syncResult.message}
          </p>
        </div>
      )}

      <div className="flex justify-center space-x-3">
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: state.preferences.accentColor,
            boxShadow: `0 4px 12px ${state.preferences.accentColor}40`
          }}
        >
          {isSyncing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Synchronisiert...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Jetzt synchronisieren</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleFinish}
          className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
        >
          Fertig
        </button>
      </div>

      <button
        onClick={handleDisableSync}
        className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
      >
        Synchronisation deaktivieren
      </button>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ 
                backgroundColor: `${state.preferences.accentColor}20`,
                color: state.preferences.accentColor 
              }}>
                <Cloud className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Nextcloud-Sync
              </h1>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-2">
              {(['welcome', 'connection', 'settings', 'complete'] as SetupStep[]).map((step, index) => (
                <React.Fragment key={step}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === currentStep
                      ? 'text-white'
                      : index < (['welcome', 'connection', 'settings', 'complete'] as SetupStep[]).indexOf(currentStep)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                  }`}
                  style={step === currentStep ? { backgroundColor: state.preferences.accentColor } : {}}
                  >
                    {index < (['welcome', 'connection', 'settings', 'complete'] as SetupStep[]).indexOf(currentStep) ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < 3 && (
                    <div className={`w-8 h-0.5 ${
                      index < (['welcome', 'connection', 'settings', 'complete'] as SetupStep[]).indexOf(currentStep)
                        ? 'bg-green-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === 'welcome' && renderWelcomeStep()}
            {currentStep === 'connection' && renderConnectionStep()}
            {currentStep === 'settings' && renderSettingsStep()}
            {currentStep === 'complete' && renderCompleteStep()}
          </div>
        </div>
      </div>
    </div>
  );
}; 