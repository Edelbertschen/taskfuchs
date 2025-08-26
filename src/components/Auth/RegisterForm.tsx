import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onGuestMode: () => void;
}

export function RegisterForm({ onSwitchToLogin, onGuestMode }: RegisterFormProps) {
  const { register, state } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validation
    if (password !== confirmPassword) {
      setLocalError('Passwörter stimmen nicht überein');
      return;
    }

    if (password.length < 6) {
      setLocalError('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    if (!acceptTerms) {
      setLocalError('Bitte akzeptieren Sie die Nutzungsbedingungen');
      return;
    }

    await register(email, password, name);
  };

  const error = localError || state.error;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Konto erstellen
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Registrieren Sie sich bei TaskFuchs
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Vollständiger Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Max Mustermann"
                required
                disabled={state.isLoading}
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              E-Mail-Adresse
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="max@beispiel.de"
                required
                disabled={state.isLoading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Passwort
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="••••••••"
                required
                disabled={state.isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                disabled={state.isLoading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Mindestens 6 Zeichen
            </p>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Passwort bestätigen
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="••••••••"
                required
                disabled={state.isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                disabled={state.isLoading}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Terms Checkbox */}
          <div>
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent dark:focus:ring-accent dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600 mt-0.5"
                disabled={state.isLoading}
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                Ich akzeptiere die{' '}
                <button
                  type="button"
                  className="text-accent hover:text-accent/80 underline"
                  disabled={state.isLoading}
                >
                  Nutzungsbedingungen
                </button>
                {' '}und{' '}
                <button
                  type="button"
                  className="text-accent hover:text-accent/80 underline"
                  disabled={state.isLoading}
                >
                  Datenschutzerklärung
                </button>
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={state.isLoading || !email || !password || !confirmPassword || !name || !acceptTerms}
            className="w-full bg-accent hover:bg-accent/90 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            {state.isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Registrieren...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                <span>Konto erstellen</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
          <span className="px-4 text-sm text-gray-500 dark:text-gray-400">oder</span>
          <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
        </div>

        {/* Guest Mode Button */}
        <button
          onClick={onGuestMode}
          disabled={state.isLoading}
          className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium transition-colors mb-4"
        >
          Als Gast fortfahren
        </button>

        {/* Switch to Login */}
        <div className="text-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Bereits ein Konto?{' '}
          </span>
          <button
            onClick={onSwitchToLogin}
            disabled={state.isLoading}
            className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
          >
            Anmelden
          </button>
        </div>
      </div>
    </div>
  );
} 