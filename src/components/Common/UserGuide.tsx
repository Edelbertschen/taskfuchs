import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, CheckSquare, FileText, Calendar, Settings, Kanban, Inbox, BarChart, Archive, Clock, Search, Filter, Tag, Plus, Edit, Eye, Download, Bell, User, Keyboard, Zap, Target, Globe, Palette, Shield, Cloud, Package, Mail, Pin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from 'react-i18next';

interface UserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  content: React.ReactNode;
}

export function UserGuide({ isOpen, onClose }: UserGuideProps) {
  const { state } = useApp();
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('overview');
  
  // Handle ESC key and backdrop clicks
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);
  
  const getAccentColorStyles = () => {
    const accentColor = state.preferences.accentColor;
    return {
      text: { color: accentColor },
      bg: { backgroundColor: accentColor },
      bgLight: { backgroundColor: accentColor + '20' },
      border: { borderColor: accentColor }
    };
  };

  const guideSections: GuideSection[] = [
    {
      id: 'overview',
              title: t('user_guide.sections.overview.title'),
      icon: Target,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {t('user_guide.welcome_title')}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6">
                      {t('user_guide.sections.overview.subtitle')}
        {t('user_guide.sections.overview.description')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <CheckSquare className="w-6 h-6" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.sections.overview.features.tasks.title')}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('user_guide.sections.overview.features.tasks.description')}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <FileText className="w-6 h-6" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.sections.overview.features.notes.title')}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('user_guide.sections.overview.features.notes.description')}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Kanban className="w-6 h-6" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.sections.overview.features.kanban.title')}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('user_guide.sections.overview.features.kanban.description')}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Clock className="w-6 h-6" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.sections.overview.features.timer.title')}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('user_guide.sections.overview.features.timer.description')}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Pin className="w-6 h-6" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.sections.overview.features.pins.title')}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('user_guide.sections.overview.features.pins.description')}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Mail className="w-6 h-6" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.sections.overview.features.emails.title')}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('user_guide.sections.overview.features.emails.description')}
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'tasks',
      title: t('user_guide.tasks.title'),
      icon: CheckSquare,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('user_guide.tasks.title')}</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {t('user_guide.tasks.description')}
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Plus className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.tasks.create_task.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• {t('user_guide.tasks.create_task.option1')}</li>
                <li>• {t('user_guide.tasks.create_task.option2')}</li>
                <li>• {t('user_guide.tasks.create_task.option3')}</li>
                <li>• {t('user_guide.tasks.create_task.option4')}</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Edit className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.tasks.edit_task.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• {t('user_guide.tasks.edit_task.option1')}</li>
                <li>• {t('user_guide.tasks.edit_task.option2')}</li>
                <li>• {t('user_guide.tasks.edit_task.option3')}</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Eye className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.tasks.organize_tasks.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• {t('user_guide.tasks.organize_tasks.option1')}</li>
                <li>• {t('user_guide.tasks.organize_tasks.option2')}</li>
                <li>• {t('user_guide.tasks.organize_tasks.option3')}</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'smart-input',
      title: t('user_guide.smart_input.title'),
      icon: Zap,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">⚡ {t('user_guide.smart_input.title')}</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {t('user_guide.smart_input.description')}
            </p>
          </div>

          <div className="space-y-6">
            {/* Basic Example */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="text-2xl mr-2">📝</span>
                {t('user_guide.smart_input.example.title')}
              </h4>
              <div className="font-mono text-lg p-3 bg-white dark:bg-gray-800 rounded-lg border" style={{ color: state.preferences.accentColor }}>
                {t('user_guide.smart_input.example.input')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {t('user_guide.smart_input.example.result')}
              </div>
            </div>

            {/* Priority Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-4 h-4 rounded-full bg-red-500 mr-3"></span>
                {t('user_guide.smart_input.priorities.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.priorities.low')}</span>
                  <div className="flex space-x-2">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.priorities.low_shortcut')}</kbd>
                    <span className="text-gray-400">{t('user_guide.smart_input.priorities.or')}</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.priorities.low_alt')}</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.priorities.medium')}</span>
                  <div className="flex space-x-2">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.priorities.medium_shortcut')}</kbd>
                    <span className="text-gray-400">{t('user_guide.smart_input.priorities.or')}</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.priorities.medium_alt')}</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.priorities.high')}</span>
                  <div className="flex space-x-2">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.priorities.high_shortcut')}</kbd>
                    <span className="text-gray-400">{t('user_guide.smart_input.priorities.or')}</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.priorities.high_alt')}</kbd>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                {t('user_guide.smart_input.priorities.english_tip')}
              </div>
            </div>

            {/* Tags Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-4 h-4 rounded-full bg-blue-500 mr-3"></span>
                {t('user_guide.smart_input.tags.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.tags.single_tag')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.tags.single_tag_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.tags.multiple_tags')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.tags.multiple_tags_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.tags.popular_tags')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.tags.popular_tags_shortcut')}</kbd>
                </div>
              </div>
              <div className="text-sm text-red-600 dark:text-red-400 mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                {t('user_guide.smart_input.tags.note')}
              </div>
            </div>

            {/* Time Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-4 h-4 rounded-full bg-green-500 mr-3"></span>
                {t('user_guide.smart_input.time.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.time.minutes')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.time.minutes_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.time.hours')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.time.hours_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.time.mixed')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.time.mixed_shortcut')}</kbd>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                {t('user_guide.smart_input.time.english_tip')}
              </div>
            </div>

            {/* Date Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-4 h-4 rounded-full bg-purple-500 mr-3"></span>
                {t('user_guide.smart_input.dates.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.dates.relative_dates')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.dates.relative_dates_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.dates.english')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.dates.english_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.dates.specific_dates')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.dates.specific_dates_shortcut')}</kbd>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                {t('user_guide.smart_input.dates.calendar_assignment')}
              </div>
            </div>

            {/* Column Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-4 h-4 rounded-full bg-orange-500 mr-3"></span>
                {t('user_guide.smart_input.columns.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.columns.inbox')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.columns.inbox_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.columns.today')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.columns.today_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.columns.tomorrow')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.columns.tomorrow_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.columns.backlog')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.columns.backlog_shortcut')}</kbd>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-4 h-4 rounded-full bg-cyan-500 mr-3"></span>
                {t('user_guide.smart_input.descriptions.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.descriptions.add_description')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.descriptions.add_description_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.descriptions.alternative')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.descriptions.alternative_shortcut')}</kbd>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                {t('user_guide.smart_input.descriptions.tip')}
              </div>
            </div>

            {/* Markdown Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-4 h-4 rounded-full bg-pink-500 mr-3"></span>
                {t('user_guide.smart_input.markdown.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.markdown.formatting')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.markdown.formatting_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.markdown.strikethrough')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.markdown.strikethrough_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.markdown.links')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.markdown.links_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.smart_input.markdown.code')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.smart_input.markdown.code_shortcut')}</kbd>
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                {t('user_guide.smart_input.markdown.links_note')}
              </div>
            </div>

            {/* Complex Example */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="text-2xl mr-2">🚀</span>
                {t('user_guide.smart_input.complex_example.title')}
              </h4>
              <div className="font-mono text-lg p-3 bg-white dark:bg-gray-800 rounded-lg border break-all" style={{ color: state.preferences.accentColor }}>
                {t('user_guide.smart_input.complex_example.input')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {t('user_guide.smart_input.complex_example.result')}
              </div>
            </div>

            {/* Pro Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-3 flex items-center">
                <span className="text-2xl mr-2">💡</span>
                {t('user_guide.smart_input.pro_tips.title')}
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                <li>• {t('user_guide.smart_input.pro_tips.order_is_irrelevant')}</li>
                <li>• {t('user_guide.smart_input.pro_tips.space_is_important')}</li>
                <li>• {t('user_guide.smart_input.pro_tips.multiple_tags')}</li>
                <li>• {t('user_guide.smart_input.pro_tips.auto_completion')}</li>
                <li>• {t('user_guide.smart_input.pro_tips.combinable')}</li>
                <li>• {t('user_guide.smart_input.pro_tips.chain_input')}</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'pins',
      title: t('user_guide.pins.important_tasks_overview'),
      icon: Pin,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('user_guide.pins.important_tasks_overview')}</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {t('user_guide.pins.pins_description')}
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Pin className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.pins.pinning_tasks')}</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• {t('user_guide.pins.pinning_tasks.option1')}</li>
                <li>• {t('user_guide.pins.pinning_tasks.option2')}</li>
                <li>• {t('user_guide.pins.pinning_tasks.option3')}</li>
                <li>• {t('user_guide.pins.pinning_tasks.option4')}</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Edit className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.pins.manage_columns.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• {t('user_guide.pins.manage_columns.option1')}</li>
                <li>• {t('user_guide.pins.manage_columns.option2')}</li>
                <li>• {t('user_guide.pins.manage_columns.option3')}</li>
                <li>• {t('user_guide.pins.manage_columns.option4')}</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Target className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.pins.best_practices.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• {t('user_guide.pins.best_practices.option1')}</li>
                <li>• {t('user_guide.pins.best_practices.option2')}</li>
                <li>• {t('user_guide.pins.best_practices.option3')}</li>
                <li>• {t('user_guide.pins.best_practices.option4')}</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'emails',
      title: t('user_guide.emails.title'),
      icon: Mail,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">📧 {t('user_guide.emails.title')}</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {t('user_guide.emails.description')}
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Download className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.emails.import_emails.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• {t('user_guide.emails.import_emails.option1')}</li>
                <li>• {t('user_guide.emails.import_emails.option2')}</li>
                <li>• {t('user_guide.emails.import_emails.option3')}</li>
                <li>• {t('user_guide.emails.import_emails.option4')}</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Edit className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.emails.manage_emails.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• {t('user_guide.emails.manage_emails.option1')}</li>
                <li>• {t('user_guide.emails.manage_emails.option2')}</li>
                <li>• {t('user_guide.emails.manage_emails.option3')}</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Target className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.emails.use_cases.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• {t('user_guide.emails.use_cases.option1')}</li>
                <li>• {t('user_guide.emails.use_cases.option2')}</li>
                <li>• {t('user_guide.emails.use_cases.option3')}</li>
                <li>• {t('user_guide.emails.use_cases.option4')}</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'shortcuts',
      title: t('user_guide.shortcuts.title'),
      icon: Keyboard,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">⌨️ {t('user_guide.shortcuts.title')}</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {t('user_guide.shortcuts.description')}
            </p>
          </div>

          <div className="space-y-6">
            {/* Navigation Shortcuts */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">🧭</span>
                {t('user_guide.shortcuts.navigation.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.navigation.dashboard')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.navigation.dashboard_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.navigation.inbox')}</span>
                  <div className="flex space-x-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.navigation.inbox_shortcut')}</kbd>
                    <span className="text-gray-400">{t('user_guide.shortcuts.navigation.or')}</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.navigation.inbox_alt_shortcut')}</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.navigation.planner')}</span>
                  <div className="flex space-x-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.navigation.planner_shortcut')}</kbd>
                    <span className="text-gray-400">{t('user_guide.shortcuts.navigation.or')}</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.navigation.planner_alt_shortcut')}</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.navigation.projects')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.navigation.projects_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.navigation.notes')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.navigation.notes_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.navigation.pins')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.navigation.pins_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.navigation.tags')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.navigation.tags_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.navigation.statistics')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.navigation.statistics_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.navigation.archive')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.navigation.archive_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.navigation.settings')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.navigation.settings_shortcut')}</kbd>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">⚡</span>
                {t('user_guide.shortcuts.quick_actions.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.quick_actions.new_task')}</span>
                  <div className="flex space-x-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.quick_actions.new_task_shortcut')}</kbd>
                    <span className="text-gray-400">{t('user_guide.shortcuts.quick_actions.or')}</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.quick_actions.new_task_alt_shortcut')}</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.quick_actions.open_search')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.quick_actions.open_search_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.quick_actions.open_settings')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.quick_actions.open_settings_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.quick_actions.toggle_theme')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.quick_actions.toggle_theme_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.quick_actions.open_help')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.quick_actions.open_help_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.quick_actions.close_modal')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.quick_actions.close_modal_shortcut')}</kbd>
                </div>
              </div>
            </div>

            {/* Focus & Timer */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">🎯</span>
                {t('user_guide.shortcuts.focus_and_timer.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.focus_and_timer.focus_mode')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.focus_and_timer.focus_mode_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.focus_and_timer.review_mode')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.focus_and_timer.review_mode_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.focus_and_timer.pause_resume_timer')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.focus_and_timer.pause_resume_timer_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.focus_and_timer.leave_focus')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.focus_and_timer.leave_focus_shortcut')}</kbd>
                </div>
              </div>
            </div>

            {/* Board Navigation */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">📅</span>
                {t('user_guide.shortcuts.board_navigation.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.board_navigation.previous_day')}</span>
                  <div className="flex space-x-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.board_navigation.previous_day_shortcut')}</kbd>
                    <span className="text-gray-400">{t('user_guide.shortcuts.board_navigation.or')}</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.board_navigation.previous_day_alt_shortcut')}</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.board_navigation.next_day')}</span>
                  <div className="flex space-x-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.board_navigation.next_day_shortcut')}</kbd>
                    <span className="text-gray-400">{t('user_guide.shortcuts.board_navigation.or')}</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.board_navigation.next_day_alt_shortcut')}</kbd>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                <strong>{t('user_guide.shortcuts.board_navigation.note')}</strong>
              </div>
            </div>

            {/* Review Mode Shortcuts */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="text-2xl mr-2">🔍</span>
                {t('user_guide.shortcuts.review_mode.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.review_mode.next_task')}</span>
                  <div className="flex space-x-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.review_mode.next_task_shortcut')}</kbd>
                    <span className="text-gray-400">{t('user_guide.shortcuts.review_mode.or')}</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.review_mode.next_task_alt_shortcut')}</kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.review_mode.previous_task')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.review_mode.previous_task_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.review_mode.skip_task')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.review_mode.skip_task_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.review_mode.archive')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.review_mode.archive_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.review_mode.edit')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.review_mode.edit_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.review_mode.estimate_time')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.review_mode.estimate_time_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.review_mode.open_calendar')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.review_mode.open_calendar_shortcut')}</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{t('user_guide.shortcuts.review_mode.plan_review')}</span>
                  <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{t('user_guide.shortcuts.review_mode.plan_review_shortcut')}</kbd>
                </div>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="text-2xl mr-2">💡</span>
                {t('user_guide.shortcuts.pro_tips.title')}
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>• {t('user_guide.shortcuts.pro_tips.vim_style_navigation')}</li>
                <li>• {t('user_guide.shortcuts.pro_tips.quick_switch')}</li>
                <li>• {t('user_guide.shortcuts.pro_tips.timer_control')}</li>
                <li>• {t('user_guide.shortcuts.pro_tips.universal_esc')}</li>
                <li>• {t('user_guide.shortcuts.pro_tips.cross_platform')}</li>
                <li>• {t('user_guide.shortcuts.pro_tips.smart_input_shortcuts')}</li>
              </ul>
            </div>

            {/* Keyboard Layout Reference */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="text-2xl mr-2">⌨️</span>
                {t('user_guide.shortcuts.keyboard_layout_reference.title')}
              </h3>
              <div className="grid grid-cols-10 gap-1 text-xs">
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">1<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.today')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">2<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.inbox')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">3<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.tasks')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">4<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.kanban')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">5<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.notes')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">6<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.tags')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">7<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.stats')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">8<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.archive')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">9<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.settings')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">0</div>
              </div>
              <div className="mt-2 grid grid-cols-10 gap-1 text-xs">
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">T<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.today')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">R<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.review')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">F<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.focus')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">I<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.inbox')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">N<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.new')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">H<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.left')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">L<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.right')}</span></div>
                <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-center">?<br/><span className="text-xs text-gray-500">{t('user_guide.shortcuts.keyboard_layout_reference.help')}</span></div>
                <div className="col-span-2 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded p-1 text-center">Space<br/><span className="text-xs text-blue-600 dark:text-blue-400">{t('user_guide.shortcuts.keyboard_layout_reference.timer')}</span></div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'settings',
      title: t('user_guide.settings.title'),
      icon: Settings,
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('user_guide.settings.title')}</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {t('user_guide.settings.description')}
            </p>
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Palette className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.settings.appearance.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• {t('user_guide.settings.appearance.option1')}</li>
                <li>• {t('user_guide.settings.appearance.option2')}</li>
                <li>• {t('user_guide.settings.appearance.option3')}</li>
                <li>• {t('user_guide.settings.appearance.option4')}</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Bell className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.settings.notifications.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• {t('user_guide.settings.notifications.option1')}</li>
                <li>• {t('user_guide.settings.notifications.option2')}</li>
                <li>• {t('user_guide.settings.notifications.option3')}</li>
                <li>• {t('user_guide.settings.notifications.option4')}</li>
              </ul>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Package className="w-5 h-5" style={getAccentColorStyles().text} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('user_guide.settings.data_management.title')}</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• {t('user_guide.settings.data_management.option1')}</li>
                <li>• {t('user_guide.settings.data_management.option2')}</li>
                <li>• {t('user_guide.settings.data_management.option3')}</li>
                <li>• {t('user_guide.settings.data_management.option4')}</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  const getBackgroundImagePath = () => {
    return '/backgrounds/bg12.png';
  };

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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: -1 }} />
      
      <div 
        className="bg-white/10 dark:bg-gray-800/20 backdrop-blur-3xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-600/25 max-w-5xl w-full flex flex-col relative"
        style={{
          background: 'linear-gradient(145deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.2))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          height: '85vh',
          minHeight: '600px',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-white/20 backdrop-blur-xl rounded-lg border border-white/25 hover:border-white/40 transition-all duration-300"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
          }}
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/20 p-6">
          <div className="flex items-center space-x-3">
            <div 
              className="p-2 rounded-lg"
              style={getAccentColorStyles().bgLight}
            >
              <Target className="w-6 h-6" style={getAccentColorStyles().text} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ 
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                color: state.preferences.accentColor 
              }}>
                {t('user_guide.header_title')}
              </h1>
              <p className="text-sm text-white/70" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                {t('user_guide.header_subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar with Tabs */}
          <div className="w-56 bg-gradient-to-b from-gray-900/40 to-gray-800/50 dark:from-gray-900/40 dark:to-gray-800/50 border-r border-white/20 overflow-y-auto"
               style={{
                 background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.3))'
               }}>
            <div className="p-3 space-y-1">
              {guideSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all duration-200 ${
                      isActive
                        ? 'text-white shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    style={isActive ? getAccentColorStyles().bg : {}}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm">{section.title}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="p-8">
                <div className="text-white" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
                  {guideSections.find(section => section.id === activeSection)?.content}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-white/20 p-4 flex justify-between items-center">
          <p className="text-sm text-white/70" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}>
            💡 {t('user_guide.tip_text')} <kbd className="px-2 py-1 bg-white/10 rounded text-xs ml-1">?</kbd> {t('user_guide.tip_to_open')}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 backdrop-blur-xl"
            style={{
              backgroundColor: state.preferences.accentColor,
              border: `1px solid ${state.preferences.accentColor}33`,
              boxShadow: `0 6px 24px ${state.preferences.accentColor}4d, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
            }}
          >
            {t('user_guide.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
} 