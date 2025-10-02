import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  BarChart3,
  Target,
  Clock,
  AlertCircle,
  Save,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useTranslation } from 'react-i18next';
import type { Column, ProjectTimebudget, YearlyTimebudget, MonthlyTimebudget } from '../../types';

interface ProjectTimebudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Column;
}

export function ProjectTimebudgetModal({ isOpen, onClose, project }: ProjectTimebudgetModalProps) {
  const { state, dispatch } = useApp();
  const { t } = useTranslation();
  
  // CSS für weiße Input-Schrift bei aktuellem Monat - auch für Timebudget Modal
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .timebudget-current-month-input,
      .timebudget-current-month-input input,
      input.timebudget-current-month-input {
        color: white !important;
        -webkit-text-fill-color: white !important;
        -moz-text-fill-color: white !important;
        text-shadow: none !important;
        -webkit-appearance: none !important;
        caret-color: white !important;
      }
      .timebudget-current-month-input:focus,
      .timebudget-current-month-input input:focus,
      input.timebudget-current-month-input:focus {
        color: white !important;
        -webkit-text-fill-color: white !important;
        -moz-text-fill-color: white !important;
        outline: none !important;
        border-color: rgba(255, 255, 255, 0.5) !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
  
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [editMode, setEditMode] = useState<'budget' | 'tracked'>('budget');
  const [yearlyHours, setYearlyHours] = useState<string>('');
  const [distributionMode, setDistributionMode] = useState<'manual' | 'equal'>('equal');
  const [monthlyBudgets, setMonthlyBudgets] = useState<Record<number, string>>({});
  const [monthlyTracked, setMonthlyTracked] = useState<Record<number, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const accentColor = state.preferences.accentColor;
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  // Initialize data from project timebudget
  useEffect(() => {
    if (project.timebudget?.yearlyBudgets[currentYear]) {
      const yearData = project.timebudget.yearlyBudgets[currentYear];
      setYearlyHours(yearData.totalHours?.toString() || '');
      setDistributionMode(yearData.distributionMode === 'weighted' ? 'manual' : yearData.distributionMode || 'equal');
      
      const budgets: Record<number, string> = {};
      const tracked: Record<number, string> = {};
      
      for (let month = 1; month <= 12; month++) {
        const monthData = yearData.monthlyBudgets[month];
        if (monthData) {
          budgets[month] = monthData.budgetedHours.toString();
          tracked[month] = (monthData.trackedHours || 0).toString();
        } else {
          budgets[month] = '0';
          tracked[month] = '0';
        }
      }
      
      setMonthlyBudgets(budgets);
      setMonthlyTracked(tracked);
    } else {
      // Initialize empty data
      const budgets: Record<number, string> = {};
      const tracked: Record<number, string> = {};
      
      for (let month = 1; month <= 12; month++) {
        budgets[month] = '0';
        tracked[month] = '0';
      }
      
      setMonthlyBudgets(budgets);
      setMonthlyTracked(tracked);
      setYearlyHours('');
      setDistributionMode('equal');
    }
    setHasUnsavedChanges(false);
  }, [project.timebudget, currentYear]);

  const handleYearlyHoursChange = (value: string) => {
    setYearlyHours(value);
    setHasUnsavedChanges(true);
    
    if (distributionMode === 'equal' && value) {
      const totalHours = parseFloat(value);
      if (totalHours > 0) {
        const monthlyAmount = totalHours / 12;
        const newBudgets: Record<number, string> = {};
        for (let month = 1; month <= 12; month++) {
          newBudgets[month] = monthlyAmount.toFixed(1);
        }
        setMonthlyBudgets(newBudgets);
      }
    }
  };

  const handleDistributionModeChange = (mode: 'manual' | 'equal') => {
    setDistributionMode(mode);
    setHasUnsavedChanges(true);
    
    if (mode === 'equal' && yearlyHours) {
      const totalHours = parseFloat(yearlyHours);
      if (totalHours > 0) {
        const monthlyAmount = totalHours / 12;
        const newBudgets: Record<number, string> = {};
        for (let month = 1; month <= 12; month++) {
          newBudgets[month] = monthlyAmount.toFixed(1);
        }
        setMonthlyBudgets(newBudgets);
      }
    }
  };

  const handleMonthlyChange = (month: number, value: string, type: 'budget' | 'tracked') => {
    if (type === 'budget') {
      setMonthlyBudgets(prev => ({ ...prev, [month]: value }));
    } else {
      setMonthlyTracked(prev => ({ ...prev, [month]: value }));
    }
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    const yearlyBudget: YearlyTimebudget = {
      year: currentYear,
      totalHours: parseFloat(yearlyHours) || undefined,
      monthlyBudgets: {},
      distributionMode
    };

    for (let month = 1; month <= 12; month++) {
      const budgetedHours = parseFloat(monthlyBudgets[month]) || 0;
      const trackedHours = parseFloat(monthlyTracked[month]) || 0;
      
      yearlyBudget.monthlyBudgets[month] = {
        month,
        year: currentYear,
        budgetedHours,
        trackedHours
      };
    }

    let timebudget: ProjectTimebudget;
    
    if (project.timebudget) {
      timebudget = {
        ...project.timebudget,
        yearlyBudgets: {
          ...project.timebudget.yearlyBudgets,
          [currentYear]: yearlyBudget
        },
        updatedAt: new Date().toISOString()
      };
    } else {
      timebudget = {
        id: `timebudget-${project.id}-${Date.now()}`,
        projectId: project.id,
        yearlyBudgets: {
          [currentYear]: yearlyBudget
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    dispatch({
      type: 'UPDATE_COLUMN',
      payload: {
        ...project,
        timebudget
      }
    });

    setHasUnsavedChanges(false);
    onClose();
  };

  const handleReset = () => {
    if (!window.confirm(`Möchten Sie wirklich alle Zeitbudget-Daten für ${project.title} (${currentYear}) komplett löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    // Komplett alle Plandaten entfernen
    setYearlyHours('');
    setDistributionMode('equal');
    
    const emptyBudgets: Record<number, string> = {};
    const emptyTracked: Record<number, string> = {};
    
    for (let month = 1; month <= 12; month++) {
      emptyBudgets[month] = '0';
      emptyTracked[month] = '0';
    }
    
    setMonthlyBudgets(emptyBudgets);
    setMonthlyTracked(emptyTracked);
    
    // Direkt speichern und Timebudget vom Projekt entfernen
    const updatedProject = { ...project };
    if (updatedProject.timebudget?.yearlyBudgets[currentYear]) {
      delete updatedProject.timebudget.yearlyBudgets[currentYear];
      
      // Wenn keine Jahresbudgets mehr vorhanden sind, entferne das ganze timebudget
      if (Object.keys(updatedProject.timebudget.yearlyBudgets).length === 0) {
        delete updatedProject.timebudget;
      }
    }
    
    dispatch({ type: 'UPDATE_COLUMN', payload: updatedProject });
    setHasUnsavedChanges(false);
    onClose();
  };

  const getTotalBudgeted = (): number => {
    return Object.values(monthlyBudgets).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const getTotalTracked = (): number => {
    return Object.values(monthlyTracked).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  if (!isOpen) return null;

  const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth() + 1;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] modal-backdrop"
      style={{ 
        isolation: 'isolate',
        pointerEvents: 'auto'
      }}
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: `${accentColor}20` }}>
          <div className="flex items-center space-x-2">
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: accentColor }}
            >
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: accentColor }}>
                Time Budget Planning
              </h2>
              <p className="text-xs opacity-70" style={{ color: accentColor }}>
                {project.title} • {currentYear}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <div 
                className="flex items-center space-x-1 px-2 py-1 rounded text-xs"
                style={{ 
                  backgroundColor: '#f59e0b20',
                  color: '#f59e0b'
                }}
              >
                <AlertCircle className="w-3 h-3" />
                <span>Unsaved</span>
              </div>
            )}
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all hover:scale-105"
              style={{ 
                backgroundColor: `${accentColor}10`,
                color: isDarkMode ? 'white' : accentColor
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-3 border-b" style={{ borderColor: `${accentColor}20` }}>
          <div className="flex items-center justify-between">
            {/* Year Selection */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setCurrentYear(prev => prev - 1)}
                className="p-1.5 rounded-lg transition-all hover:scale-105"
                style={{ 
                  backgroundColor: `${accentColor}15`,
                  color: isDarkMode ? 'white' : accentColor
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div 
                className="px-3 py-1.5 rounded-lg font-bold text-lg"
                style={{ 
                  backgroundColor: accentColor,
                  color: 'white'
                }}
              >
                {currentYear}
              </div>
              
              <button
                onClick={() => setCurrentYear(prev => prev + 1)}
                className="p-1.5 rounded-lg transition-all hover:scale-105"
                style={{ 
                  backgroundColor: `${accentColor}15`,
                  color: isDarkMode ? 'white' : accentColor
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex space-x-1">
              <button
                onClick={() => setEditMode('budget')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  editMode === 'budget' ? 'text-white' : 'opacity-60'
                }`}
                style={{
                  backgroundColor: editMode === 'budget' ? accentColor : `${accentColor}20`,
                  color: isDarkMode ? 'white' : (editMode === 'budget' ? 'white' : accentColor)
                }}
              >
                Plan Budget
              </button>
              <button
                onClick={() => setEditMode('tracked')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  editMode === 'tracked' ? 'text-white' : 'opacity-60'
                }`}
                style={{
                  backgroundColor: editMode === 'tracked' ? accentColor : `${accentColor}20`,
                  color: isDarkMode ? 'white' : (editMode === 'tracked' ? 'white' : accentColor)
                }}
              >
                Track Time
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 text-gray-900 dark:text-gray-100">
          <div className="space-y-4">
            {editMode === 'budget' && (
              <>
                {/* Yearly Hours Input */}
                <input
                  type="number"
                  value={yearlyHours}
                  onChange={(e) => handleYearlyHoursChange(e.target.value)}
                  placeholder="Total Yearly Hours"
                  className="w-full px-3 py-2 rounded-lg text-center font-medium focus:outline-none transition-all placeholder-gray-500 dark:placeholder-gray-300"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    color: isDarkMode ? 'white' : 'inherit',
                    border: `1px solid rgba(255,255,255,0.18)`
                  }}
                  min="0"
                  step="1"
                />

                {/* Distribution Mode */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDistributionModeChange('equal')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      distributionMode === 'equal' ? 'text-white' : 'opacity-60'
                    }`}
                    style={{
                      backgroundColor: distributionMode === 'equal' ? accentColor : `${accentColor}20`,
                      color: distributionMode === 'equal' ? 'white' : accentColor
                    }}
                  >
                    Equal
                  </button>
                  <button
                    onClick={() => handleDistributionModeChange('manual')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      distributionMode === 'manual' ? 'text-white' : 'opacity-60'
                    }`}
                    style={{
                      backgroundColor: distributionMode === 'manual' ? accentColor : `${accentColor}20`,
                      color: distributionMode === 'manual' ? 'white' : accentColor
                    }}
                  >
                    Manual
                  </button>
                </div>
              </>
            )}

            {/* Summary */}
            <div 
              className="text-center text-sm font-medium py-2 rounded-lg"
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: isDarkMode ? 'white' : 'inherit'
              }}
            >
              {editMode === 'budget' ? `Total: ${getTotalBudgeted().toFixed(0)}h` : `Tracked: ${getTotalTracked().toFixed(0)}h`}
            </div>

            {/* Monthly Grid */}
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, index) => {
                const month = index + 1;
                const isCurrentMonth = month === currentMonth && currentYear === new Date().getFullYear();
                
                return (
                  <div key={month} className="text-center">
                    <div 
                      className={`text-xs font-medium mb-1 ${isCurrentMonth ? 'font-bold' : ''}`}
                      style={{ 
                        color: isDarkMode ? 'white' : (isCurrentMonth ? accentColor : 'inherit')
                      }}
                    >
                      {shortMonthNames[index]}
                      {isCurrentMonth && ' •'}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editMode === 'budget' ? monthlyBudgets[month] || '0' : monthlyTracked[month] || '0'}
                      onChange={(e) => handleMonthlyChange(month, e.target.value, editMode)}
                      disabled={editMode === 'budget' && distributionMode === 'equal'}
                      className={`w-full px-2 py-1.5 text-xs text-center rounded-lg focus:outline-none transition-all placeholder-gray-500 dark:placeholder-gray-300 ${
                        isCurrentMonth ? 'font-bold timebudget-current-month-input' : ''
                      }`}
                      style={{ 
                        backgroundColor: isCurrentMonth ? accentColor : 'rgba(255,255,255,0.06)',
                        color: isCurrentMonth ? 'white !important' : (isDarkMode ? 'white' : 'inherit'),
                        border: `1px solid rgba(255,255,255,0.18)`,
                        ...(isCurrentMonth ? {
                          WebkitTextFillColor: 'white !important',
                          MozTextFillColor: 'white !important',
                          textShadow: 'none !important',
                          caretColor: 'white !important'
                        } : {})
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t" style={{ borderColor: `${accentColor}20` }}>
          <div className="flex justify-center space-x-2">
            <button
              onClick={handleReset}
              disabled={!project.timebudget}
              className="px-3 py-1.5 text-xs rounded-lg transition-all disabled:opacity-30 flex items-center space-x-1 hover:bg-red-50 hover:text-red-600"
              style={{ 
                backgroundColor: `${accentColor}15`,
                color: accentColor
              }}
              title="Alle Zeitbudget-Daten für dieses Jahr komplett löschen"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Alle Daten löschen</span>
            </button>
            
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg transition-all"
              style={{ 
                backgroundColor: `${accentColor}15`,
                color: accentColor
              }}
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className="px-4 py-1.5 text-xs font-medium rounded-lg text-white transition-all hover:scale-105 disabled:opacity-50 flex items-center space-x-1"
              style={{ 
                backgroundColor: accentColor
              }}
            >
              <Save className="w-3 h-3" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 
