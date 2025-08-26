import React from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Calendar, X, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SeriesDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteInstance: () => void;
  onDeleteSeries: () => void;
  taskTitle: string;
}

export function SeriesDeleteModal({
  isOpen,
  onClose,
  onDeleteInstance,
  onDeleteSeries,
  taskTitle
}: SeriesDeleteModalProps) {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t('series.delete_modal.title')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-gray-600 mb-4">
            {t('series.delete_modal.description')}
          </p>
          <p className="font-medium text-gray-900 mb-6 p-3 bg-gray-50 rounded-lg">
            "{taskTitle}"
          </p>
          <p className="text-gray-600 mb-6">
            {t('series.delete_modal.question')}
          </p>

          <div className="space-y-3">
            <button
              onClick={onDeleteInstance}
              className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors group"
            >
              <Calendar className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
              <div className="text-left">
                <div className="font-medium text-gray-900">{t('series.delete_modal.delete_instance')}</div>
                <div className="text-sm text-gray-500">
                  {t('series.delete_modal.delete_instance_description')}
                </div>
              </div>
            </button>

            <button
              onClick={onDeleteSeries}
              className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors group"
            >
              <RefreshCw className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
              <div className="text-left">
                <div className="font-medium text-gray-900">{t('series.delete_modal.delete_entire_series')}</div>
                <div className="text-sm text-gray-500">
                  {t('series.delete_modal.delete_entire_series_description')}
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {t('series.delete_modal.cancel')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 