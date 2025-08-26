import React from 'react';
import type { UserPreferences } from '../../types';

interface TogglSettingsProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updates: Partial<UserPreferences>) => void;
}

export function TogglSettings({ preferences, onUpdatePreferences }: TogglSettingsProps) {
  // Toggl integration has been removed - this is a placeholder component
  return null;
} 