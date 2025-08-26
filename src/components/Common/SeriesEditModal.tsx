import React from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Calendar, X } from 'lucide-react';
import { useAppTranslation } from '../../utils/i18nHelpers';

interface SeriesEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditInstance: () => void;
  onEditSeries: () => void;
  taskTitle: string;
}

export function SeriesEditModal({
  isOpen,
  onClose,
  onEditInstance,
  onEditSeries,
  taskTitle
}: SeriesEditModalProps) {
  const { series } = useAppTranslation();
  
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              {series.editModal.title()}
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
            {series.editModal.description()}
          </p>
          <p className="font-medium text-gray-900 mb-6 p-3 bg-gray-50 rounded-lg">
            "{taskTitle}"
          </p>
          <p className="text-gray-600 mb-6">
            {series.editModal.question()}
          </p>

          <div className="space-y-3">
            <button
              onClick={onEditInstance}
              className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <Calendar className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
              <div className="text-left">
                <div className="font-medium text-gray-900">{series.editModal.editInstance()}</div>
                <div className="text-sm text-gray-500">
                  {series.editModal.editInstanceDescription()}
                </div>
              </div>
            </button>

            <button
              onClick={onEditSeries}
              className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <RefreshCw className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
              <div className="text-left">
                <div className="font-medium text-gray-900">{series.editModal.editEntireSeries()}</div>
                <div className="text-sm text-gray-500">
                  {series.editModal.editEntireSeriesDescription()}
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
            {series.editModal.cancel()}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 