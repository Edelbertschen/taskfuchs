import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { KanbanGroupingMode } from '../../types';
import { 
  ChevronDown, 
  BarChart3, 
  Flag, 
  Tag, 
  Calendar, 
  Folder, 
  Clock,
  Settings
} from 'lucide-react';
import { BoardManager } from './BoardManager';

interface BoardSelectorProps {
  className?: string;
}

export function BoardSelector({ className = '' }: BoardSelectorProps) {
  const { state, dispatch } = useApp();
  const { kanbanBoards, viewState } = state;
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showBoardManager, setShowBoardManager] = useState(false);

  const currentBoard = kanbanBoards.find(board => board.id === viewState.activeKanbanBoard);
  
  // If no boards exist or no active board is set, use the default grouping mode
  const currentGroupingMode = currentBoard?.groupingMode || viewState.kanbanGrouping;

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
      case 'priority': return 'Priorität';
      case 'tags': return 'Tags';
      case 'date': return 'Datum';
      case 'projects': return 'Projekte';
      case 'deadlines': return 'Deadlines';
      default: return mode;
    }
  };

  const handleBoardSelect = (boardId: string | null) => {
    if (boardId) {
      const board = kanbanBoards.find(b => b.id === boardId);
      if (board) {
        dispatch({ type: 'SET_ACTIVE_KANBAN_BOARD', payload: boardId });
        dispatch({ type: 'SET_KANBAN_GROUPING', payload: board.groupingMode });
      }
    } else {
      // Switch to dynamic grouping mode
      dispatch({ type: 'SET_ACTIVE_KANBAN_BOARD', payload: '' });
    }
    setIsDropdownOpen(false);
  };

  const handleGroupingChange = (grouping: KanbanGroupingMode) => {
    dispatch({ type: 'SET_KANBAN_GROUPING', payload: grouping });
    dispatch({ type: 'SET_ACTIVE_KANBAN_BOARD', payload: '' });
    setIsDropdownOpen(false);
  };

  const IconComponent = getGroupingIcon(currentGroupingMode);

  return (
    <div className={`relative ${className}`}>
      {/* Current Selection */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
      >
        <IconComponent className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {currentBoard ? currentBoard.name : `Dynamisch: ${getGroupingLabel(currentGroupingMode)}`}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg" style={{ zIndex: 50 }}>
          <div className="p-2">
            {/* Dynamic Grouping Section */}
            <div className="mb-3">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Dynamische Gruppierung
              </div>
              {(['status', 'priority', 'tags', 'date', 'projects', 'deadlines'] as KanbanGroupingMode[]).map((grouping) => {
                const GroupIcon = getGroupingIcon(grouping);
                const isActive = !currentBoard && currentGroupingMode === grouping;
                
                return (
                  <button
                    key={grouping}
                    onClick={() => handleGroupingChange(grouping)}
                    className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <GroupIcon className="w-4 h-4" />
                    <span>{getGroupingLabel(grouping)}</span>
                  </button>
                );
              })}
            </div>

            {/* Saved Boards Section */}
            {kanbanBoards.length > 0 && (
              <div className="mb-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Gespeicherte Boards
                </div>
                {kanbanBoards.map((board) => {
                  const BoardIcon = getGroupingIcon(board.groupingMode);
                  const isActive = currentBoard?.id === board.id;
                  
                  return (
                    <button
                      key={board.id}
                      onClick={() => handleBoardSelect(board.id)}
                      className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <BoardIcon className="w-4 h-4" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{board.name}</div>
                        {board.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {board.description}
                          </div>
                        )}
                      </div>
                      {board.isDefault && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded dark:bg-blue-900 dark:text-blue-300">
                          Standard
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
              <button
                onClick={() => {
                  setShowBoardManager(true);
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Settings className="w-4 h-4" />
                <span>Boards verwalten</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 49 }}
          onClick={() => setIsDropdownOpen(false)}
        />
      )}

      {/* Board Manager Modal */}
      <BoardManager
        isOpen={showBoardManager}
        onClose={() => setShowBoardManager(false)}
      />
    </div>
  );
} 