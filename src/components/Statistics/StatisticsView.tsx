import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useAppTranslation } from '../../utils/i18nHelpers';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Target, 
  Award, 
  Activity,
  CheckCircle2,
  Timer,
  Users,
  PieChart,
  LineChart,
  BarChart2,
  Eye,
  Zap,
  Coffee,
  Sun,
  Moon,
  Star,
  ArrowUp,
  ArrowDown,
  Equal,
  AlertCircle,
  Sparkles,
  Brain,
  Flame,
  Trophy,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  Download,
  FileText,
  Folder,
  X
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, isToday, isThisWeek, isThisMonth, differenceInMinutes, parseISO, isValid, startOfYear, endOfYear } from 'date-fns';
import { de } from 'date-fns/locale';
import { TimebudgetReports } from './TimebudgetReports';
import { CapacityReports } from './CapacityReports';
import { PersonalCapacityModal } from '../Common/PersonalCapacityModal';

type TimeRange = 'today' | 'week' | 'month' | 'year';

interface StatCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<any>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: string;
  bgGradient: string;
  textColor: string;
}

interface ChartData {
  label: string;
  planned: number;
  actual: number;
  efficiency: number;
  tasks: number;
}

interface Insight {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  iconColor: string;
  priority: number;
}

export function StatisticsView() {
  const { state } = useApp();
  const { statistics: s } = useAppTranslation();
  const [selectedRange, setSelectedRange] = useState<TimeRange>('today');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeInsight, setActiveInsight] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPersonalCapacity, setShowPersonalCapacity] = useState(false);

  // Robuste Zeitberechnung mit Fallback-Werten
  const formatTime = useCallback((minutes: number) => {
    if (!minutes || isNaN(minutes) || minutes <= 0) return '0m';
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }, []);

  // Optimized range handler
  const handleRangeChange = useCallback((range: TimeRange) => {
    setSelectedRange(range);
    setCurrentDate(new Date()); // Reset to current date when changing range
  }, []);

  // Navigation functions
  const navigatePrevious = useCallback(() => {
    setCurrentDate(prevDate => {
      switch (selectedRange) {
        case 'today':
          return subDays(prevDate, 1);
        case 'week':
          return subWeeks(prevDate, 1);
        case 'month':
          return subMonths(prevDate, 1);
        case 'year':
          return new Date(prevDate.getFullYear() - 1, prevDate.getMonth(), prevDate.getDate());
        default:
          return prevDate;
      }
    });
  }, [selectedRange]);

  const navigateNext = useCallback(() => {
    setCurrentDate(prevDate => {
      switch (selectedRange) {
        case 'today':
          return new Date(prevDate.getTime() + 24 * 60 * 60 * 1000);
        case 'week':
          return new Date(prevDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        case 'month':
          return new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, prevDate.getDate());
        case 'year':
          return new Date(prevDate.getFullYear() + 1, prevDate.getMonth(), prevDate.getDate());
        default:
          return prevDate;
      }
    });
  }, [selectedRange]);

  const canNavigateNext = useCallback(() => {
    const now = new Date();
    switch (selectedRange) {
      case 'today':
        return currentDate < now;
      case 'week':
        return endOfWeek(currentDate) < now;
      case 'month':
        return endOfMonth(currentDate) < now;
      case 'year':
        return endOfYear(currentDate) < now;
      default:
        return false;
    }
  }, [selectedRange, currentDate]);

  // Verbesserte Datumsprüfung mit currentDate
  const isTaskInRange = useCallback((task: any, range: TimeRange) => {
    // Prüfe sowohl completedAt als auch updatedAt für bessere Erfassung
    const taskDate = task.completedAt || task.updatedAt;
    if (!taskDate) return false;
    
    const parsedDate = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
    if (!isValid(parsedDate)) return false;

    switch (range) {
      case 'today':
        return parsedDate >= startOfDay(currentDate) && parsedDate <= endOfDay(currentDate);
      case 'week':
        return parsedDate >= startOfWeek(currentDate, { weekStartsOn: 1 }) && parsedDate <= endOfWeek(currentDate, { weekStartsOn: 1 });
      case 'month':
        return parsedDate >= startOfMonth(currentDate) && parsedDate <= endOfMonth(currentDate);
      case 'year':
        return parsedDate >= startOfYear(currentDate) && parsedDate <= endOfYear(currentDate);
      default:
        return false;
    }
  }, [currentDate]);

  // Export function
  const handleExport = useCallback((exportFormat: 'csv' | 'xlsx' | 'pdf') => {
    const allTasks = state.tasks.filter(task => {
      return isTaskInRange(task, selectedRange) && (task.trackedTime || task.actualTime || 0) > 0;
    });

    // Prepare export data
    const exportData = allTasks.map(task => {
      const project = task.projectId 
        ? state.columns.find(col => col.id === task.projectId && col.type === 'project')?.title || 'Unbekanntes Projekt'
        : 'Ohne Projekt';
      
      const taskDate = task.completedAt || task.updatedAt;
      const workDate = taskDate ? format(new Date(taskDate), 'dd.MM.yyyy') : 'Unbekannt';
      const timeWorked = task.trackedTime || task.actualTime || 0;
      
      return {
        aufgabe: task.title,
        projekt: project,
        zeit_minuten: timeWorked,
        zeit_formatiert: formatTime(timeWorked),
        datum: workDate,
        status: task.completed ? 'Erledigt' : 'Offen'
      };
    }).sort((a, b) => b.zeit_minuten - a.zeit_minuten); // Sort by time worked

    if (exportFormat === 'csv') {
      exportToCSV(exportData);
    } else if (exportFormat === 'xlsx') {
      exportToXLSX(exportData);
    } else if (exportFormat === 'pdf') {
      exportToPDF(exportData);
    }
    
    setShowExportModal(false);
  }, [selectedRange, currentDate, isTaskInRange, state.tasks, state.columns, formatTime]);

  // CSV Export
  const exportToCSV = (data: any[]) => {
    if (data.length === 0) {
      alert('Keine Daten für den gewählten Zeitraum vorhanden.');
      return;
    }

    const headers = ['Aufgabe', 'Projekt', 'Arbeitszeit (Min)', 'Arbeitszeit', 'Datum', 'Status'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        `"${row.aufgabe.replace(/"/g, '""')}"`,
        `"${row.projekt}"`,
        row.zeit_minuten,
        `"${row.zeit_formatiert}"`,
        row.datum,
        `"${row.status}"`
      ].join(','))
    ].join('\n');

    const rangeText = {
      today: format(currentDate, 'dd.MM.yyyy', { locale: de }),
      week: `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd.MM.')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd.MM.yyyy')}`,
      month: format(currentDate, 'MM-yyyy', { locale: de }),
      year: format(currentDate, 'yyyy')
    }[selectedRange];

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `TaskFuchs_Zeiterfassung_${rangeText}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // XLSX Export (simplified - would need xlsx library for full implementation)
  const exportToXLSX = (data: any[]) => {
    // For now, export as CSV with xlsx extension as a placeholder
    exportToCSV(data);
    alert('XLSX-Export wird in einer zukünftigen Version implementiert. Datei wurde als CSV exportiert.');
  };

  // PDF Export - Überragend hübsches PDF mit Glaseffekten und Fuchs-Logo
  const exportToPDF = async (data: any[]) => {
    if (data.length === 0) {
      alert('Keine Daten für den gewählten Zeitraum vorhanden.');
      return;
    }

    try {
      // Get accent color from preferences
      const accentColor = state.preferences.accentColor || '#3B82F6';
      
      // Create canvas for PDF generation
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // A4 dimensions at 300 DPI (high quality)
      const pageWidth = 2480;
      const pageHeight = 3508;
      canvas.width = pageWidth;
      canvas.height = pageHeight;

      // Set high quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Background - Elegant gradient with glassmorphism effect
      const gradient = ctx.createLinearGradient(0, 0, pageWidth, pageHeight);
      gradient.addColorStop(0, '#F8FAFC');
      gradient.addColorStop(0.5, '#F1F5F9');
      gradient.addColorStop(1, '#E2E8F0');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, pageWidth, pageHeight);

      // Subtle pattern overlay for texture
      ctx.globalAlpha = 0.03;
      for (let i = 0; i < pageWidth; i += 100) {
        for (let j = 0; j < pageHeight; j += 100) {
          ctx.fillStyle = accentColor;
          ctx.fillRect(i, j, 2, 2);
        }
      }
      ctx.globalAlpha = 1;

      // Header with glassmorphism effect
      const headerHeight = 300;
      const headerGradient = ctx.createLinearGradient(0, 0, pageWidth, headerHeight);
      headerGradient.addColorStop(0, `${accentColor}15`);
      headerGradient.addColorStop(1, `${accentColor}08`);
      ctx.fillStyle = headerGradient;
      ctx.fillRect(100, 80, pageWidth - 200, headerHeight);

      // Header border with glass effect
      ctx.strokeStyle = `${accentColor}40`;
      ctx.lineWidth = 2;
      ctx.strokeRect(100, 80, pageWidth - 200, headerHeight);

      // Fuchs-Logo - Elegant circular badge
      const logoX = 200, logoY = 200, logoRadius = 60;
      ctx.beginPath();
      ctx.arc(logoX, logoY, logoRadius, 0, 2 * Math.PI);
      ctx.fillStyle = accentColor;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF40';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      ctx.font = 'bold 60px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText('F', logoX, logoY + 20);

      // Title - TaskFuchs
      ctx.font = 'bold 96px Arial';
      ctx.fillStyle = '#1E293B';
      ctx.fillText('TaskFuchs', 320, 200);

      // Subtitle
      ctx.font = '48px Arial';
      ctx.fillStyle = '#64748B';
      ctx.fillText('Zeiterfassung & Produktivitätsbericht', 320, 260);

      // Date range
      const rangeText = {
        today: format(currentDate, 'dd.MM.yyyy', { locale: de }),
        week: `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd.MM.')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd.MM.yyyy')}`,
        month: format(currentDate, 'MMMM yyyy', { locale: de }),
        year: format(currentDate, 'yyyy')
      }[selectedRange];

      ctx.font = '36px Arial';
      ctx.fillStyle = accentColor;
      ctx.fillText(`Zeitraum: ${rangeText}`, 320, 320);

      // Summary Statistics - Clean and elegant
      const totalTime = data.reduce((sum, item) => sum + item.zeit_minuten, 0);
      const totalTasks = data.length;
      const avgTime = totalTasks > 0 ? Math.round(totalTime / totalTasks) : 0;

      const summaryY = 450;
      
      // Summary content - single line with separators
      ctx.font = 'bold 40px Arial';
      ctx.fillStyle = '#1E293B';
      ctx.textAlign = 'left';
      const summaryText = `Aufgaben bearbeitet: ${totalTasks}  |  Gesamtzeit: ${formatTime(totalTime)}  |  Ø Zeit pro Aufgabe: ${formatTime(avgTime)}`;
      ctx.fillText(summaryText, 120, summaryY);

      // Data table header
      const tableStartY = 550;
      const rowHeight = 60;
      const colWidths = [60, 800, 400, 300, 300, 200]; // Position for each column
      const colPositions = [120]; // Starting positions
      for (let i = 1; i < colWidths.length; i++) {
        colPositions.push(colPositions[i-1] + colWidths[i-1]);
      }

      // Table header with glass effect
      const headerRowGradient = ctx.createLinearGradient(0, tableStartY, pageWidth, tableStartY + rowHeight);
      headerRowGradient.addColorStop(0, `${accentColor}25`);
      headerRowGradient.addColorStop(1, `${accentColor}15`);
      ctx.fillStyle = headerRowGradient;
      ctx.fillRect(100, tableStartY, pageWidth - 200, rowHeight);

      ctx.strokeStyle = `${accentColor}40`;
      ctx.lineWidth = 2;
      ctx.strokeRect(100, tableStartY, pageWidth - 200, rowHeight);

      // Table headers
      const headers = ['#', 'Aufgabe', 'Projekt', 'Zeit', 'Datum', 'Status'];
      ctx.font = 'bold 32px Arial';
      ctx.fillStyle = '#1E293B';
      ctx.textAlign = 'left';

      headers.forEach((header, index) => {
        ctx.fillText(header, colPositions[index], tableStartY + 40);
      });

      // Table rows
      const maxRowsPerPage = 25;
      const displayData = data.slice(0, maxRowsPerPage);

      ctx.font = '28px Arial';
      ctx.textAlign = 'left';

      displayData.forEach((row, index) => {
        const y = tableStartY + rowHeight + (index * rowHeight);
        
        // Alternating row background
        if (index % 2 === 0) {
          ctx.fillStyle = '#FFFFFF30';
          ctx.fillRect(100, y, pageWidth - 200, rowHeight);
        }

        // Row border
        ctx.strokeStyle = '#E2E8F040';
        ctx.lineWidth = 1;
        ctx.strokeRect(100, y, pageWidth - 200, rowHeight);

        // Row data
        ctx.fillStyle = '#374151';
        const rowData = [
          (index + 1).toString(),
          row.aufgabe.length > 35 ? row.aufgabe.substring(0, 35) + '...' : row.aufgabe,
          row.projekt.length > 20 ? row.projekt.substring(0, 20) + '...' : row.projekt,
          row.zeit_formatiert,
          row.datum,
          row.status === 'Erledigt' ? 'Erledigt' : 'Offen'
        ];

        rowData.forEach((cell, cellIndex) => {
          if (cellIndex === 5) { // Status column - elegant icons
            const statusX = colPositions[cellIndex];
            const statusY = y + 30;
            
            if (row.status === 'Erledigt') {
              // Draw filled circle with checkmark
              ctx.beginPath();
              ctx.arc(statusX + 15, statusY, 12, 0, 2 * Math.PI);
              ctx.fillStyle = accentColor;
              ctx.fill();
              
              ctx.strokeStyle = 'white';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(statusX + 8, statusY);
              ctx.lineTo(statusX + 12, statusY + 4);
              ctx.lineTo(statusX + 20, statusY - 4);
              ctx.stroke();
            } else {
              // Draw empty circle
              ctx.beginPath();
              ctx.arc(statusX + 15, statusY, 12, 0, 2 * Math.PI);
              ctx.strokeStyle = '#94A3B8';
              ctx.lineWidth = 3;
              ctx.stroke();
            }
          } else {
            ctx.fillText(cell, colPositions[cellIndex], y + 40);
          }
        });
      });

      // Footer with accent color
      const footerY = pageHeight - 150;
      ctx.font = '24px Arial';
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'center';
      ctx.fillText(`Erstellt am ${format(new Date(), 'dd.MM.yyyy HH:mm')} mit TaskFuchs`, pageWidth / 2, footerY);

      ctx.fillStyle = accentColor;
      ctx.fillText('Produktivität leicht gemacht', pageWidth / 2, footerY + 40);

      // Convert canvas to PDF
      const imageData = canvas.toDataURL('image/png', 1.0);
      
      // Create a new window for PDF display
      const pdfWindow = window.open('', '_blank');
      if (pdfWindow) {
        pdfWindow.document.write(`
          <html>
            <head>
              <title>TaskFuchs Zeiterfassung - ${rangeText}</title>
              <style>
                body { margin: 0; padding: 20px; background: #f5f5f5; }
                .pdf-container { max-width: 100%; margin: 0 auto; background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                img { width: 100%; height: auto; display: block; }
                .download-btn { 
                  position: fixed; top: 20px; right: 20px; 
                  background: ${accentColor}; color: white; 
                  padding: 12px 24px; border: none; border-radius: 8px; 
                  cursor: pointer; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                  z-index: 1000;
                }
                .download-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.3); }
              </style>
            </head>
            <body>
              <button class="download-btn" onclick="downloadPDF()">📄 PDF Herunterladen</button>
              <div class="pdf-container">
                <img src="${imageData}" alt="TaskFuchs Zeiterfassung Report" />
              </div>
              <script>
                function downloadPDF() {
                  const link = document.createElement('a');
                  link.download = 'TaskFuchs_Zeiterfassung_${rangeText.replace(/[^a-zA-Z0-9]/g, '_')}.png';
                  link.href = '${imageData}';
                  link.click();
                }
                
                // Auto-trigger print dialog for PDF saving
                setTimeout(() => {
                  if (confirm('Möchten Sie das PDF jetzt speichern/drucken?')) {
                    window.print();
                  }
                }, 1000);
              </script>
            </body>
          </html>
        `);
        pdfWindow.document.close();
      }

      // Also trigger download directly
      const link = document.createElement('a');
      link.download = `TaskFuchs_Zeiterfassung_${rangeText.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.href = imageData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Fehler beim Erstellen des PDF-Exports. Bitte versuchen Sie es erneut.');
    }
  };

  // Erweiterte und robuste Statistik-Berechnung
  const statistics = useMemo(() => {
    // Alle Tasks für den gewählten Zeitraum
    const allTasks = state.tasks.filter(task => {
      // Berücksichtige alle Tasks im Zeitraum, nicht nur abgeschlossene
      return isTaskInRange(task, selectedRange) || (task.completed && isTaskInRange(task, selectedRange));
    });

    const completedTasks = allTasks.filter(task => task.completed);
    const incompleteTasks = allTasks.filter(task => !task.completed);
    
    // Robuste Zeitberechnung mit verschiedenen Feldern als Fallback
    const totalPlannedTime = completedTasks.reduce((sum, task) => {
      return sum + (task.estimatedTime || 0);
    }, 0);
    
    const totalActualTime = completedTasks.reduce((sum, task) => {
      return sum + (task.trackedTime || task.actualTime || 0);
    }, 0);

    const totalPlannedTimeAll = allTasks.reduce((sum, task) => {
      return sum + (task.estimatedTime || 0);
    }, 0);

    const timeDeviation = totalActualTime - totalPlannedTime;
    // Robuste Effizienz-Berechnung: verhindert Infinity und macht Division durch 0 intuitiver
    const efficiency = totalPlannedTime > 0 && totalActualTime > 0 
      ? (totalPlannedTime / totalActualTime) * 100 
      : totalPlannedTime > 0 && totalActualTime === 0 
        ? 0  // Geplant aber nicht gearbeitet = 0% Effizienz
        : 100; // Keine Planung = 100% "Effizienz" als Standard
    const completionRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0;

    // Erweiterte Produktivitäts-Metriken
    const averageTaskTime = completedTasks.length > 0 ? totalActualTime / completedTasks.length : 0;
    const tasksPerHour = totalActualTime > 0 ? (completedTasks.length / (totalActualTime / 60)) : 0;
    
    // Fokus-Score basierend auf verschiedenen Faktoren
    const focusScore = Math.min(100, Math.max(0, 
      (completionRate * 0.4) + 
      (Math.min(efficiency, 120) * 0.3) + 
      (Math.min(tasksPerHour * 20, 30) * 0.3)
    ));

    // Tag-Analyse für beste Arbeitszeiten
    const workingHours = completedTasks.map(task => {
      const taskDate = task.completedAt || task.updatedAt;
      if (taskDate) {
        const parsedDate = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
        if (isValid(parsedDate)) {
          return parsedDate.getHours();
        }
      }
      return null;
    }).filter(hour => hour !== null);

    const hourCounts = workingHours.reduce((acc: any, hour) => {
      if (hour !== null) {
        acc[hour] = (acc[hour] || 0) + 1;
      }
      return acc;
    }, {});

    const bestHour = Object.keys(hourCounts).length > 0 
      ? parseInt(Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b))
      : 9;

    // Erweiterte Chart-Daten mit mehr Details
    const chartData: ChartData[] = [];
    const periods = selectedRange === 'year' ? 12 : 7;
    
    for (let i = periods - 1; i >= 0; i--) {
      let date: Date;
      let label: string;
      
      switch (selectedRange) {
        case 'today':
          date = subDays(new Date(), i);
          label = format(date, 'EEE', { locale: de });
          break;
        case 'week':
          date = subWeeks(new Date(), i);
          label = `KW ${format(date, 'w', { locale: de })}`;
          break;
        case 'month':
          date = subMonths(new Date(), i);
          label = format(date, 'MMM', { locale: de });
          break;
        case 'year':
          date = subMonths(new Date(), i);
          label = format(date, 'MMM', { locale: de });
          break;
        default:
          date = subDays(new Date(), i);
          label = format(date, 'EEE', { locale: de });
      }

      const periodTasks = state.tasks.filter(task => {
        const taskDate = task.completedAt || task.updatedAt;
        if (!taskDate) return false;
        
        const parsedDate = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
        if (!isValid(parsedDate)) return false;
        
        switch (selectedRange) {
          case 'today':
            return format(parsedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
          case 'week':
            return format(parsedDate, 'yyyy-w') === format(date, 'yyyy-w');
          case 'month':
          case 'year':
            return format(parsedDate, 'yyyy-MM') === format(date, 'yyyy-MM');
          default:
            return false;
        }
      });

      const completedPeriodTasks = periodTasks.filter(task => task.completed);
      const planned = completedPeriodTasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0);
      const actual = completedPeriodTasks.reduce((sum, task) => sum + (task.trackedTime || task.actualTime || 0), 0);
      const periodEfficiency = planned > 0 && actual > 0 ? (planned / actual) * 100 : 0;

      chartData.push({
        label,
        planned,
        actual,
        efficiency: Math.round(periodEfficiency),
        tasks: completedPeriodTasks.length
      });
    }

    // Trend-Berechnungen mit robuster Effizienz-Behandlung
    const currentPeriodData = chartData[chartData.length - 1];
    const previousPeriodData = chartData[chartData.length - 2];
    const efficiencyTrend = previousPeriodData && currentPeriodData && 
      isFinite(currentPeriodData.efficiency) && isFinite(previousPeriodData.efficiency)
      ? currentPeriodData.efficiency - previousPeriodData.efficiency
      : 0;

    const tasksTrend = previousPeriodData && currentPeriodData
      ? currentPeriodData.tasks - previousPeriodData.tasks
      : 0;

    // Top 10 Aufgaben nach Arbeitszeit
    const topTasksByTime = allTasks
      .filter(task => (task.trackedTime || task.actualTime || 0) > 0)
      .sort((a, b) => (b.trackedTime || b.actualTime || 0) - (a.trackedTime || a.actualTime || 0))
      .slice(0, 10)
      .map(task => ({
        id: task.id,
        title: task.title,
        timeWorked: task.trackedTime || task.actualTime || 0,
        project: task.projectId ? state.columns.find(col => col.id === task.projectId && col.type === 'project')?.title || 'Unbekanntes Projekt' : 'Ohne Projekt',
        completed: task.completed
      }));

    // Top 10 Projekte nach Arbeitszeit (mit Umbenennungsberücksichtigung)
    const projectTimeMap = new Map<string, { name: string, timeWorked: number, taskCount: number }>();
    
    allTasks.forEach(task => {
      const timeWorked = task.trackedTime || task.actualTime || 0;
      if (timeWorked > 0) {
        if (task.projectId) {
          const project = state.columns.find(col => col.id === task.projectId && col.type === 'project');
          const projectName = project?.title || 'Unbekanntes Projekt';
          const existing = projectTimeMap.get(task.projectId);
          
          if (existing) {
            existing.timeWorked += timeWorked;
            existing.taskCount += 1;
            // Aktueller Name überschreibt den alten (für Umbenennungen)
            existing.name = projectName;
          } else {
            projectTimeMap.set(task.projectId, {
              name: projectName,
              timeWorked,
              taskCount: 1
            });
          }
        } else {
          // Aufgaben ohne Projekt
          const existing = projectTimeMap.get('no-project');
          if (existing) {
            existing.timeWorked += timeWorked;
            existing.taskCount += 1;
          } else {
            projectTimeMap.set('no-project', {
              name: 'Ohne Projekt',
              timeWorked,
              taskCount: 1
            });
          }
        }
      }
    });

    const topProjectsByTime = Array.from(projectTimeMap.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        timeWorked: data.timeWorked,
        taskCount: data.taskCount
      }))
      .sort((a, b) => b.timeWorked - a.timeWorked)
      .slice(0, 10);

    return {
      // Basis-Metriken
      tasksCompleted: completedTasks.length,
      totalTasks: allTasks.length,
      incompleteTasks: incompleteTasks.length,
      completionRate: Math.round(completionRate),
      
      // Zeit-Metriken
      totalPlannedTime,
      totalActualTime,
      totalPlannedTimeAll,
      timeDeviation: Math.round(timeDeviation),
      efficiency: Math.round(efficiency),
      averageTaskTime: Math.round(averageTaskTime),
      
      // Erweiterte Metriken
      focusScore: Math.round(focusScore),
      tasksPerHour: Math.round(tasksPerHour * 10) / 10,
      bestWorkingHour: bestHour,
      
      // Trend-Daten
      efficiencyTrend: Math.round(efficiencyTrend),
      tasksTrend,
      
      // Chart-Daten
      chartData,
      
      // Top Listen
      topTasksByTime,
      topProjectsByTime
    };
  }, [state.tasks, selectedRange, isTaskInRange]);

  // Intelligente Insights mit Prioritäten
  const insights = useMemo((): Insight[] => {
    const insights: Insight[] = [];

    // Effizienz-Insights mit intuitiveren Meldungen
    if (statistics.totalActualTime === 0 && statistics.totalPlannedTime > 0) {
      insights.push({
        icon: AlertCircle,
        title: s.insights.timeTrackingMissing(),
        description: s.insights.timeTrackingMissingDesc(),
        color: "text-amber-800 dark:text-amber-200",
        bgColor: "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20",
        iconColor: "#f59e0b",
        priority: 9
      });
    } else if (statistics.totalPlannedTime === 0 && statistics.totalActualTime > 0) {
      insights.push({
        icon: Clock,
        title: s.insights.spontaneousProductivity(),
        description: s.insights.spontaneousProductivityDesc(),
        color: "text-blue-800 dark:text-blue-200",
        bgColor: "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
        iconColor: "#3b82f6",
        priority: 7
      });
    } else if (statistics.efficiency > 120) {
      insights.push({
        icon: Zap,
        title: s.insights.exceptionalEfficiency(),
        description: s.insights.exceptionalEfficiencyDesc(Math.round(statistics.efficiency)),
        color: "text-purple-800 dark:text-purple-200",
        bgColor: "bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20",
        iconColor: "#8b5cf6",
        priority: 10
      });
    } else if (statistics.efficiency > 100) {
      insights.push({
        icon: Trophy,
        title: s.insights.aboveExpectations(),
        description: s.insights.aboveExpectationsDesc(Math.round(statistics.efficiency)),
        color: "text-green-800 dark:text-green-200",
        bgColor: "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
        iconColor: "#10b981",
        priority: 8
      });
    } else if (statistics.efficiency < 60 && statistics.totalActualTime > 0) {
      insights.push({
        icon: AlertCircle,
        title: s.insights.optimizationPotential(),
        description: s.insights.optimizationPotentialDesc(Math.round(statistics.efficiency)),
        color: "text-orange-800 dark:text-orange-200",
        bgColor: "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20",
        iconColor: "#f97316",
        priority: 9
      });
    }

    // Fokus-Score Insights
    if (statistics.focusScore > 85) {
      insights.push({
        icon: Brain,
        title: s.insights.laserFocus(),
        description: s.insights.laserFocusDesc(statistics.focusScore),
        color: "text-blue-800 dark:text-blue-200",
        bgColor: "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
        iconColor: "#3b82f6",
        priority: 7
      });
    } else if (statistics.focusScore < 50) {
      insights.push({
        icon: Target,
        title: s.insights.strengthenFocus(),
        description: s.insights.strengthenFocusDesc(statistics.focusScore),
        color: "text-indigo-800 dark:text-indigo-200",
        bgColor: "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20",
        iconColor: "#6366f1",
        priority: 6
      });
    }

    // Produktivitäts-Insights
    if (statistics.tasksPerHour > 2) {
      insights.push({
        icon: Flame,
        title: s.insights.productivityChampion(),
        description: s.insights.productivityChampionDesc(statistics.tasksPerHour),
        color: "text-red-800 dark:text-red-200",
        bgColor: "bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20",
        iconColor: "#ef4444",
        priority: 8
      });
    }

    // Zeit-Management Insights
    if (statistics.timeDeviation < -60) {
      insights.push({
        icon: Clock,
        title: s.insights.timeManagementMaster(),
        description: s.insights.timeManagementMasterDesc(Math.abs(statistics.timeDeviation)),
        color: "text-emerald-800 dark:text-emerald-200",
        bgColor: "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20",
        iconColor: "#059669",
        priority: 6
      });
    } else if (statistics.timeDeviation > 120) {
      insights.push({
        icon: Timer,
        title: s.insights.adjustTimeEstimates(),
        description: s.insights.adjustTimeEstimatesDesc(statistics.timeDeviation),
        color: "text-yellow-800 dark:text-yellow-200",
        bgColor: "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20",
        iconColor: "#eab308",
        priority: 7
      });
    }

    // Arbeitszeit-Insights
    const hour = statistics.bestWorkingHour;
    if (hour >= 6 && hour <= 10) {
      insights.push({
        icon: Sun,
        title: s.insights.earlyBirdAdvantage(),
        description: s.insights.earlyBirdAdvantageDesc(hour),
        color: "text-amber-800 dark:text-amber-200",
        bgColor: "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20",
        iconColor: "#f59e0b",
        priority: 4
      });
    } else if (hour >= 20 || hour <= 2) {
      insights.push({
        icon: Moon,
        title: s.insights.nightOwl(),
        description: s.insights.nightOwlDesc(hour),
        color: "text-slate-800 dark:text-slate-200",
        bgColor: "bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20",
        iconColor: "#64748b",
        priority: 4
      });
    }

    // Trend-Insights mit besserer Handhabung von Edge Cases
    if (statistics.efficiencyTrend > 10 && isFinite(statistics.efficiencyTrend)) {
      insights.push({
        icon: TrendingUp,
        title: s.insights.upwardTrend(),
        description: s.insights.upwardTrendDesc(Math.round(statistics.efficiencyTrend)),
        color: "text-green-800 dark:text-green-200",
        bgColor: "bg-gradient-to-r from-green-50 to-lime-50 dark:from-green-900/20 dark:to-lime-900/20",
        iconColor: "#22c55e",
        priority: 5
      });
    }

    // Completeness-Insights
    if (statistics.completionRate === 100) {
      insights.push({
        icon: Sparkles,
        title: s.insights.perfectCompletion(),
        description: s.insights.perfectCompletionDesc(),
        color: "text-purple-800 dark:text-purple-200",
        bgColor: "bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
        iconColor: "#a855f7",
        priority: 10
      });
    } else if (statistics.completionRate < 50) {
      insights.push({
        icon: RotateCcw,
        title: s.insights.refocusNeeded(),
        description: s.insights.refocusNeededDesc(statistics.completionRate),
        color: "text-gray-800 dark:text-gray-200",
        bgColor: "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20",
        iconColor: "#6b7280",
        priority: 8
      });
    }

    // === ERWEITERTE SMART INSIGHTS ===

    // 1. Streak-Analyse & Konsistenz
    const completedTasksByDay = state.tasks
      .filter(task => task.completed && isTaskInRange(task, selectedRange))
      .reduce((acc: any, task) => {
        const date = format(parseISO(task.completedAt || task.updatedAt || ''), 'yyyy-MM-dd');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});
    
    const dayStreaks = Object.keys(completedTasksByDay);
    const currentStreak = dayStreaks.length;
    
    if (currentStreak >= 7) {
      insights.push({
        icon: Star,
        title: "Konsistenz-Champion!",
        description: `${currentStreak} Tage in Folge produktiv! Du baust starke Gewohnheiten auf.`,
        color: "text-yellow-800 dark:text-yellow-200",
        bgColor: "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20",
        iconColor: "#fbbf24",
        priority: 9
      });
    } else if (currentStreak >= 3) {
      insights.push({
        icon: Award,
        title: "Guter Rhythmus!",
        description: `${currentStreak} produktive Tage. Du bist auf dem richtigen Weg!`,
        color: "text-blue-800 dark:text-blue-200",
        bgColor: "bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20",
        iconColor: "#3b82f6",
        priority: 6
      });
    }

    // 2. Workload-Analyse & Überlastung
    const tasksPerDay = statistics.tasksCompleted / Math.max(1, dayStreaks.length);
    const avgTimePerTask = statistics.averageTaskTime;
    
    if (tasksPerDay > 8 && avgTimePerTask > 60) {
      insights.push({
        icon: AlertCircle,
        title: "Überlastungsrisiko!",
        description: `${Math.round(tasksPerDay)} Tasks täglich mit ${Math.round(avgTimePerTask)}min pro Task. Achte auf Work-Life-Balance!`,
        color: "text-red-800 dark:text-red-200",
        bgColor: "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20",
        iconColor: "#ef4444",
        priority: 10
      });
    } else if (tasksPerDay < 2 && statistics.totalTasks > 5) {
      insights.push({
        icon: Play,
        title: "Mehr Momentum möglich",
        description: `Nur ${Math.round(tasksPerDay)} Tasks täglich. Du kannst mehr schaffen!`,
        color: "text-indigo-800 dark:text-indigo-200",
        bgColor: "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20",
        iconColor: "#6366f1",
        priority: 5
      });
    }

    // 3. Deep Work vs. Shallow Work Analyse
    const longTasks = state.tasks.filter(task => 
      task.completed && isTaskInRange(task, selectedRange) && 
      (task.trackedTime || task.actualTime || 0) > 120
    );
    const shortTasks = state.tasks.filter(task => 
      task.completed && isTaskInRange(task, selectedRange) && 
      (task.trackedTime || task.actualTime || 0) < 30
    );

    if (longTasks.length > shortTasks.length) {
      insights.push({
        icon: Brain,
        title: "Deep Work Spezialist!",
        description: `${longTasks.length} Deep Work Sessions vs. ${shortTasks.length} Quick Tasks. Hervorragend für komplexe Aufgaben!`,
        color: "text-violet-800 dark:text-violet-200",
        bgColor: "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20",
        iconColor: "#8b5cf6",
        priority: 7
      });
    } else if (shortTasks.length > longTasks.length * 3) {
      insights.push({
        icon: Activity,
        title: "Task-Sprinter!",
        description: `${shortTasks.length} Quick Tasks erledigt. Perfekt für Administrative Aufgaben!`,
        color: "text-cyan-800 dark:text-cyan-200",
        bgColor: "bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20",
        iconColor: "#06b6d4",
        priority: 5
      });
    }

    // 4. Deadline-Performance Analyse
    const overdueTasks = state.tasks.filter(task => {
      if (!task.reminderDate) return false;
      const reminder = parseISO(task.reminderDate);
      const now = new Date();
      return !task.completed && reminder < now;
    });

    if (overdueTasks.length === 0 && statistics.totalTasks > 3) {
      insights.push({
        icon: CheckCircle2,
        title: "Deadline-Held!",
        description: "Keine überfälligen Tasks! Du hältst alle Termine ein.",
        color: "text-green-800 dark:text-green-200",
        bgColor: "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
        iconColor: "#10b981",
        priority: 8
      });
    } else if (overdueTasks.length > 3) {
      insights.push({
        icon: AlertCircle,
        title: "Deadline-Alarm!",
        description: `${overdueTasks.length} überfällige Tasks. Zeit für Prioritäten-Check!`,
        color: "text-red-800 dark:text-red-200",
        bgColor: "bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20",
        iconColor: "#ef4444",
        priority: 9
      });
    }

    // 5. Wochentag-Performance Analyse
    const tasksByWeekday = state.tasks
      .filter(task => task.completed && isTaskInRange(task, selectedRange))
      .reduce((acc: any, task) => {
        const date = parseISO(task.completedAt || task.updatedAt || '');
        const weekday = format(date, 'EEEE', { locale: de });
        acc[weekday] = (acc[weekday] || 0) + 1;
        return acc;
      }, {});

    const bestWeekday = Object.keys(tasksByWeekday).reduce((a, b) => 
      tasksByWeekday[a] > tasksByWeekday[b] ? a : b, 'Montag'
    );
    
    if (tasksByWeekday[bestWeekday] > 2) {
      insights.push({
        icon: Calendar,
        title: `${bestWeekday} ist dein Tag!`,
        description: `${tasksByWeekday[bestWeekday]} Tasks am ${bestWeekday} - plane wichtige Aufgaben für diesen Tag!`,
        color: "text-purple-800 dark:text-purple-200",
        bgColor: "bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20",
        iconColor: "#a855f7",
        priority: 4
      });
    }

    // 6. Energie-Management & Produktivitätsmuster
    const morningTasks = state.tasks.filter(task => {
      if (!task.completed || !isTaskInRange(task, selectedRange)) return false;
      const hour = parseISO(task.completedAt || task.updatedAt || '').getHours();
      return hour >= 6 && hour <= 12;
    });

    const eveningTasks = state.tasks.filter(task => {
      if (!task.completed || !isTaskInRange(task, selectedRange)) return false;
      const hour = parseISO(task.completedAt || task.updatedAt || '').getHours();
      return hour >= 18 && hour <= 23;
    });

    if (morningTasks.length > eveningTasks.length * 1.5) {
      insights.push({
        icon: Sun,
        title: "Morgen-Power!",
        description: `${morningTasks.length} vs. ${eveningTasks.length} Tasks. Du nutzt die Morgenstunden optimal!`,
        color: "text-orange-800 dark:text-orange-200",
        bgColor: "bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20",
        iconColor: "#f97316",
        priority: 6
      });
    } else if (eveningTasks.length > morningTasks.length * 1.5) {
      insights.push({
        icon: Moon,
        title: "Abend-Produktivität!",
        description: `${eveningTasks.length} vs. ${morningTasks.length} Tasks. Du blühst abends auf!`,
        color: "text-indigo-800 dark:text-indigo-200",
        bgColor: "bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20",
        iconColor: "#6366f1",
        priority: 6
      });
    }

    // 7. Aufschieberitis-Detektor
    const oldIncompleteTasks = state.tasks.filter(task => {
      if (task.completed) return false;
      const created = parseISO(task.createdAt || '');
      const daysSinceCreated = differenceInMinutes(new Date(), created) / (24 * 60);
      return daysSinceCreated > 7;
    });

    if (oldIncompleteTasks.length > 3) {
      insights.push({
        icon: Pause,
        title: "Aufschieberitis-Alert!",
        description: `${oldIncompleteTasks.length} Tasks seit über einer Woche offen. Zeit zum Handeln!`,
        color: "text-yellow-800 dark:text-yellow-200",
        bgColor: "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20",
        iconColor: "#eab308",
        priority: 8
      });
    }

    // 8. Personal Records & Achievements
    const maxTasksInDay = Math.max(...Object.values(completedTasksByDay) as number[]);
    if (maxTasksInDay >= 10) {
      insights.push({
        icon: Trophy,
        title: "Persönlicher Rekord!",
        description: `${maxTasksInDay} Tasks an einem Tag - das ist dein persönlicher Bestwert!`,
        color: "text-gold-800 dark:text-yellow-200",
        bgColor: "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20",
        iconColor: "#fbbf24",
        priority: 9
      });
    }

    // 9. Fokus vs. Multitasking Analyse
    const tasksWithLongFocus = state.tasks.filter(task => 
      task.completed && isTaskInRange(task, selectedRange) && 
      (task.trackedTime || task.actualTime || 0) > 60
    );

    if (tasksWithLongFocus.length / Math.max(1, statistics.tasksCompleted) > 0.6) {
      insights.push({
        icon: Target,
        title: "Fokus-Master!",
        description: `${Math.round((tasksWithLongFocus.length / statistics.tasksCompleted) * 100)}% deiner Tasks waren Deep Work Sessions. Beeindruckend!`,
        color: "text-emerald-800 dark:text-emerald-200",
        bgColor: "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20",
        iconColor: "#10b981",
        priority: 7
      });
    }

    // 10. Zeitbalance-Analyse
    const totalWorkedMinutes = statistics.totalActualTime;
    const workingDays = Math.max(1, dayStreaks.length);
    const avgHoursPerDay = totalWorkedMinutes / (workingDays * 60);

    if (avgHoursPerDay > 10) {
      insights.push({
        icon: AlertCircle,
        title: "Work-Life-Balance prüfen!",
        description: `${Math.round(avgHoursPerDay * 10) / 10}h täglich im Schnitt. Denk an Pausen und Erholung!`,
        color: "text-red-800 dark:text-red-200",
        bgColor: "bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20",
        iconColor: "#ef4444",
        priority: 10
      });
    } else if (avgHoursPerDay >= 6 && avgHoursPerDay <= 8) {
      insights.push({
        icon: Award,
        title: "Perfekte Balance!",
        description: `${Math.round(avgHoursPerDay * 10) / 10}h täglich - eine gesunde Work-Life-Balance!`,
        color: "text-green-800 dark:text-green-200",
        bgColor: "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
        iconColor: "#10b981",
        priority: 7
      });
    }

    // 11. Verbesserungs-Momentum Analyse
    const recentCompletedTasks = state.tasks.filter(task => {
      if (!task.completed) return false;
      const completedDate = parseISO(task.completedAt || task.updatedAt || '');
      const daysSince = differenceInMinutes(new Date(), completedDate) / (24 * 60);
      return daysSince <= 3;
    });

    const olderCompletedTasks = state.tasks.filter(task => {
      if (!task.completed) return false;
      const completedDate = parseISO(task.completedAt || task.updatedAt || '');
      const daysSince = differenceInMinutes(new Date(), completedDate) / (24 * 60);
      return daysSince > 3 && daysSince <= 10;
    });

    if (recentCompletedTasks.length > olderCompletedTasks.length * 1.5) {
      insights.push({
        icon: TrendingUp,
        title: "Momentum aufgebaut!",
        description: `${recentCompletedTasks.length} Tasks in 3 Tagen vs. ${olderCompletedTasks.length} davor. Du steigerst dich!`,
        color: "text-green-800 dark:text-green-200",
        bgColor: "bg-gradient-to-r from-green-50 to-lime-50 dark:from-green-900/20 dark:to-lime-900/20",
        iconColor: "#22c55e",
        priority: 8
      });
    }

    // 12. Schätzgenauigkeit-Analyse
    const tasksWithEstimates = state.tasks.filter(task => 
      task.completed && isTaskInRange(task, selectedRange) && 
      task.estimatedTime && (task.trackedTime || task.actualTime)
    );

    if (tasksWithEstimates.length >= 3) {
      const accurateEstimates = tasksWithEstimates.filter(task => {
        const estimated = task.estimatedTime || 0;
        const actual = task.trackedTime || task.actualTime || 0;
        const deviation = Math.abs(estimated - actual) / estimated;
        return deviation <= 0.25; // Innerhalb 25% Abweichung
      });

      const accuracyRate = (accurateEstimates.length / tasksWithEstimates.length) * 100;
      
      if (accuracyRate >= 80) {
        insights.push({
          icon: Target,
          title: "Schätz-Genie!",
          description: `${Math.round(accuracyRate)}% präzise Zeitschätzungen. Du kennst deinen Arbeitsrhythmus perfekt!`,
          color: "text-purple-800 dark:text-purple-200",
          bgColor: "bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20",
          iconColor: "#a855f7",
          priority: 7
        });
      } else if (accuracyRate < 40) {
        insights.push({
          icon: Eye,
          title: "Schätzungen kalibrieren",
          description: `Nur ${Math.round(accuracyRate)}% präzise Schätzungen. Tracke mehr für besseres Gefühl!`,
          color: "text-orange-800 dark:text-orange-200",
          bgColor: "bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20",
          iconColor: "#f97316",
          priority: 6
        });
      }
    }

    // 13. Sprint vs. Marathon Arbeitstyp
    const sprintSessions = state.tasks.filter(task => 
      task.completed && isTaskInRange(task, selectedRange) && 
      (task.trackedTime || task.actualTime || 0) >= 15 && 
      (task.trackedTime || task.actualTime || 0) <= 45
    );

    const marathonSessions = state.tasks.filter(task => 
      task.completed && isTaskInRange(task, selectedRange) && 
      (task.trackedTime || task.actualTime || 0) > 120
    );

    if (sprintSessions.length > marathonSessions.length * 2) {
      insights.push({
        icon: Zap,
        title: "Sprint-Spezialist!",
        description: `${sprintSessions.length} Sprint-Sessions (15-45min). Du liebst schnelle Erfolge!`,
        color: "text-cyan-800 dark:text-cyan-200",
        bgColor: "bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20",
        iconColor: "#06b6d4",
        priority: 5
      });
    } else if (marathonSessions.length >= sprintSessions.length) {
      insights.push({
        icon: Brain,
        title: s.insights.marathonThinker(),
        description: s.insights.marathonThinkerDesc(marathonSessions.length),
        color: "text-indigo-800 dark:text-indigo-200",
        bgColor: "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20",
        iconColor: "#6366f1",
        priority: 6
      });
    }

    // Fallback für wenig Daten
    if (insights.length === 0) {
      insights.push({
        icon: Coffee,
        title: s.insights.toNewSuccesses(),
        description: s.insights.toNewSuccessesDesc(),
        color: "text-gray-800 dark:text-gray-200",
        bgColor: "bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900/20 dark:to-blue-900/20",
        iconColor: "#6b7280",
        priority: 1
      });
    }

    return insights.sort((a, b) => b.priority - a.priority).slice(0, 8);
  }, [statistics]);

  // Elegante Stat-Cards mit Gradienten
  const statCards: StatCard[] = useMemo(() => [
    {
      title: s.statCards.completedTasks(),
      value: statistics.tasksCompleted,
      subtitle: `von ${statistics.totalTasks} geplant`,
      icon: CheckCircle2,
      trend: statistics.tasksTrend > 0 ? 'up' : statistics.tasksTrend < 0 ? 'down' : 'neutral',
      trendValue: statistics.tasksTrend !== 0 ? `${statistics.tasksTrend > 0 ? '+' : ''}${statistics.tasksTrend}` : undefined,
      color: state.preferences.accentColor,
      bgGradient: "from-green-500/10 to-emerald-500/10",
      textColor: "text-green-700 dark:text-green-300"
    },
    {
      title: s.statCards.completionRate(),
      value: `${statistics.completionRate}%`,
      subtitle: `${statistics.incompleteTasks} noch offen`,
      icon: Target,
      trend: statistics.completionRate > 80 ? 'up' : statistics.completionRate < 50 ? 'down' : 'neutral',
      color: state.preferences.accentColor,
      bgGradient: "from-blue-500/10 to-cyan-500/10",
      textColor: "text-blue-700 dark:text-blue-300"
    },
    {
      title: s.statCards.timeEfficiency(),
      value: statistics.totalActualTime === 0 && statistics.totalPlannedTime > 0 
        ? s.statCards.noData()
        : statistics.totalPlannedTime === 0 && statistics.totalActualTime > 0
          ? s.statCards.withoutPlan()
          : `${Math.round(statistics.efficiency)}%`,
      subtitle: statistics.totalActualTime === 0 && statistics.totalPlannedTime > 0
        ? s.statCards.startTimerForInsights()
        : statistics.totalPlannedTime === 0 && statistics.totalActualTime > 0
          ? s.statCards.planTimesForInsights()
          : statistics.timeDeviation !== 0 
            ? `${statistics.timeDeviation > 0 ? '+' : ''}${formatTime(Math.abs(statistics.timeDeviation))}`
            : s.statCards.exactlyOnPlan(),
      icon: Clock,
      trend: isFinite(statistics.efficiencyTrend) && statistics.efficiencyTrend > 0 ? 'up' 
        : isFinite(statistics.efficiencyTrend) && statistics.efficiencyTrend < 0 ? 'down' 
        : 'neutral',
      trendValue: isFinite(statistics.efficiencyTrend) && statistics.efficiencyTrend !== 0 
        ? `${statistics.efficiencyTrend > 0 ? '+' : ''}${Math.round(statistics.efficiencyTrend)}%` 
        : undefined,
      color: state.preferences.accentColor,
      bgGradient: "from-purple-500/10 to-indigo-500/10",
      textColor: "text-purple-700 dark:text-purple-300"
    },

  ], [statistics, state.preferences.accentColor, formatTime]);

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ArrowDown className="w-4 h-4 text-red-500" />;
      default:
        return <Equal className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Header Section - Redesigned */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              
              {/* Title Section */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <BarChart3 
                    className="w-8 h-8" 
                    style={{ color: state.preferences.accentColor }}
                  />
                  {s.title()}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {s.subtitle()}
                </p>
              </div>
              
              {/* Controls Section */}
              <div className="flex flex-col gap-4">
                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowPersonalCapacity(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm"
                  >
                    <Users className="w-4 h-4" />
                    Persönliche Kapazität
                  </button>
                  
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:opacity-90 shadow-md"
                    style={{ backgroundColor: state.preferences.accentColor }}
                  >
                    <Download className="w-4 h-4" />
                    Daten exportieren
                  </button>
                </div>
                
                {/* Time Range Selector with Navigation */}
                {/* Range Buttons */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 border border-gray-200 dark:border-gray-600">
                  {(['today', 'week', 'month', 'year'] as TimeRange[]).map((range) => {
                    const labels = {
                      today: s.timeRange.today(),
                      week: s.timeRange.week(), 
                      month: s.timeRange.month(),
                      year: s.timeRange.year()
                    };
                    
                    return (
                      <button
                        key={range}
                        onClick={() => handleRangeChange(range)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedRange === range
                            ? 'text-white shadow-md'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        style={selectedRange === range ? { backgroundColor: state.preferences.accentColor } : {}}
                      >
                        {labels[range]}
                      </button>
                    );
                  })}
                </div>
                
                {/* Navigation Controls */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={navigatePrevious}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Zurück
                  </button>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedRange === 'today' && format(currentDate, 'dd.MM.yyyy', { locale: de })}
                      {selectedRange === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd.MM.')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd.MM.yyyy')}`}
                      {selectedRange === 'month' && format(currentDate, 'MMMM yyyy', { locale: de })}
                      {selectedRange === 'year' && format(currentDate, 'yyyy')}
                    </div>
                  </div>
                  
                  <button
                    onClick={navigateNext}
                    disabled={!canNavigateNext()}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      canNavigateNext()
                        ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                        : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    Vor
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {statCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                {/* Icon and Trend Section */}
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${card.color}15` }}
                  >
                    <IconComponent 
                      className="w-6 h-6"
                      style={{ color: card.color }}
                    />
                  </div>
                  {card.trend && (
                    <div className="flex items-center gap-1">
                      {getTrendIcon(card.trend)}
                      {card.trendValue && (
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {card.trendValue}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Content Section */}
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {card.value}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {card.title}
                  </div>
                  {card.subtitle && (
                    <div className="text-xs font-medium" style={{ color: card.color }}>
                      {card.subtitle}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Chart Section */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Time Analysis Widget */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${state.preferences.accentColor}15` }}
                >
                  <BarChart3 
                    className="w-5 h-5" 
                    style={{ color: state.preferences.accentColor }} 
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {s.sections.timePerformanceAnalysis()}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {s.sections.plannedVsActual()}
                  </p>
                </div>
              </div>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {formatTime(statistics.totalPlannedTime)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{s.sections.plannedTime()}</div>
                    <div className="mt-2 w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {formatTime(statistics.totalActualTime)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{s.sections.actualTime()}</div>
                    <div className="mt-2 w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min((statistics.totalActualTime / Math.max(statistics.totalPlannedTime, 1)) * 100, 100)}%`,
                          backgroundColor: state.preferences.accentColor
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart Area Placeholder */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8">
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {s.sections.chartPlaceholder()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Insights Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${state.preferences.accentColor}15` }}
                >
                  <Brain 
                    className="w-5 h-5" 
                    style={{ color: state.preferences.accentColor }} 
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {s.sections.smartInsights()}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {s.sections.aiRecommendations()}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                {insights.slice(0, 3).map((insight, index) => {
                  const IconComponent = insight.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: insight.bgColor }}
                      >
                        <IconComponent 
                          className="w-4 h-4"
                          style={{ color: insight.iconColor }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {insight.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Top Lists */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Top 10 Aufgaben */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${state.preferences.accentColor}15` }}
              >
                <FileText 
                  className="w-5 h-5" 
                  style={{ color: state.preferences.accentColor }} 
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Top 10 Aufgaben nach Arbeitszeit
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Aufgaben mit der meisten investierten Zeit
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              {statistics.topTasksByTime.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Keine Zeiterfassung für diesen Zeitraum
                  </p>
                </div>
              ) : (
                statistics.topTasksByTime.map((task, index) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: state.preferences.accentColor }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {task.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {task.project} • {task.completed ? 'Erledigt' : 'Offen'}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold" style={{ color: state.preferences.accentColor }}>
                      {formatTime(task.timeWorked)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top 10 Projekte */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${state.preferences.accentColor}15` }}
              >
                <Folder 
                  className="w-5 h-5" 
                  style={{ color: state.preferences.accentColor }} 
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Top 10 Projekte nach Arbeitszeit
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Projekte mit der meisten investierten Zeit
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              {statistics.topProjectsByTime.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Keine Zeiterfassung für diesen Zeitraum
                  </p>
                </div>
              ) : (
                statistics.topProjectsByTime.map((project, index) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: state.preferences.accentColor }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {project.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {project.taskCount} Aufgabe{project.taskCount !== 1 ? 'n' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold" style={{ color: state.preferences.accentColor }}>
                      {formatTime(project.timeWorked)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Best Working Time */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {s.metrics.bestWorkingTime()}
              </h3>
            </div>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
              {statistics.bestWorkingHour}:00 Uhr
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {s.metrics.mostProductiveHere()}
            </p>
          </div>

          {/* Productivity Rate */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-6 border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                {s.metrics.tasksPerHour()}
              </h3>
            </div>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100 mb-2">
              {statistics.tasksPerHour}
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              {s.metrics.averageProductivity()}
            </p>
          </div>

          {/* Average Task Time */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Timer className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                {s.metrics.avgTaskTime()}
              </h3>
            </div>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-2">
              {formatTime(statistics.averageTaskTime)}
            </div>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              {s.metrics.perCompletedTask()}
            </p>
          </div>
        </div>
      </div>

      {/* Time Budget Reports */}
      <TimebudgetReports className="mt-8" />

      {/* Capacity Reports */}
      <CapacityReports className="mt-8" />

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Zeiterfassung exportieren</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Exportiere alle Zeiterfassungen für {selectedRange === 'today' && format(currentDate, 'dd.MM.yyyy', { locale: de })}
                  {selectedRange === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd.MM.')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd.MM.yyyy')}`}
                  {selectedRange === 'month' && format(currentDate, 'MMMM yyyy', { locale: de })}
                  {selectedRange === 'year' && format(currentDate, 'yyyy')} als:
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FileText className="w-5 h-5 text-green-500" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">CSV-Datei</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Für Excel, Google Sheets</div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleExport('xlsx')}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Excel-Datei</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Native Excel-Format</div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleExport('pdf')}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FileText className="w-5 h-5 text-red-500" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">PDF-Bericht</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Schöner Bericht mit Diagrammen</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personal Capacity Modal */}
      <PersonalCapacityModal 
        isOpen={showPersonalCapacity} 
        onClose={() => setShowPersonalCapacity(false)} 
      />
    </div>
  );
}
