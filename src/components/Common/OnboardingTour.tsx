import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, ArrowLeft, Check, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../context/AppContext';
import { getOnboardingImagePath } from '../../utils/imageUtils';

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  foxMessage: string;
  foxImageIndex: number;
  features?: string[];
  demoAction?: () => void;
  skipable?: boolean;
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingTour({ isOpen, onClose }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [foxAnimating, setFoxAnimating] = useState(false);
  const [countdown, setCountdown] = useState(8);
  const [isSliding, setIsSliding] = useState(false);
  const { dispatch, state } = useApp();
  const { t } = useTranslation();

  // Helper function to get the correct path for both web and Electron
  const getBackgroundImagePath = () => {
    // Use relative path which should work in both environments
    // Vite copies the file to dist/, so this should resolve correctly
    return 'onboarding.jpg';
  };

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: t('onboarding.welcome.title'),
      subtitle: t('onboarding.welcome.subtitle'),
      description: t('onboarding.welcome.description'),
      foxMessage: t('onboarding.welcome.fox_message'),
      foxImageIndex: 1,
      features: t('onboarding.welcome.features', { returnObjects: true }) as string[]
    },
    {
      id: 'today-dashboard',
      title: t('onboarding.today_dashboard.title'),
      subtitle: t('onboarding.today_dashboard.subtitle'),
      description: t('onboarding.today_dashboard.description'),
      foxMessage: t('onboarding.today_dashboard.fox_message'),
      foxImageIndex: 2,
      features: t('onboarding.today_dashboard.features', { returnObjects: true }) as string[]
    },
    {
      id: 'inbox',
      title: t('onboarding.inbox.title'),
      subtitle: t('onboarding.inbox.subtitle'),
      description: t('onboarding.inbox.description'),
      foxMessage: t('onboarding.inbox.fox_message'),
      foxImageIndex: 3,
      features: t('onboarding.inbox.features', { returnObjects: true }) as string[]
    },
    {
      id: 'tasks',
      title: t('onboarding.tasks.title'),
      subtitle: t('onboarding.tasks.subtitle'),
      description: t('onboarding.tasks.description'),
      foxMessage: t('onboarding.tasks.fox_message'),
      foxImageIndex: 4,
      features: t('onboarding.tasks.features', { returnObjects: true }) as string[]
    },
    {
      id: 'kanban',
      title: t('onboarding.kanban.title'),
      subtitle: t('onboarding.kanban.subtitle'),
      description: t('onboarding.kanban.description'),
      foxMessage: t('onboarding.kanban.fox_message'),
      foxImageIndex: 1,
      features: t('onboarding.kanban.features', { returnObjects: true }) as string[]
    },
    {
      id: 'notes',
      title: t('onboarding.notes.title'),
      subtitle: t('onboarding.notes.subtitle'),
      description: t('onboarding.notes.description'),
      foxMessage: t('onboarding.notes.fox_message'),
      foxImageIndex: 2,
      features: t('onboarding.notes.features', { returnObjects: true }) as string[]
    },
    {
      id: 'focus',
      title: t('onboarding.focus.title'),
      subtitle: t('onboarding.focus.subtitle'),
      description: t('onboarding.focus.description'),
      foxMessage: t('onboarding.focus.fox_message'),
      foxImageIndex: 3,
      features: t('onboarding.focus.features', { returnObjects: true }) as string[]
    },
    {
      id: 'series',
      title: t('onboarding.series.title'),
      subtitle: t('onboarding.series.subtitle'),
      description: t('onboarding.series.description'),
      foxMessage: t('onboarding.series.fox_message'),
      foxImageIndex: 4,
      features: t('onboarding.series.features', { returnObjects: true }) as string[]
    },
    {
      id: 'review',
      title: t('onboarding.review.title'),
      subtitle: t('onboarding.review.subtitle'),
      description: t('onboarding.review.description'),
      foxMessage: t('onboarding.review.fox_message'),
      foxImageIndex: 1,
      features: t('onboarding.review.features', { returnObjects: true }) as string[]
    },
    {
      id: 'timer',
      title: t('onboarding.timer.title'),
      subtitle: t('onboarding.timer.subtitle'),
      description: t('onboarding.timer.description'),
      foxMessage: t('onboarding.timer.fox_message'),
      foxImageIndex: 2,
      features: t('onboarding.timer.features', { returnObjects: true }) as string[]
    },
    {
      id: 'statistics',
      title: t('onboarding.statistics.title'),
      subtitle: t('onboarding.statistics.subtitle'),
      description: t('onboarding.statistics.description'),
      foxMessage: t('onboarding.statistics.fox_message'),
      foxImageIndex: 3,
      features: t('onboarding.statistics.features', { returnObjects: true }) as string[]
    },
    {
      id: 'smart-features',
      title: t('onboarding.smart_features.title'),
      subtitle: t('onboarding.smart_features.subtitle'),
      description: t('onboarding.smart_features.description'),
      foxMessage: t('onboarding.smart_features.fox_message'),
      foxImageIndex: 4,
      features: t('onboarding.smart_features.features', { returnObjects: true }) as string[]
    },
    {
      id: 'customization',
      title: t('onboarding.customization.title'),
      subtitle: t('onboarding.customization.subtitle'),
      description: t('onboarding.customization.description'),
      foxMessage: t('onboarding.customization.fox_message'),
      foxImageIndex: 1,
      features: t('onboarding.customization.features', { returnObjects: true }) as string[]
    },
    {
      id: 'ready',
      title: t('onboarding.ready.title'),
      subtitle: t('onboarding.ready.subtitle'),
      description: t('onboarding.ready.description'),
      foxMessage: t('onboarding.ready.fox_message'),
      foxImageIndex: 2,
      features: t('onboarding.ready.features', { returnObjects: true }) as string[]
    }
  ];

  const nextStep = () => {
    if (isSliding) return;
    
    setFoxAnimating(true);
    setIsSliding(true);
    
    setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        completeOnboarding();
      }
      setIsSliding(false);
      setFoxAnimating(false);
    }, 400);
  };

  const prevStep = () => {
    if (isSliding) return;
    
    setFoxAnimating(true);
    setIsSliding(true);
    
    setTimeout(() => {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
      }
      setIsSliding(false);
      setFoxAnimating(false);
    }, 400);
  };

  const completeOnboarding = () => {
    setIsCompleted(true);
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { hasCompletedOnboarding: true } 
    });
    try { localStorage.setItem('taskfuchs-onboarding-complete', 'true'); } catch {}
    // Start 8-second countdown
    setCountdown(8);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const skipTour = () => {
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { hasCompletedOnboarding: true } 
    });
    try { localStorage.setItem('taskfuchs-onboarding-complete', 'true'); } catch {}
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTour();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  const getFoxImage = (imageIndex: number) => {
    return getOnboardingImagePath(imageIndex);
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];

  if (isCompleted) {
    return createPortal(
      <div className="fixed inset-0 flex items-center justify-center z-[999999]" 
           style={{ 
             isolation: 'isolate',
             backgroundImage: `url(${getBackgroundImagePath()})`,
             backgroundSize: 'cover',
             backgroundPosition: 'center',
             backgroundRepeat: 'no-repeat',
             backgroundAttachment: 'fixed'
           }}>
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" style={{ zIndex: -1 }} />
        
        <div className="backdrop-blur-3xl rounded-3xl p-8 max-w-md mx-4 text-center shadow-2xl border border-white/25 dark:border-gray-700/20 transform"
             style={{
               background: 'linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))',
               boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
             }}>
          <div className="relative mb-6">
            <div className="w-24 h-24 mx-auto mb-4 transform animate-pulse">
              <img 
                src={getFoxImage(1)} 
                alt="TaskFuchs" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-ping">
              <Check className="w-5 h-5 text-white" />
            </div>
          </div>
          
          <h3 className="text-3xl font-bold text-white mb-3" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>
            Fantastisch!
          </h3>
          
          <p className="text-lg text-white mb-4" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
            Du bist jetzt bereit für eine produktive Reise mit TaskFuchs!
          </p>
          
          <div className="backdrop-blur-xl border border-orange-200/25 dark:border-orange-700/20 p-4 rounded-xl mb-6"
               style={{
                 background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(251, 191, 36, 0.08))',
                 boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)'
               }}>
            <p className="text-sm text-white italic" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
              Denk daran: Nutze natürliche Sprache für Aufgaben und entdecke alle Funktionen!
            </p>
          </div>
          
          <div className="flex justify-center space-x-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className="w-6 h-6 text-yellow-400 fill-current animate-pulse" 
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>

          {/* Countdown Display */}
          <div className="text-center">
            <p className="text-sm text-white/80" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
              {t('onboarding.completion.close_automatically')} {countdown} {t('onboarding.navigation.seconds')}...
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-3 py-1 text-sm text-white hover:text-white backdrop-blur-xl rounded-lg border border-orange-200/25 transition-all duration-300 cursor-pointer"
              style={{
                background: 'linear-gradient(145deg, rgba(251, 146, 60, 0.1), rgba(251, 146, 60, 0.05))',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(251, 146, 60, 0.15), rgba(251, 146, 60, 0.08))';
                e.currentTarget.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(251, 146, 60, 0.1), rgba(251, 146, 60, 0.05))';
                e.currentTarget.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
              }}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center z-[999999] p-4"
      style={{ 
        isolation: 'isolate',
        backgroundImage: `url(${getBackgroundImagePath()})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
      onClick={onClose}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" style={{ zIndex: -1 }} />
      
      <div 
        className="bg-white/20 dark:bg-gray-800/25 backdrop-blur-3xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-600/25 max-w-4xl w-full overflow-hidden relative my-auto"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          height: '420px',
          minHeight: '420px',
          maxHeight: '420px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - positioned absolutely in top right corner */}
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={skipTour}
            className="p-1.5 text-white hover:text-white transition-all duration-300 hover:bg-white/20 backdrop-blur-xl rounded-lg border border-white/25 hover:border-white/40"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row h-full relative overflow-hidden">
          {/* Band Animation Container */}
          <div className="relative w-full h-full overflow-hidden">
            <div 
              className="flex h-full transition-transform duration-600 ease-in-out"
              style={{
                width: `${steps.length * 100}%`,
                transform: `translateX(-${(currentStep / steps.length) * 100}%)`
              }}
            >
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col md:flex-row h-full flex-shrink-0" style={{ width: `${100 / steps.length}%` }}>
                  {/* Fox Side */}
                  <div className="md:w-1/2 bg-gradient-to-br from-orange-100/20 to-orange-200/25 dark:from-orange-900/15 dark:to-orange-800/20 backdrop-blur-xl p-6 flex flex-col justify-center relative"
                       style={{
                         background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1), rgba(251, 191, 36, 0.08))',
                         borderRight: '1px solid rgba(255, 255, 255, 0.1)'
                       }}>
                    {/* Fox Message Speech Bubble - Compact & Elegant */}
                    <div className="speech-bubble-container max-w-xs mx-auto mb-3">
                      <div className="backdrop-blur-2xl p-4 relative speech-bubble"
                            style={{
                              background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.1))',
                              borderRadius: '16px 16px 16px 4px',
                              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              minHeight: '80px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                        <p className="text-white text-base leading-relaxed font-normal text-center"
                           style={{
                             textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)',
                             fontFamily: "'Just Me Again Down Here', 'Caveat', 'Kalam', 'DynaPuff', 'Comic Sans MS', cursive",
                             fontSize: '22px',
                             fontWeight: '500',
                             textAlign: 'center',
                             letterSpacing: '0.3px'
                           }}>
                          {step.foxMessage}
                        </p>
                      </div>
                    </div>
                    
                    {/* Fox Character - Compact */}
                    <div className={`transform transition-all duration-300 ${foxAnimating && index === currentStep ? 'scale-110 rotate-12' : 'scale-100'}`}>
                      <div className="w-20 h-20 mx-auto">
                        <img 
                          src={getFoxImage(step.foxImageIndex)} 
                          alt="TaskFuchs" 
                          className="w-full h-full object-contain filter drop-shadow-lg"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Content Side */}
                  <div className="md:w-1/2 p-6 flex flex-col">
                    {/* Header */}
                    <div className="mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-white mb-2" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}>
                          {step.title}
                        </h2>
                        <p className="text-sm text-white/90" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                          {step.subtitle}
                        </p>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div className="flex-1 mb-4">
                      <p className="text-white text-sm leading-relaxed mb-3" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                        {step.description}
                      </p>
                      
                      {/* Features List */}
                      {step.features && (
                        <div className="space-y-1.5">
                          {step.features.map((feature, featureIndex) => (
                            <div 
                              key={featureIndex} 
                              className="flex items-center space-x-2 text-white"
                              style={{ animationDelay: `${featureIndex * 0.1}s` }}
                            >
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-orange-400 shadow-lg" />
                              <span className="text-sm" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>{feature}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Navigation */}
                    {index === currentStep && (
                      <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={prevStep}
                          disabled={currentStep === 0}
                          className="flex items-center space-x-1 px-3 py-2 text-white hover:text-white hover:bg-white/20 backdrop-blur-xl rounded-lg border border-white/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                          style={{
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                          }}
                        >
                          <ArrowLeft className="w-3 h-3" />
                            <span className="text-sm">{t('onboarding.navigation.previous')}</span>
                        </button>
                        
                        <button
                          onClick={nextStep}
                          className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 backdrop-blur-xl border border-orange-400/25"
                          style={{
                            background: 'linear-gradient(145deg, rgba(251, 146, 60, 0.8), rgba(234, 88, 12, 0.9))',
                            boxShadow: '0 6px 24px rgba(251, 146, 60, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(145deg, rgba(251, 146, 60, 0.9), rgba(234, 88, 12, 1))';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(145deg, rgba(251, 146, 60, 0.8), rgba(234, 88, 12, 0.9))';
                          }}
                        >
                            <span className="font-medium text-sm">
                            {index === steps.length - 1 ? t('onboarding.navigation.finish') : t('onboarding.navigation.next')}
                          </span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        </div>
                        
                        {/* Step Counter - Between buttons */}
                        <div className="text-center">
                          <p className="text-xs text-white/70" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                            Schritt {index + 1} von {steps.length}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                             ))}
             </div>
           </div>
        </div>
      </div>
    </div>,
    document.body
  );
} 