import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';
import { de } from 'date-fns/locale';
import { Task, Column } from '../types';

interface PlannerExportData {
  columns: Column[];
  tasks: Task[];
  columnCount: number;
  exportDate: string;
}

export const exportPlannerToPrint = (data: PlannerExportData) => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup wurde blockiert. Bitte erlauben Sie Popups für den Export.');
    return;
  }

  const { columns, tasks, columnCount, exportDate } = data;

  // Helper function to escape HTML
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Group tasks by column
  const tasksByColumn = new Map<string, Task[]>();
  columns.forEach(col => {
    const columnTasks = tasks
      .filter(task => task.columnId === col.id)
      .sort((a, b) => a.position - b.position);
    tasksByColumn.set(col.id, columnTasks);
  });

  // Format column titles
  const getColumnTitle = (column: Column): string => {
    if (column.date) {
      const date = parseISO(column.date);
      if (isToday(date)) {
        return 'Heute';
      } else if (isTomorrow(date)) {
        return 'Morgen';
      } else if (isYesterday(date)) {
        return 'Gestern';
      } else {
        return format(date, 'eeee\nd. MMM', { locale: de });
      }
    }
    return column.title;
  };

  // Calculate grid columns for CSS
  const getGridColumns = () => {
    switch (columnCount) {
      case 3: return 'repeat(3, 1fr)';
      case 5: return 'repeat(5, 1fr)';
      case 7: return 'repeat(7, 1fr)';
      default: return 'repeat(3, 1fr)';
    }
  };

  const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TaskFuchs Planer - ${exportDate}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 15mm;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 11px;
          line-height: 1.4;
          color: #1f2937;
          background: white;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8mm;
          margin-bottom: 8mm;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .header h1 {
          font-size: 24px;
          font-weight: 600;
          color: #111827;
        }
        
        .header .date {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }
        
        .planner-grid {
          display: grid;
          grid-template-columns: ${getGridColumns()};
          gap: 8mm;
          height: calc(100vh - 80mm);
        }
        
        .column {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #fafafa;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        
        .column-header {
          background: #f3f4f6;
          padding: 12px 16px;
          border-bottom: 1px solid #d1d5db;
          border-radius: 8px 8px 0 0;
        }
        
        .column-title {
          font-weight: 600;
          font-size: 14px;
          color: #374151;
          text-align: center;
          white-space: pre-line;
        }
        
        .column-content {
          padding: 12px;
          flex: 1;
          overflow: hidden;
        }
        
        .task {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 10px 12px;
          margin-bottom: 8px;
          position: relative;
          min-height: 45px;
        }
        
        .task:last-child {
          margin-bottom: 0;
        }
        
        .task-title {
          font-weight: 500;
          color: #111827;
          margin-bottom: 4px;
          word-wrap: break-word;
          hyphens: auto;
        }
        
        .task-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          margin-top: 6px;
        }
        
        .task-priority {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .priority-high { background: #ef4444; }
        .priority-medium { background: #f59e0b; }
        .priority-low { background: #10b981; }
        
        .task-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        
        .tag {
          background: #e5e7eb;
          color: #4b5563;
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 10px;
          white-space: nowrap;
        }
        
        .task-time {
          font-size: 9px;
          color: #6b7280;
          margin-left: auto;
        }
        
        .empty-column {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-style: italic;
          height: 60px;
        }
        
        .task-description {
          font-size: 10px;
          color: #6b7280;
          margin-top: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        /* Lines for writing */
        .writing-lines {
          margin-top: 12px;
          flex: 1;
        }
        
        .line {
          height: 20px;
          border-bottom: 1px solid #f3f4f6;
          margin-bottom: 2px;
        }
        
        @media print {
          .header {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .task {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .column {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>TaskFuchs Planer</h1>
        <div class="date">${exportDate}</div>
      </div>
      
      <div class="planner-grid">
        ${columns.map(column => {
          const columnTasks = tasksByColumn.get(column.id) || [];
          
          return `
            <div class="column">
              <div class="column-header">
                <div class="column-title">${getColumnTitle(column)}</div>
              </div>
              <div class="column-content">
                ${columnTasks.map(task => `
                  <div class="task">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
                    <div class="task-meta">
                      ${task.priority && task.priority !== 'none' ? 
                        `<div class="task-priority priority-${task.priority}"></div>` : ''
                      }
                      ${task.tags.length > 0 ? `
                        <div class="task-tags">
                          ${task.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                        </div>
                      ` : ''}
                      ${task.estimatedTime > 0 ? 
                        `<div class="task-time">${Math.floor(task.estimatedTime / 60)}h ${task.estimatedTime % 60}m</div>` : ''
                      }
                    </div>
                  </div>
                `).join('')}
                
                ${columnTasks.length === 0 ? `
                  <div class="empty-column">Keine Aufgaben</div>
                ` : ''}
                
                <!-- Writing lines for additional tasks -->
                <div class="writing-lines">
                  ${Array.from({ length: Math.max(8 - columnTasks.length, 3) }, () => 
                    '<div class="line"></div>'
                  ).join('')}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for the content to load, then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Close the window after printing (optional)
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    }, 500);
  };
};

export const formatTimeEstimate = (minutes: number): string => {
  // Return empty string for 0 minutes to prevent showing "0m"
  if (minutes === 0) return '';
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}; 