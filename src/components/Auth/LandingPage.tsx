import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Zap, BarChart3, Target, Clock } from 'lucide-react';

interface LandingPageProps {
  onGuestLogin: () => void;
}

export function LandingPage({ onGuestLogin }: LandingPageProps) {
  const [scrollY, setScrollY] = React.useState(0);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [hoveredFox, setHoveredFox] = React.useState(false);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Detect browser language on mount
  React.useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'de' || browserLang === 'en') {
      if (i18n.language !== browserLang) {
        i18n.changeLanguage(browserLang);
      }
    }
  }, [i18n]);

  const handleStartApp = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      onGuestLogin();
    }, 500);
  };

  return (
        <div
      className={`transition-all duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
          style={{
        transform: isTransitioning ? 'scale(1.02)' : 'scale(1)',
        filter: isTransitioning ? 'blur(8px)' : 'blur(0)'
      }}
    >
      {/* Dynamic background that transitions to dark */}
      <div 
        className={`min-h-screen bg-gradient-to-b transition-all duration-500 ${
          isTransitioning 
            ? 'from-gray-950 via-gray-900 to-gray-950 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950'
            : 'from-white via-slate-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950'
        }`}
      >
        {/* Language Selector - Mobile optimiert */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20 flex gap-2">
          <button
            onClick={() => i18n.changeLanguage('de')}
            className={`px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-medium transition-all duration-300 ${
              i18n.language === 'de'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white/20 dark:bg-gray-800/20 text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-800/30 backdrop-blur-sm'
            }`}
          >
            DE
          </button>
          <button
            onClick={() => i18n.changeLanguage('en')}
            className={`px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-medium transition-all duration-300 ${
              i18n.language === 'en'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white/20 dark:bg-gray-800/20 text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-800/30 backdrop-blur-sm'
            }`}
          >
            EN
          </button>
        </div>

        {/* Hero Section - Mobile optimiert */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
          {/* Animated background elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className={`absolute top-20 left-5 md:left-10 w-48 md:w-72 h-48 md:h-72 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse transition-all duration-500 ${
                isTransitioning 
                  ? 'bg-orange-600' 
                  : 'bg-orange-300'
              }`}
            ></div>
            <div 
              className={`absolute top-40 right-5 md:right-10 w-48 md:w-72 h-48 md:h-72 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-2000 transition-all duration-500 ${
                isTransitioning 
                  ? 'bg-orange-700' 
                  : 'bg-amber-300'
              }`}
            ></div>
      </div>

          <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
            {/* Fox Image - Mobile optimiert */}
            <div className="flex justify-center order-1 md:order-none">
              <div className="relative group">
                {/* Glow effect */}
                <div 
                  className={`absolute -inset-8 md:-inset-12 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-all duration-500 ${
                    isTransitioning
                      ? 'opacity-50 bg-gradient-to-r from-orange-500 to-red-500'
                      : 'bg-gradient-to-r from-orange-400 to-amber-400'
                  }`}
                ></div>
                
                {/* Fox Image */}
                <div 
                  className="relative cursor-pointer"
                  onMouseEnter={() => setHoveredFox(true)}
                  onMouseLeave={() => setHoveredFox(false)}
                  onClick={() => setHoveredFox(!hoveredFox)}
                >
                  <img
                    src="/3d_fox.png"
            alt="TaskFuchs"
                    className="w-48 h-48 md:w-80 md:h-80 lg:w-96 lg:h-96 object-contain drop-shadow-2xl transition-all duration-500"
                    style={{
                      transform: `translateY(${scrollY * 0.3}px) ${isTransitioning ? 'scale(1.05)' : 'scale(1)'} ${hoveredFox && !isTransitioning ? 'rotateZ(5deg)' : 'rotateZ(0deg)'}`,
                      transition: 'transform 0.1s ease-out, filter 1.2s ease',
                      filter: isTransitioning 
                        ? 'drop-shadow(0 30px 80px rgba(251, 146, 60, 0.5))' 
                        : 'drop-shadow(0 20px 60px rgba(251, 146, 60, 0.3))',
                      animation: hoveredFox && !isTransitioning ? 'wagTail 0.6s ease-in-out infinite' : 'none',
                      transformOrigin: 'center center'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Content - Mobile optimiert */}
            <div className="space-y-6 md:space-y-12 flex flex-col justify-center order-2 md:order-none">
              {/* Headline - Responsive Schriftgrößen */}
              <h1 className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-none transition-all duration-500 text-center md:text-left ${
                isTransitioning ? 'text-gray-100' : 'text-orange-500'
              }`}
              style={{
                animation: 'fadeInDown 0.8s ease-out 0.1s both'
              }}>
                TaskFuchs
              </h1>

              {/* Tagline - Responsive Schriftgrößen */}
              <p className={`text-base sm:text-lg md:text-xl lg:text-2xl font-light transition-all duration-500 text-center md:text-left ${
                isTransitioning ? 'text-gray-300' : 'text-gray-600 dark:text-gray-300'
              }`}
              style={{
                animation: 'fadeInUp 0.8s ease-out 0.3s both'
              }}>
                {t('landing_page.tagline')}
              </p>

              {/* Features - Mobile optimiert */}
              <div className="space-y-3 md:space-y-5" style={{
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
                      className={`flex items-start space-x-3 md:space-x-4 p-3 md:p-4 rounded-xl transition-all duration-500 ${
                        isTransitioning
                          ? 'bg-gray-800/40 border-gray-700/40'
                          : 'bg-white/40 dark:bg-gray-800/40 border-white/20 dark:border-gray-700/20'
                      } backdrop-blur-md hover:shadow-lg border`}
                    >
                      <Icon className={`w-5 h-5 md:w-7 md:h-7 mt-0.5 flex-shrink-0 transition-all duration-500 ${
                        isTransitioning ? 'text-orange-400' : 'text-orange-500'
                      }`} />
                      <div>
                        <p className={`font-semibold text-sm md:text-lg transition-all duration-500 ${
                          isTransitioning 
                            ? 'text-gray-100' 
                            : 'text-gray-900 dark:text-white'
                        }`}>{feature.title}</p>
                        <p className={`text-xs md:text-sm transition-all duration-500 ${
                          isTransitioning 
                            ? 'text-gray-400' 
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>{feature.desc}</p>
                      </div>
                    </div>
                  );
                })}
        </div>

              {/* CTA Button - Mobile optimiert */}
              <div style={{
                animation: 'fadeInUp 0.8s ease-out 0.6s both',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <button
                  onClick={handleStartApp}
                  disabled={isTransitioning}
                  className={`px-8 md:px-12 py-4 md:py-5 text-white font-bold text-base md:text-lg rounded-xl transition-all duration-300 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 md:gap-3 w-full md:w-auto ${
                    isTransitioning
                      ? 'bg-orange-600'
                      : 'bg-orange-500 hover:bg-orange-600 hover:scale-110 shadow-lg hover:shadow-orange-500/50'
                  }`}
                  style={!isTransitioning ? {
                    animation: 'pulseGlow 2s ease-in-out infinite'
                  } : {}}
                >
                  {t('landing_page.start_app')}
                  <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 transition-transform ${isTransitioning ? 'scale-0' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Scroll indicator - Nur auf Desktop */}
          <div className={`hidden md:block absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce transition-opacity duration-500 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}>
            <ChevronDown className="w-6 h-6 text-gray-400" />
        </div>
        </section>

        {/* Features Section - Mobile optimiert */}
        <section className={`py-12 md:py-24 px-4 transition-all duration-500 ${
          isTransitioning
            ? 'bg-gradient-to-b from-gray-900/50 to-transparent'
            : 'bg-gradient-to-b from-orange-50/50 to-transparent dark:from-orange-950/20 dark:to-transparent'
        }`}>
          <div className="max-w-6xl mx-auto">
            <h2 className={`text-3xl md:text-5xl font-bold text-center mb-12 md:mb-20 transition-all duration-500 ${
              isTransitioning 
                ? 'text-gray-100' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {t('landing_page.why_section')} <span className={`transition-all duration-500 ${
                isTransitioning ? 'text-orange-400' : 'text-orange-500'
              }`}>TaskFuchs</span>?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
              {[
                {
                  title: 'Intuitiv',
                  desc: 'Intelligentes Interface das sich deinem Workflow anpasst',
                  color: 'from-orange-500 to-amber-500'
                },
                {
                  title: 'Leistungsstark',
                  desc: 'Fortschrittliche Features für maximale Produktivität',
                  color: 'from-amber-500 to-yellow-500'
                },
                {
                  title: 'Privat',
                  desc: 'Deine Daten bleiben bei dir – lokal und sicher',
                  color: 'from-yellow-500 to-orange-500'
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`p-6 md:p-8 rounded-2xl transition-all duration-500 border ${
                    isTransitioning
                      ? 'bg-gray-800/40 border-gray-700/40'
                      : 'bg-white/60 dark:bg-gray-800/60 border-white/20 dark:border-gray-700/20'
                  } backdrop-blur-md hover:shadow-xl hover:scale-105`}
                >
                  <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 md:mb-6 transition-all duration-500`}>
                    <span className="text-xl md:text-3xl">✨</span>
                  </div>
                  <h3 className={`text-xl md:text-2xl font-bold mb-2 md:mb-3 transition-all duration-500 ${
                    isTransitioning ? 'text-gray-100' : 'text-gray-900 dark:text-white'
                  }`}>
                    {item.title}
                  </h3>
                  <p className={`text-sm md:text-base transition-all duration-500 ${
                    isTransitioning ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer - Mobile optimiert */}
        <footer className={`py-8 md:py-12 px-4 text-center transition-all duration-500 ${
          isTransitioning ? 'text-gray-400' : 'text-gray-500 dark:text-gray-500'
        }`}>
          <div className="max-w-6xl mx-auto">
            <p className="text-xs md:text-sm">© 2025 TaskFuchs. {t('landing_page.all_rights_reserved')}</p>
          </div>
        </footer>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(251, 146, 60, 0.4);
          }
          50% {
            box-shadow: 0 0 40px rgba(251, 146, 60, 0.6);
          }
        }

        @keyframes wagTail {
          0%, 100% { transform: rotateZ(0deg); }
          25% { transform: rotateZ(5deg); }
          75% { transform: rotateZ(-5deg); }
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
