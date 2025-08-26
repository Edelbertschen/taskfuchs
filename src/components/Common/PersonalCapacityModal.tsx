import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Calendar, 
  Clock, 
  User,
  ChevronLeft,
  ChevronRight,
  Save,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';
import type { PersonalCapacity, YearlyCapacity, MonthlyCapacity } from '../../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface PersonalCapacityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PersonalCapacityModal({ isOpen, onClose }: PersonalCapacityModalProps) {
  const { state, dispatch } = useApp();
  const { t, i18n } = useTranslation();
  
  // CSS für weiße Input-Schrift bei aktuellem Monat
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .current-month-input,
      .current-month-input input,
      input.current-month-input {
        color: white !important;
        -webkit-text-fill-color: white !important;
        -moz-text-fill-color: white !important;
        text-shadow: none !important;
        -webkit-appearance: none !important;
        caret-color: white !important;
      }
      .current-month-input:focus,
      .current-month-input input:focus,
      input.current-month-input:focus {
        color: white !important;
        -webkit-text-fill-color: white !important;
        -moz-text-fill-color: white !important;
        outline: none !important;
        border-color: rgba(255, 255, 255, 0.5) !important;
      }
      .current-month-input::placeholder,
      .current-month-input input::placeholder,
      input.current-month-input::placeholder {
        color: rgba(255, 255, 255, 0.7) !important;
        -webkit-text-fill-color: rgba(255, 255, 255, 0.7) !important;
      }
      .current-month-input::-webkit-input-placeholder,
      input.current-month-input::-webkit-input-placeholder {
        color: rgba(255, 255, 255, 0.7) !important;
      }
      .current-month-input::-moz-placeholder,
      input.current-month-input::-moz-placeholder {
        color: rgba(255, 255, 255, 0.7) !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
  
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [distributionMode, setDistributionMode] = useState<'manual' | 'equal'>('manual');
  const [totalYearlyHours, setTotalYearlyHours] = useState('');
  const [monthlyHours, setMonthlyHours] = useState<{ [month: number]: string }>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  const accentColor = state.preferences.accentColor;
  const isMinimalDesign = state.preferences.minimalDesign;
  
  // Initialize form data when modal opens
  React.useEffect(() => {
    if (isOpen && state.personalCapacity && state.personalCapacity.yearlyCapacities) {
      const yearData = state.personalCapacity.yearlyCapacities[selectedYear];
      if (yearData) {
        setDistributionMode(yearData.distributionMode);
        setTotalYearlyHours(yearData.totalYearlyHours?.toString() || '');
        
        const newMonthlyHours: { [month: number]: string } = {};
        for (let month = 1; month <= 12; month++) {
          const monthData = yearData.monthlyCapacities[month];
          newMonthlyHours[month] = monthData?.plannedHours?.toString() || '0';
        }
        setMonthlyHours(newMonthlyHours);
      } else {
        // Reset for new year
        setDistributionMode('manual');
        setTotalYearlyHours('');
        const newMonthlyHours: { [month: number]: string } = {};
        for (let month = 1; month <= 12; month++) {
          newMonthlyHours[month] = '0';
        }
        setMonthlyHours(newMonthlyHours);
      }
      setHasChanges(false);
    }
  }, [isOpen, selectedYear, state.personalCapacity]);
  
  // Calculate total from monthly hours
  const calculatedTotal = useMemo(() => {
    return Object.values(monthlyHours).reduce((sum, hours) => {
      return sum + (parseFloat(hours) || 0);
    }, 0);
  }, [monthlyHours]);
  
  // Handle yearly hours input and equal distribution
  const handleYearlyHoursChange = (value: string) => {
    setTotalYearlyHours(value);
    setHasChanges(true);
    
    if (distributionMode === 'equal' && value) {
      const totalHours = parseFloat(value) || 0;
      const baseHoursPerMonth = Math.floor((totalHours / 12) * 10) / 10; // Round to 1 decimal
      const remainder = Math.round((totalHours - (baseHoursPerMonth * 12)) * 10) / 10;
      
      const newMonthlyHours: { [month: number]: string } = {};
      for (let month = 1; month <= 12; month++) {
        const monthHours = month === 1 ? baseHoursPerMonth + remainder : baseHoursPerMonth;
        newMonthlyHours[month] = monthHours.toString();
      }
      setMonthlyHours(newMonthlyHours);
    }
  };
  
  // Handle distribution mode change
  const handleDistributionModeChange = (mode: 'manual' | 'equal') => {
    setDistributionMode(mode);
    setHasChanges(true);
    
    if (mode === 'equal' && totalYearlyHours) {
      handleYearlyHoursChange(totalYearlyHours);
    }
  };
  
  // Handle monthly hours change
  const handleMonthlyHoursChange = (month: number, value: string) => {
    setMonthlyHours(prev => ({
      ...prev,
      [month]: value
    }));
    setHasChanges(true);
  };
  
  // Save capacity data
  const handleSave = () => {
    const yearlyCapacity: YearlyCapacity = {
      distributionMode,
      totalYearlyHours: distributionMode === 'equal' ? parseFloat(totalYearlyHours) || 0 : undefined,
      monthlyCapacities: {}
    };
    
    // Convert monthly hours to MonthlyCapacity objects
    for (let month = 1; month <= 12; month++) {
      const plannedHours = parseFloat(monthlyHours[month]) || 0;
      yearlyCapacity.monthlyCapacities[month] = { plannedHours };
    }
    
    const personalCapacity: PersonalCapacity = {
      ...state.personalCapacity,
      yearlyCapacities: {
        ...state.personalCapacity?.yearlyCapacities,
        [selectedYear]: yearlyCapacity
      },
      updatedAt: new Date().toISOString()
    };
    
    dispatch({ type: 'UPDATE_PERSONAL_CAPACITY', payload: personalCapacity });
    setHasChanges(false);
    onClose();
  };
  
  // Reset changes
  const handleReset = () => {
    const yearData = state.personalCapacity?.yearlyCapacities[selectedYear];
    if (yearData) {
      setDistributionMode(yearData.distributionMode);
      setTotalYearlyHours(yearData.totalYearlyHours?.toString() || '');
      
      const newMonthlyHours: { [month: number]: string } = {};
      for (let month = 1; month <= 12; month++) {
        const monthData = yearData.monthlyCapacities[month];
        newMonthlyHours[month] = monthData?.plannedHours?.toString() || '0';
      }
      setMonthlyHours(newMonthlyHours);
    }
    setHasChanges(false);
  };
  
  if (!isOpen) return null;
  
  const monthNames = i18n.language === 'de' 
    ? ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
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
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: accentColor }}>
                {t('capacity.personal_capacity_planning')}
              </h2>
              <p className="text-xs opacity-70" style={{ color: accentColor }}>
                {t('capacity.plan_working_hours')}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all hover:scale-105"
            style={{ 
              backgroundColor: `${accentColor}10`,
              color: accentColor
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Year Selection */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setSelectedYear(selectedYear - 1)}
                className="p-1.5 rounded-lg transition-all hover:scale-105"
                style={{ 
                  backgroundColor: `${accentColor}15`,
                  color: accentColor
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div 
                className="px-4 py-2 rounded-lg font-bold text-lg"
                style={{ 
                  backgroundColor: accentColor,
                  color: 'white'
                }}
              >
                {selectedYear}
              </div>
              
              <button
                onClick={() => setSelectedYear(selectedYear + 1)}
                className="p-1.5 rounded-lg transition-all hover:scale-105"
                style={{ 
                  backgroundColor: `${accentColor}15`,
                  color: accentColor
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Distribution Mode */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleDistributionModeChange('manual')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  distributionMode === 'manual' ? 'text-white' : 'opacity-60'
                }`}
                style={{
                  backgroundColor: distributionMode === 'manual' ? accentColor : `${accentColor}20`,
                  color: distributionMode === 'manual' ? 'white' : accentColor
                }}
              >
                Manual
              </button>
              <button
                onClick={() => handleDistributionModeChange('equal')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  distributionMode === 'equal' ? 'text-white' : 'opacity-60'
                }`}
                style={{
                  backgroundColor: distributionMode === 'equal' ? accentColor : `${accentColor}20`,
                  color: distributionMode === 'equal' ? 'white' : accentColor
                }}
              >
                Equal
              </button>
            </div>

            {/* Yearly Hours Input */}
            {distributionMode === 'equal' && (
              <input
                type="number"
                value={totalYearlyHours}
                onChange={(e) => handleYearlyHoursChange(e.target.value)}
                placeholder="Total Yearly Hours"
                className="w-full px-3 py-2 rounded-lg text-center font-medium focus:outline-none transition-all"
                style={{ 
                  backgroundColor: `${accentColor}10`,
                  color: accentColor,
                  border: `2px solid ${accentColor}30`
                }}
              />
            )}

            {/* Monthly Hours Grid */}
            <div>
              <div 
                className="text-center text-sm font-medium mb-3 py-1 rounded-lg"
                style={{ 
                  backgroundColor: `${accentColor}10`,
                  color: accentColor
                }}
              >
                Total: {calculatedTotal.toFixed(0)}h
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }, (_, index) => {
                  const month = index + 1;
                  const isCurrentMonth = month === new Date().getMonth() + 1 && selectedYear === currentYear;
                  const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  
                  return (
                    <div key={month} className="text-center">
                      <div 
                        className={`text-xs font-medium mb-1 ${isCurrentMonth ? 'font-bold' : ''}`}
                        style={{ 
                          color: isCurrentMonth ? accentColor : `${accentColor}80`
                        }}
                      >
                        {shortMonthNames[index]}
                        {isCurrentMonth && ' •'}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={monthlyHours[month] || '0'}
                        onChange={(e) => handleMonthlyHoursChange(month, e.target.value)}
                        disabled={distributionMode === 'equal'}
                        className={`w-full px-2 py-1.5 text-xs text-center rounded-lg focus:outline-none transition-all ${
                          isCurrentMonth ? 'font-bold current-month-input' : ''
                        }`}
                        style={{ 
                          backgroundColor: isCurrentMonth ? accentColor : `${accentColor}15`,
                          color: isCurrentMonth ? 'white !important' : accentColor,
                          border: `1px solid ${accentColor}30`,
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
        </div>

        {/* Footer */}
        <div className="p-3 border-t" style={{ borderColor: `${accentColor}20` }}>
          <div className="flex justify-center space-x-2">
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="px-3 py-1.5 text-xs rounded-lg transition-all disabled:opacity-30 flex items-center space-x-1"
              style={{ 
                backgroundColor: `${accentColor}15`,
                color: accentColor
              }}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
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
              disabled={!hasChanges}
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
