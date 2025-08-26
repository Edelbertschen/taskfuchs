import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { useTranslation } from 'react-i18next';
import { DeleteConfirmationModal } from '../Common/DeleteConfirmationModal';
import type { KanbanBoard, KanbanGroupingMode, KanbanColumnConfig } from '../../types';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Edit3,
  Calendar,
  Flag,
  Tag,
  Folder,
  Clock,
  BarChart3,
  Save,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface BoardManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Color generation utilities
const hexToHsl = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h! /= 6;
  }

  return [h! * 360, s * 100, l * 100];
};

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const generateHarmoniousColors = (baseColor: string) => {
  const [h, s, l] = hexToHsl(baseColor);
  
  return {
    primary: baseColor,
    secondary: hslToHex((h + 120) % 360, s, l),
    tertiary: hslToHex((h + 240) % 360, s, l),
    success: hslToHex((h + 90) % 360, Math.min(s + 10, 100), Math.min(l + 10, 80)),
    warning: hslToHex((h + 30) % 360, Math.min(s + 20, 100), Math.max(l - 10, 40)),
    danger: hslToHex((h + 180) % 360, Math.min(s + 30, 100), Math.max(l - 20, 30)),
    neutral: hslToHex(h, Math.max(s - 40, 10), Math.min(l + 20, 70)),
    light: hslToHex(h, Math.max(s - 20, 20), Math.min(l + 30, 85)),
    accent1: hslToHex((h + 60) % 360, s, l),
    accent2: hslToHex((h + 300) % 360, s, l),
    accent3: hslToHex((h + 150) % 360, s, l),
    accent4: hslToHex((h + 210) % 360, s, l)
  };
};

// Dynamic board templates function
const createBoardTemplates = (accentColor: string): Omit<KanbanBoard, 'id' | 'createdAt' | 'updatedAt'>[] => {
  const colors = generateHarmoniousColors(accentColor);
  
  return [
    {
      name: 'Status Board',
      description: 'Klassisches Kanban mit To Do, In Progress, Done',
      groupingMode: 'status',
      columns: [
        { id: 'todo', title: 'Zu erledigen', color: colors.primary, order: 1, groupValue: 'todo' },
        { id: 'done', title: 'Erledigt', color: colors.success, order: 2, groupValue: 'done' }
      ],
      isDefault: false
    },
    {
      name: 'Prioritäts Board',
      description: 'Gruppierung nach Aufgaben-Priorität',
      groupingMode: 'priority',
      columns: [
        { id: 'high', title: 'Hoch', color: colors.danger, order: 1, groupValue: 'high' },
        { id: 'medium', title: 'Mittel', color: colors.warning, order: 2, groupValue: 'medium' },
        { id: 'low', title: 'Niedrig', color: colors.neutral, order: 3, groupValue: 'low' }
      ],
      isDefault: false
    },
    {
      name: 'Deadline Board',
      description: 'Gruppierung nach Fälligkeitsdaten',
      groupingMode: 'deadlines',
      columns: [
        { id: 'overdue', title: 'Überfällig', color: colors.danger, order: 1, groupValue: 'overdue' },
        { id: 'today', title: 'Heute', color: colors.warning, order: 2, groupValue: 'today' },
        { id: 'tomorrow', title: 'Morgen', color: colors.accent1, order: 3, groupValue: 'tomorrow' },
        { id: 'this_week', title: 'Diese Woche', color: colors.success, order: 4, groupValue: 'this_week' },
        { id: 'later', title: 'Später', color: colors.secondary, order: 5, groupValue: 'later' },
        { id: 'no_deadline', title: 'Kein Termin', color: colors.neutral, order: 6, groupValue: 'no_deadline' }
      ],
      isDefault: false
    },
    {
      name: 'Projekt Board',
      description: 'Gruppierung nach Projekten und Spalten',
      groupingMode: 'projects',
      columns: [
        { id: 'inbox', title: 'Inbox', color: colors.accent2, order: 1, groupValue: 'inbox' },
        { id: 'projects', title: 'Projekte', color: colors.primary, order: 2, groupValue: 'projects' },
        { id: 'someday', title: 'Someday', color: colors.tertiary, order: 3, groupValue: 'someday' },
        { id: 'scheduled', title: 'Geplant', color: colors.success, order: 4, groupValue: 'scheduled' }
      ],
      isDefault: false
    }
  ];
};

export function BoardManager({ isOpen, onClose }: BoardManagerProps) {
  const { state, dispatch } = useApp();
  const { boardManager } = useAppTranslation();
  const { i18n } = useTranslation();
  const { kanbanBoards } = state;
  
  const [editingBoard, setEditingBoard] = useState<KanbanBoard | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);

  // Generate board templates based on accent color
  const BOARD_TEMPLATES = useMemo(() => {
    const accentColor = state.preferences.accentColor || '#0ea5e9';
    return createBoardTemplates(accentColor);
  }, [state.preferences.accentColor]);

  // Generate colors for UI elements
  const colors = useMemo(() => {
    const accentColor = state.preferences.accentColor || '#0ea5e9';
    const [h, s, l] = hexToHsl(accentColor);
    return {
      primary: accentColor,
      danger: hslToHex(0, Math.min(s, 80), Math.min(l, 50)),
      success: hslToHex(142, Math.min(s, 80), Math.min(l, 50)),
      warning: hslToHex(48, Math.min(s, 80), Math.min(l, 50)),
      light: hslToHex(h, Math.max(s * 0.3, 20), Math.min(l + 40, 95)),
      dark: hslToHex(h, Math.min(s, 80), Math.max(l - 20, 10))
    };
  }, [state.preferences.accentColor]);

  if (!isOpen) return null;

  const handleCreateFromTemplate = (template: typeof BOARD_TEMPLATES[0]) => {
    const newBoard: KanbanBoard = {
      ...template,
      id: `board-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dispatch({ type: 'CREATE_KANBAN_BOARD', payload: newBoard });
    setShowTemplates(false);
  };

  const handleCreateCustomBoard = () => {
    if (!boardName.trim()) return;

    const accentColor = state.preferences.accentColor || '#0ea5e9';
    const colors = generateHarmoniousColors(accentColor);

    const newBoard: KanbanBoard = {
      id: `board-${Date.now()}`,
      name: boardName,
      description: boardDescription,
      groupingMode: 'status',
      columns: [
        { id: 'todo', title: 'Zu erledigen', color: colors.primary, order: 1, groupValue: 'todo' },
        { id: 'done', title: 'Erledigt', color: colors.success, order: 2, groupValue: 'done' }
      ],
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dispatch({ type: 'CREATE_KANBAN_BOARD', payload: newBoard });
    setBoardName('');
    setBoardDescription('');
  };

  const handleUpdateBoard = (board: KanbanBoard) => {
    const updatedBoard = {
      ...board,
      updatedAt: new Date().toISOString()
    };
    dispatch({ type: 'UPDATE_KANBAN_BOARD', payload: updatedBoard });
    setEditingBoard(null);
  };

  const handleDeleteBoard = (boardId: string) => {
    setBoardToDelete(boardId);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteBoard = () => {
    if (!boardToDelete) return;
    
    dispatch({ type: 'DELETE_KANBAN_BOARD', payload: boardToDelete });
    setBoardToDelete(null);
  };

  const handleDuplicateBoard = (board: KanbanBoard) => {
    const duplicatedBoard: KanbanBoard = {
      ...board,
      id: `board-${Date.now()}`,
      name: `${board.name} ${boardManager.copySuffix()}`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    dispatch({ type: 'CREATE_KANBAN_BOARD', payload: duplicatedBoard });
  };

  const getGroupingIcon = (mode: KanbanGroupingMode) => {
    switch (mode) {
      case 'status': return BarChart3;
      case 'priority': return Flag;
      case 'tags': return Tag;
      case 'date': return Calendar;
      case 'projects': return Folder;
      case 'deadlines': return Clock;
      default: return BarChart3;
    }
  };

  const getGroupingLabel = (mode: KanbanGroupingMode) => {
    switch (mode) {
      case 'status': return 'Status';
      case 'priority': return boardManager.grouping.priority();
      case 'tags': return 'Tags';
      case 'date': return 'Datum';
      case 'projects': return 'Projekte';
      case 'deadlines': return 'Deadlines';
      default: return mode;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {boardManager.title()}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Create Board Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {boardManager.createNewBoard()}
              </h3>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center space-x-2 px-3 py-2 text-sm transition-colors"
            style={{ 
              color: colors.primary,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.light}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Copy className="w-4 h-4" />
                <span>Aus Template</span>
              </button>
            </div>

            {/* Custom Board Creation */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder={boardManager.boardNamePlaceholder()}
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  type="text"
                  placeholder={boardManager.descriptionPlaceholder()}
                  value={boardDescription}
                  onChange={(e) => setBoardDescription(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <button
                onClick={handleCreateCustomBoard}
                disabled={!boardName.trim()}
                className="flex items-center space-x-2 px-4 py-2 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ 
                  backgroundColor: colors.primary
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = colors.dark;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = colors.primary;
                  }
                }}
              >
                <Plus className="w-4 h-4" />
                <span>{boardManager.createBoard()}</span>
              </button>
            </div>

            {/* Templates */}
            {showTemplates && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BOARD_TEMPLATES.map((template, index) => {
                  const IconComponent = getGroupingIcon(template.groupingMode);
                  return (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer transition-colors"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = colors.primary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgb(229 231 235)';
                      }}
                      onClick={() => handleCreateFromTemplate(template)}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <IconComponent className="w-5 h-5" style={{ color: colors.primary }} />
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {template.name}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {template.description}
                      </p>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {template.columns.length} Spalten • {getGroupingLabel(template.groupingMode)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Existing Boards */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Vorhandene Boards ({kanbanBoards.length})
            </h3>
            
            {kanbanBoards.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p>{boardManager.noBoardsYet()}</p>
              <p className="text-sm">{boardManager.createFirstBoard()}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {kanbanBoards.map((board) => {
                  const IconComponent = getGroupingIcon(board.groupingMode);
                  return (
                    <div
                      key={board.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {board.name}
                              {board.isDefault && (
                                <span className="ml-2 px-2 py-1 text-xs rounded-full" style={{ 
                                  backgroundColor: colors.light,
                                  color: colors.primary
                                }}>
                                  {boardManager.default()}
                                </span>
                              )}
                            </h4>
                            {board.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {board.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <span>{boardManager.columnsCount(board.columns.length)}</span>
                              <span>{getGroupingLabel(board.groupingMode)}</span>
                              <span>{boardManager.created(format(new Date(board.createdAt), 'dd.MM.yyyy'))}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingBoard(board)}
                            className="p-2 text-gray-400 transition-colors"
                            style={{ color: 'rgb(156 163 175)' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}
                            title={boardManager.edit()}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateBoard(board)}
                            className="p-2 text-gray-400 transition-colors"
                            style={{ color: 'rgb(156 163 175)' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = colors.success}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}
                            title="Duplizieren"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {!board.isDefault && (
                            <button
                              onClick={() => handleDeleteBoard(board.id)}
                              className="p-2 text-gray-400 transition-colors"
                              style={{ color: 'rgb(156 163 175)' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = colors.danger}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(156 163 175)'}
                              title={boardManager.delete()}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Board Modal */}
      {editingBoard && (
        <BoardEditModal
          board={editingBoard}
          onSave={handleUpdateBoard}
          onClose={() => setEditingBoard(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDeleteBoard}
                  title={boardManager.deleteBoard()}
          message={boardManager.deleteConfirm()}
        itemName={kanbanBoards.find(b => b.id === boardToDelete)?.name}
                  warningText={boardManager.deleteWarning()}
      />
    </div>
  );
}

// Separate component for editing boards
interface BoardEditModalProps {
  board: KanbanBoard;
  onSave: (board: KanbanBoard) => void;
  onClose: () => void;
}

function BoardEditModal({ board, onSave, onClose }: BoardEditModalProps) {
  const { state } = useApp();
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || '');
  const [columns, setColumns] = useState<KanbanColumnConfig[]>(board.columns);

  const handleSave = () => {
    onSave({
      ...board,
      name,
      description,
      columns
    });
    onClose();
  };

  const addColumn = () => {
    const accentColor = state.preferences.accentColor || '#0ea5e9';
    const colors = generateHarmoniousColors(accentColor);
    
    const newColumn: KanbanColumnConfig = {
      id: `col-${Date.now()}`,
      title: 'Neue Spalte',
      color: colors.neutral,
      order: columns.length + 1,
      groupValue: `custom-${Date.now()}`
    };
    setColumns([...columns, newColumn]);
  };

  const updateColumn = (index: number, updates: Partial<KanbanColumnConfig>) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], ...updates };
    setColumns(newColumns);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Board bearbeiten
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-150px)]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Beschreibung
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Spalten
                </label>
                <button
                  onClick={addColumn}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-3 h-3" />
                  <span>{i18n.language === 'en' ? 'Add Column' : 'Spalte hinzufügen'}</span>
                </button>
              </div>

              <div className="space-y-2">
                {columns.map((column, index) => (
                  <div key={column.id} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-md dark:border-gray-600">
                    <input
                      type="text"
                      value={column.title}
                      onChange={(e) => updateColumn(index, { title: e.target.value })}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <input
                      type="color"
                      value={column.color}
                      onChange={(e) => updateColumn(index, { color: e.target.value })}
                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <button
                      onClick={() => removeColumn(index)}
                      className="p-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            <span>Speichern</span>
          </button>
        </div>
      </div>
    </div>
  );
} 