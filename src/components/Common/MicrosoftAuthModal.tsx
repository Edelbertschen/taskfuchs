import React, { useState, useEffect } from 'react';
import { X, Loader, CheckCircle, ExternalLink, Shield, Key, Cloud } from 'lucide-react';
import { microsoftToDoService } from '../../utils/microsoftTodoService';
import { useAppTranslation } from '../../utils/i18nHelpers';
import type { MicrosoftToDoAuth } from '../../types';

interface MicrosoftAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (auth: MicrosoftToDoAuth) => void;
}

export function MicrosoftAuthModal({ isOpen, onClose, onAuthSuccess }: MicrosoftAuthModalProps) {
  const { microsoftAuthModal } = useAppTranslation();
  const [step, setStep] = useState<'info' | 'auth' | 'callback' | 'success' | 'error'>('info');
  const [authUrl, setAuthUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [authWindow, setAuthWindow] = useState<Window | null>(null);

  // Handle OAuth callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'MICROSOFT_AUTH_CALLBACK') {
        const { code, state, error: authError } = event.data;
        
        if (authWindow) {
          authWindow.close();
          setAuthWindow(null);
        }

        if (authError) {
          setError(`Authentifizierungsfehler: ${authError}`);
          setStep('error');
          return;
        }

        if (code && state) {
          setStep('callback');
          setIsLoading(true);
          
          try {
            const auth = await microsoftToDoService.exchangeCodeForToken(code, state);
            onAuthSuccess(auth);
            setStep('success');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unbekannter Fehler bei der Token-Abfrage');
            setStep('error');
          } finally {
            setIsLoading(false);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [authWindow, onAuthSuccess]);

  // Clean up auth window on unmount
  useEffect(() => {
    return () => {
      if (authWindow && !authWindow.closed) {
        authWindow.close();
      }
    };
  }, [authWindow]);

  const handleStartAuth = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const url = await microsoftToDoService.initiateAuth();
      setAuthUrl(url);
      setStep('auth');
      
      // Open auth window
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const newWindow = window.open(
        url, 
        'microsoft_auth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );
      
      if (newWindow) {
        setAuthWindow(newWindow);
        
        // Monitor window for manual close
        const checkClosed = setInterval(() => {
          if (newWindow.closed) {
            clearInterval(checkClosed);
            setAuthWindow(null);
            if (step === 'auth') {
              setStep('info');
            }
          }
        }, 1000);
      } else {
        setError(microsoftAuthModal.popupBlockedError());
        setStep('error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Starten der Authentifizierung';
      
      // Check for different types of errors and provide helpful messages
      if (errorMessage.includes('crypto.subtle') || errorMessage.includes('digest')) {
        setError(microsoftAuthModal.securityError());
      } else if (errorMessage.includes('Azure App Registration nicht konfiguriert')) {
        setError('Azure App Registration erforderlich: Bitte erstellen Sie zuerst eine Azure App Registration. Anleitung in MICROSOFT-TODO-QUICKSTART.md Schritt 0.');
      } else if (errorMessage.includes('Application with identifier') && errorMessage.includes('was not found')) {
        setError(microsoftAuthModal.clientIdNotFound());
      } else {
        setError(errorMessage);
      }
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setStep('info');
    setError('');
    setAuthUrl('');
  };

  const handleClose = () => {
    if (authWindow && !authWindow.closed) {
      authWindow.close();
    }
    setStep('info');
    setError('');
    setAuthUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Microsoft To Do</h2>
              <p className="text-blue-100">Authentifizierung erforderlich</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'info' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Sichere Verbindung zu Microsoft
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Um TaskFuchs mit Microsoft To Do zu synchronisieren, müssen Sie sich mit Ihrem Microsoft-Konto anmelden.
                </p>
              </div>

              {/* Development Environment Warning */}
              {!window.location.protocol.startsWith('https') && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0">⚠️</div>
                    <div>
                      <div className="font-medium text-yellow-800 dark:text-yellow-200">Entwicklungsumgebung</div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Sie verwenden HTTP anstatt HTTPS. Ein weniger sicherer Fallback wird für die Authentifizierung verwendet.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <Key className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">OAuth2-Authentifizierung</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Sichere Anmeldung ohne Passwort-Speicherung
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Begrenzte Berechtigung</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Nur Zugriff auf To Do-Listen, keine anderen Daten
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <ExternalLink className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Direkte Verbindung</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Kommunikation direkt mit Microsoft-Servern
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartAuth}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Mit Microsoft anmelden</span>
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'auth' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                <Loader className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Anmeldung läuft...
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Bitte melden Sie sich im Microsoft-Popup-Fenster an.
              </p>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Falls das Popup-Fenster nicht erscheint, überprüfen Sie bitte Ihre Popup-Blocker-Einstellungen.
                </p>
              </div>
            </div>
          )}

          {step === 'callback' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <Loader className="w-8 h-8 text-green-600 dark:text-green-400 animate-spin" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Verbindung wird hergestellt...
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Authentifizierungstoken werden abgerufen und gespeichert.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Erfolgreich verbunden!
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                TaskFuchs ist jetzt mit Ihrem Microsoft To Do-Konto verbunden.
              </p>
              
              <button
                onClick={handleClose}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Weiter zur Konfiguration
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto">
                <X className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Authentifizierung fehlgeschlagen
              </h3>
              <p className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {error}
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleRetry}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Erneut versuchen
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 