import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Zap, BarChart3, Target, Clock } from 'lucide-react';

interface LandingPageProps {
  onGuestLogin: () => void;
}

export function LandingPage({ onGuestLogin }: LandingPageProps) {
  const [scrollY, setScrollY] = React.useState(0);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleStartApp = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      onGuestLogin();
    }, 1200);
  };

  return (
    <div 
      className={`transition-all duration-1200 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      style={{
        transform: isTransitioning ? 'scale(1.02)' : 'scale(1)',
        filter: isTransitioning ? 'blur(8px)' : 'blur(0)'
      }}
    >
      {/* Dynamic background that transitions to dark */}
      <div 
        className={`min-h-screen bg-gradient-to-b transition-all duration-1200 ${
          isTransitioning 
            ? 'from-gray-950 via-gray-900 to-gray-950 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950'
            : 'from-white via-slate-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950'
        }`}
      >
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
          {/* Animated background elements - transition to orange/dark */}
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className={`absolute top-20 left-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse transition-all duration-1200 ${
                isTransitioning 
                  ? 'bg-orange-600' 
                  : 'bg-orange-300'
              }`}
            ></div>
            <div 
              className={`absolute top-40 right-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-2000 transition-all duration-1200 ${
                isTransitioning 
                  ? 'bg-orange-700' 
                  : 'bg-amber-300'
              }`}
            ></div>
          </div>

          <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Left: Fox Image - Glow intensifies on transition */}
            <div className="flex justify-center">
              <div className="relative group">
                {/* Glow effect - intensifies during transition */}
                <div 
                  className={`absolute -inset-12 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-all duration-1200 ${
                    isTransitioning
                      ? 'opacity-50 bg-gradient-to-r from-orange-500 to-red-500'
                      : 'bg-gradient-to-r from-orange-400 to-amber-400'
                  }`}
                ></div>
                
                {/* Fox Image */}
                <div className="relative">
                  <img
                    src="/3d_fox.png"
                    alt="TaskFuchs"
                    className="w-96 h-96 object-contain drop-shadow-2xl transition-all duration-1200"
                    style={{
                      transform: `translateY(${scrollY * 0.3}px) ${isTransitioning ? 'scale(1.05)' : 'scale(1)'}`,
                      transition: 'transform 0.1s ease-out, filter 1.2s ease',
                      filter: isTransitioning 
                        ? 'drop-shadow(0 30px 80px rgba(251, 146, 60, 0.5))' 
                        : 'drop-shadow(0 20px 60px rgba(251, 146, 60, 0.3))'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Content - Text color transitions */}
            <div className="space-y-16 flex flex-col justify-center">
              <h1 className={`text-9xl lg:text-10xl font-black tracking-tighter leading-none transition-all duration-1200 ${
                isTransitioning ? 'text-gray-100' : 'text-orange-500'
              }`}
              style={{
                animation: 'fadeInDown 0.8s ease-out 0.1s both'
              }}>
                TaskFuchs
              </h1>
              <p className={`text-xl md:text-2xl font-light transition-all duration-1200 ${
                isTransitioning ? 'text-gray-300' : 'text-gray-600 dark:text-gray-300'
              }`}
              style={{
                animation: 'fadeInUp 0.8s ease-out 0.3s both'
              }}>
                {t('landing_page.tagline')}
              </p>

              {/* Features - Icons transition color */}
              <div className="space-y-5" style={{
                animation: 'fadeInUp 0.8s ease-out 0.5s both'
              }}>
                {[
                  { icon: Zap, title: t('landing_page.features.smart_parsing.title'), desc: t('landing_page.features.smart_parsing.desc') },
                  { icon: BarChart3, title: t('landing_page.features.analytics.title'), desc: t('landing_page.features.analytics.desc') },
                  { icon: Target, title: t('landing_page.features.focus.title'), desc: t('landing_page.features.focus.desc') },
                  { icon: Clock, title: t('landing_page.features.timer.title'), desc: t('landing_page.features.timer.desc') }
                ].map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-start space-x-4 p-4 rounded-xl transition-all duration-1200 ${
                        isTransitioning
                          ? 'bg-gray-800/40 border-gray-700/40'
                          : 'bg-white/40 dark:bg-gray-800/40 border-white/20 dark:border-gray-700/20'
                      } backdrop-blur-md hover:shadow-lg border`}
                    >
                      <Icon className={`w-7 h-7 mt-0.5 flex-shrink-0 transition-all duration-1200 ${
                        isTransitioning ? 'text-orange-400' : 'text-orange-500'
                      }`} />
                      <div>
                        <p className={`font-semibold text-lg transition-all duration-1200 ${
                          isTransitioning 
                            ? 'text-gray-100' 
                            : 'text-gray-900 dark:text-white'
                        }`}>{feature.title}</p>
                        <p className={`text-sm transition-all duration-1200 ${
                          isTransitioning 
                            ? 'text-gray-400' 
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>{feature.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CTA Button - Centered and prominent */}
              <div style={{
                animation: 'fadeInUp 0.8s ease-out 0.6s both',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <button
                  onClick={handleStartApp}
                  disabled={isTransitioning}
                  className={`px-12 py-5 text-white font-bold text-lg rounded-xl transition-all duration-300 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${
                    isTransitioning
                      ? 'bg-orange-600'
                      : 'bg-orange-500 hover:bg-orange-600 hover:scale-110 shadow-lg hover:shadow-orange-500/50'
                  }`}
                  style={!isTransitioning ? {
                    animation: 'pulseGlow 2s ease-in-out infinite'
                  } : {}}
                >
                  {t('landing_page.start_app')}
                  <ChevronDown className={`w-5 h-5 transition-transform ${isTransitioning ? 'scale-0' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Scroll indicator - Fades out on transition */}
          <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce transition-opacity duration-1200 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}>
            <ChevronDown className="w-6 h-6 text-gray-400" />
          </div>
        </section>

        {/* Features Section */}
        <section className={`py-24 px-4 transition-all duration-1200 ${
          isTransitioning
            ? 'bg-gradient-to-b from-gray-900/50 to-transparent'
            : 'bg-gradient-to-b from-orange-50/50 to-transparent dark:from-orange-950/20 dark:to-transparent'
        }`}>
          <div className="max-w-6xl mx-auto">
            <h2 className={`text-5xl font-bold text-center mb-20 transition-all duration-1200 ${
              isTransitioning 
                ? 'text-gray-100' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {t('landing_page.why_section')} <span className={`transition-all duration-1200 ${
                isTransitioning ? 'text-orange-400' : 'text-orange-500'
              }`}>TaskFuchs</span>?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                {
                  title: 'Intuitiv',
                  desc: 'Intelligentes Interface das sich deinem Workflow anpasst',
                  color: 'from-orange-500 to-amber-500'
                },
                {
                  title: 'Produktiv',
                  desc: 'Fokussierte Tools die wirklich helfen, mehr zu schaffen',
                  color: 'from-orange-400 to-orange-600'
                },
                {
                  title: 'Privat',
                  desc: 'Deine Daten gehören dir - keine Tracker, kein Tracking',
                  color: 'from-amber-500 to-orange-500'
                }
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className={`p-10 rounded-2xl transition-all duration-1200 ${
                    isTransitioning
                      ? 'bg-gray-800/50 border-gray-700/50'
                      : 'bg-white dark:bg-gray-800 border-orange-100 dark:border-orange-900/30'
                  } border hover:shadow-xl group`}
                >
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.color} mb-6 group-hover:scale-110 transition-transform shadow-lg`}></div>
                  <h3 className={`text-2xl font-bold mb-3 transition-all duration-1200 ${
                    isTransitioning 
                      ? 'text-gray-100' 
                      : 'text-gray-900 dark:text-white'
                  }`}>{feature.title}</h3>
                  <p className={`text-lg transition-all duration-1200 ${
                    isTransitioning 
                      ? 'text-gray-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={`py-24 px-4 transition-all duration-1200 ${
          isTransitioning
            ? 'bg-gradient-to-r from-gray-900 to-gray-950'
            : 'bg-gradient-to-r from-orange-500/5 to-amber-500/5 dark:from-orange-950/20 dark:to-amber-950/20'
        }`}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className={`text-4xl font-bold mb-6 transition-all duration-1200 ${
              isTransitioning 
                ? 'text-gray-100' 
                : 'text-gray-900 dark:text-white'
            }`}>
              Bereit für bessere <span className={`transition-all duration-1200 ${
                isTransitioning ? 'text-orange-400' : 'text-orange-500'
              }`}>Produktivität</span>?
            </h2>
            <p className={`text-xl mb-10 leading-relaxed transition-all duration-1200 ${
              isTransitioning 
                ? 'text-gray-400' 
                : 'text-gray-600 dark:text-gray-300'
            }`}>
              Starte jetzt kostenlos – kein Signup nötig
            </p>
            <button
              onClick={handleStartApp}
              disabled={isTransitioning}
              className={`px-14 py-5 text-white font-bold text-xl rounded-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 disabled:opacity-75 disabled:cursor-not-allowed inline-flex items-center ${
                isTransitioning
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              App Öffnen
              <span className="ml-3">→</span>
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className={`py-16 px-4 transition-all duration-1200 ${
          isTransitioning 
            ? 'border-gray-800 bg-gray-900/50' 
            : 'border-gray-200 dark:border-gray-800'
        } border-t`}>
          <div className={`max-w-6xl mx-auto text-center text-sm transition-all duration-1200 ${
            isTransitioning 
              ? 'text-gray-500' 
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            <p>TaskFuchs © 2025 | Open Source | Privacy First</p>
          </div>
        </footer>

        <style>{`
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.1; }
            50% { opacity: 0.2; }
          }
          .animate-pulse { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          .animation-delay-2000 { animation-delay: 2s; }
        `}</style>
      </div>
    </div>
  );
}