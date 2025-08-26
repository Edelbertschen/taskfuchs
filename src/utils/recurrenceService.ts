import { 
  RecurrenceRule, 
  RecurrencePattern, 
  RecurrenceEnd, 
  RecurrenceException, 
  RecurrencePreview, 
  RecurrenceConflict, 
  RecurrenceValidation,
  RecurrenceTemplate,
  RecurringTask,
  Task,
  WeekDay,
  RECURRENCE_CONSTANTS
} from '../types';

/**
 * Comprehensive service for handling recurring tasks
 * Features:
 * - Flexible pattern calculation
 * - Intelligent conflict resolution
 * - Holiday and weekend handling
 * - Dynamic placeholder replacement
 * - Exception management
 * - Preview generation
 */
export class RecurrenceService {
  private holidays: Set<string> = new Set();
  
  constructor() {
    this.initializeHolidays();
  }

  /**
   * Initialize holidays (disabled - holidays are no longer considered)
   */
  private initializeHolidays() {
    // Holidays are no longer considered for recurrence patterns
    // this.holidays remains empty
  }

  /**
   * Calculate Easter Sunday for a given year
   */
  private calculateEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = Math.floor((h + l - 7 * m + 114) / 31);
    const p = (h + l - 7 * m + 114) % 31;
    return new Date(year, n - 1, p + 1);
  }

  /**
   * Generate next occurrence dates for a recurrence rule
   */
  generateOccurrences(rule: RecurrenceRule, startDate: Date, count: number = 10): string[] {
    const dates: string[] = [];
    let currentDate = new Date(startDate);
    let generatedCount = 0;
    let iterationCount = 0;
    const maxIterations = count * 50; // Prevent infinite loops

    while (generatedCount < count && iterationCount < maxIterations) {
      iterationCount++;
      
      const nextDate = this.calculateNextOccurrence(rule.pattern, currentDate);
      
      if (!nextDate) break;
      
      const dateString = this.formatDate(nextDate);
      
      // Check if we've passed the end date
      if (rule.end.type === 'on_date' && rule.end.date) {
        if (nextDate > new Date(rule.end.date)) break;
      }
      
      // Check for exceptions
      if (this.hasException(rule, dateString)) {
        currentDate = nextDate;
        continue;
      }
      
      // Check for conflicts and resolve them
      const resolvedDate = this.resolveConflicts(rule.pattern, nextDate);
      if (resolvedDate) {
        dates.push(this.formatDate(resolvedDate));
        generatedCount++;
      }
      
      currentDate = nextDate;
    }

    return dates;
  }

  /**
   * Calculate the next occurrence based on pattern
   */
  private calculateNextOccurrence(pattern: RecurrencePattern, fromDate: Date): Date | null {
    const nextDate = new Date(fromDate);
    
    switch (pattern.type) {
      case 'daily':
        return this.calculateDailyOccurrence(pattern, nextDate);
      case 'weekly':
        return this.calculateWeeklyOccurrence(pattern, nextDate);
      case 'monthly':
        return this.calculateMonthlyOccurrence(pattern, nextDate);
      case 'yearly':
        return this.calculateYearlyOccurrence(pattern, nextDate);
      case 'custom':
        return this.calculateCustomOccurrence(pattern, nextDate);
      default:
        return null;
    }
  }

  /**
   * Calculate daily occurrence
   */
  private calculateDailyOccurrence(pattern: RecurrencePattern, fromDate: Date): Date {
    const nextDate = new Date(fromDate);
    nextDate.setDate(nextDate.getDate() + pattern.interval);
    
    // Handle specific time
    if (pattern.specificTime && !pattern.allDay) {
      const [hours, minutes] = pattern.specificTime.split(':').map(Number);
      nextDate.setHours(hours, minutes, 0, 0);
    }
    
    return nextDate;
  }

  /**
   * Calculate weekly occurrence
   */
  private calculateWeeklyOccurrence(pattern: RecurrencePattern, fromDate: Date): Date | null {
    if (!pattern.weekdays || pattern.weekdays.length === 0) {
      // Default to same day of week
      const nextDate = new Date(fromDate);
      nextDate.setDate(nextDate.getDate() + (7 * pattern.interval));
      return nextDate;
    }

    const nextDate = new Date(fromDate);
    nextDate.setDate(nextDate.getDate() + 1); // Start from next day
    
    // Find next occurrence within the pattern
    for (let i = 0; i < 7 * pattern.interval; i++) {
      const currentWeekday = this.getWeekdayName(nextDate.getDay());
      
      if (pattern.weekdays.includes(currentWeekday)) {
        if (pattern.specificTime && !pattern.allDay) {
          const [hours, minutes] = pattern.specificTime.split(':').map(Number);
          nextDate.setHours(hours, minutes, 0, 0);
        }
        return nextDate;
      }
      
      nextDate.setDate(nextDate.getDate() + 1);
    }
    
    return null;
  }

  /**
   * Calculate monthly occurrence
   */
  private calculateMonthlyOccurrence(pattern: RecurrencePattern, fromDate: Date): Date | null {
    const nextDate = new Date(fromDate);
    nextDate.setMonth(nextDate.getMonth() + pattern.interval);
    
    if (pattern.monthlyType === 'date' && pattern.monthDay) {
      // Specific date of month (e.g., 15th)
      const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      const targetDay = Math.min(pattern.monthDay, lastDayOfMonth);
      nextDate.setDate(targetDay);
    } else if (pattern.monthlyType === 'weekday' && pattern.monthWeekday && pattern.monthWeekOccurrence) {
      // Specific weekday of month (e.g., 2nd Tuesday)
      const targetDate = this.findNthWeekdayOfMonth(
        nextDate.getFullYear(),
        nextDate.getMonth(),
        pattern.monthWeekday,
        pattern.monthWeekOccurrence
      );
      
      if (targetDate) {
        nextDate.setDate(targetDate.getDate());
      } else {
        return null;
      }
    }
    
    if (pattern.specificTime && !pattern.allDay) {
      const [hours, minutes] = pattern.specificTime.split(':').map(Number);
      nextDate.setHours(hours, minutes, 0, 0);
    }
    
    return nextDate;
  }

  /**
   * Calculate yearly occurrence
   */
  private calculateYearlyOccurrence(pattern: RecurrencePattern, fromDate: Date): Date | null {
    const nextDate = new Date(fromDate);
    nextDate.setFullYear(nextDate.getFullYear() + pattern.interval);
    
    if (pattern.yearlyType === 'date' && pattern.yearMonth && pattern.yearDay) {
      // Specific date (e.g., January 15th)
      nextDate.setMonth(pattern.yearMonth - 1, pattern.yearDay);
    } else if (pattern.yearlyType === 'weekday' && pattern.yearMonth && pattern.yearWeekday && pattern.yearWeekOccurrence) {
      // Specific weekday (e.g., 2nd Tuesday of January)
      const targetDate = this.findNthWeekdayOfMonth(
        nextDate.getFullYear(),
        pattern.yearMonth - 1,
        pattern.yearWeekday,
        pattern.yearWeekOccurrence
      );
      
      if (targetDate) {
        nextDate.setMonth(pattern.yearMonth - 1, targetDate.getDate());
      } else {
        return null;
      }
    }
    
    if (pattern.specificTime && !pattern.allDay) {
      const [hours, minutes] = pattern.specificTime.split(':').map(Number);
      nextDate.setHours(hours, minutes, 0, 0);
    }
    
    return nextDate;
  }

  /**
   * Calculate custom occurrence (basic implementation)
   */
  private calculateCustomOccurrence(pattern: RecurrencePattern, fromDate: Date): Date | null {
    // Basic implementation - could be extended with full cron support
    if (!pattern.customRule) return null;
    
    // For now, fallback to daily
    return this.calculateDailyOccurrence({ ...pattern, type: 'daily' }, fromDate);
  }

  /**
   * Find nth weekday of month
   */
  private findNthWeekdayOfMonth(year: number, month: number, weekday: WeekDay, occurrence: number): Date | null {
    const firstDayOfMonth = new Date(year, month, 1);
    const targetWeekdayIndex = this.getWeekdayIndex(weekday);
    
    if (occurrence === -1) {
      // Last occurrence
      const lastDayOfMonth = new Date(year, month + 1, 0);
      for (let day = lastDayOfMonth.getDate(); day >= 1; day--) {
        const date = new Date(year, month, day);
        if (date.getDay() === targetWeekdayIndex) {
          return date;
        }
      }
    } else {
      // Nth occurrence
      let count = 0;
      for (let day = 1; day <= 31; day++) {
        const date = new Date(year, month, day);
        if (date.getMonth() !== month) break;
        
        if (date.getDay() === targetWeekdayIndex) {
          count++;
          if (count === occurrence) {
            return date;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Resolve conflicts (weekends, holidays)
   */
  private resolveConflicts(pattern: RecurrencePattern, date: Date): Date | null {
    let resolvedDate = new Date(date);
    const dateString = this.formatDate(resolvedDate);
    
    // Check for weekend conflicts
    if (pattern.skipWeekends && this.isWeekend(resolvedDate)) {
      switch (pattern.adjustForWeekends) {
        case 'skip':
          return null;
        case 'before':
          resolvedDate = this.findPreviousWeekday(resolvedDate);
          break;
        case 'after':
          resolvedDate = this.findNextWeekday(resolvedDate);
          break;
      }
    }
    
    // Holiday conflicts are no longer considered
    // (skipHolidays setting is ignored)
    
    return resolvedDate;
  }

  /**
   * Check if date has an exception
   */
  private hasException(rule: RecurrenceRule, date: string): boolean {
    return rule.exceptions.some(exception => 
      exception.date === date && exception.type === 'skip'
    );
  }

  /**
   * Generate task from rule and date
   */
  generateTask(rule: RecurrenceRule, scheduledDate: Date, instanceNumber: number = 1): RecurringTask {
    const template = rule.template;
    const dateString = this.formatDate(scheduledDate);
    
    // Generate unique ID
    const taskId = `recurring-${rule.id}-${dateString}-${instanceNumber}`;
    
    // Process placeholders
    const title = this.processPlaceholders(template.title, scheduledDate, instanceNumber);
    const description = template.description 
      ? this.processPlaceholders(template.description, scheduledDate, instanceNumber)
      : undefined;
    
    const baseTask: Task = {
      id: taskId,
      title,
      description,
      completed: false,
      priority: template.priority || 'none',
      estimatedTime: template.estimatedTime,
      trackedTime: 0,
      tags: [...template.tags],
      subtasks: [],
      columnId: template.columnId,
      kanbanColumnId: template.kanbanColumnId,
      reminderDate: dateString,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      position: 0,
      attachments: [],
      linkedNotes: [],
      pinned: false,
      archived: false
    };
    
    const recurringTask: RecurringTask = {
      ...baseTask,
      recurrenceRuleId: rule.id,
      scheduledDate: dateString,
      isGenerated: true,
      generatedAt: new Date().toISOString(),
      canReschedule: true,
      canSkip: true,
      canModify: true,
      instanceNumber
    };
    
    return recurringTask;
  }

  /**
   * Process placeholder patterns in text
   */
  private processPlaceholders(text: string, date: Date, instanceNumber: number): string {
    let processedText = text;
    
    // Date placeholders
    processedText = processedText.replace(/\{\{date\}\}/g, this.formatDate(date));
    processedText = processedText.replace(/\{\{date_short\}\}/g, this.formatDateShort(date));
    processedText = processedText.replace(/\{\{weekday\}\}/g, this.getWeekdayName(date.getDay()));
    processedText = processedText.replace(/\{\{week\}\}/g, this.getWeekNumber(date).toString());
    processedText = processedText.replace(/\{\{month\}\}/g, this.getMonthName(date.getMonth()));
    processedText = processedText.replace(/\{\{month_short\}\}/g, this.getMonthNameShort(date.getMonth()));
    processedText = processedText.replace(/\{\{year\}\}/g, date.getFullYear().toString());
    processedText = processedText.replace(/\{\{counter\}\}/g, instanceNumber.toString());
    
    return processedText;
  }

  /**
   * Generate preview of upcoming occurrences
   */
  generatePreview(rule: RecurrenceRule, startDate: Date = new Date()): RecurrencePreview {
    const dates = this.generateOccurrences(rule, startDate, RECURRENCE_CONSTANTS.MAX_PREVIEW_ITEMS);
    const warnings: string[] = [];
    
    // Add warnings for potential issues
    if (rule.pattern.skipWeekends && rule.pattern.adjustForWeekends === 'skip') {
      warnings.push('Einige Termine könnten übersprungen werden (Wochenenden)');
    }
    
    // Holidays are no longer considered
    // if (rule.pattern.skipHolidays) {
    //   warnings.push('Feiertage werden übersprungen');
    // }
    
    let endDate: string | undefined;
    if (rule.end.type === 'on_date' && rule.end.date) {
      endDate = rule.end.date;
    } else if (rule.end.type === 'after' && rule.end.count) {
      const allDates = this.generateOccurrences(rule, startDate, rule.end.count);
      endDate = allDates[allDates.length - 1];
    }
    
    return {
      dates,
      count: dates.length,
      hasMore: dates.length >= RECURRENCE_CONSTANTS.MAX_PREVIEW_ITEMS,
      endDate,
      warnings
    };
  }

  /**
   * Validate recurrence rule
   */
  validateRule(rule: Partial<RecurrenceRule>): RecurrenceValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validate basic fields
    if (!rule.name || rule.name.trim() === '') {
      errors.push('Name ist erforderlich');
    }
    
    if (!rule.template?.title || rule.template.title.trim() === '') {
      errors.push('Aufgaben-Titel ist erforderlich');
    }
    
    if (!rule.template?.columnId) {
      errors.push('Spalte ist erforderlich');
    }
    
    if (!rule.pattern) {
      errors.push('Wiederholungsmuster ist erforderlich');
    } else {
      // Validate pattern
      const pattern = rule.pattern;
      
      if (pattern.interval < RECURRENCE_CONSTANTS.MIN_INTERVAL || 
          pattern.interval > RECURRENCE_CONSTANTS.MAX_INTERVAL) {
        errors.push(`Intervall muss zwischen ${RECURRENCE_CONSTANTS.MIN_INTERVAL} und ${RECURRENCE_CONSTANTS.MAX_INTERVAL} liegen`);
      }
      
      if (pattern.type === 'weekly' && pattern.weekdays && pattern.weekdays.length === 0) {
        errors.push('Mindestens ein Wochentag muss ausgewählt werden');
      }
      
      if (pattern.type === 'monthly' && pattern.monthlyType === 'date' && 
          (!pattern.monthDay || pattern.monthDay < 1 || pattern.monthDay > 31)) {
        errors.push('Ungültiger Monatstag');
      }
    }
    
    if (!rule.end) {
      errors.push('Endkriterium ist erforderlich');
    } else {
      // Validate end conditions
      if (rule.end.type === 'after' && (!rule.end.count || rule.end.count < 1)) {
        errors.push('Anzahl der Wiederholungen muss mindestens 1 sein');
      }
      
      if (rule.end.type === 'on_date' && !rule.end.date) {
        errors.push('Enddatum ist erforderlich');
      }
    }
    
    // Generate preview if valid
    let preview: RecurrencePreview | undefined;
    if (errors.length === 0 && rule.pattern && rule.end && rule.template) {
      try {
        const fullRule = rule as RecurrenceRule;
        preview = this.generatePreview(fullRule);
        warnings.push(...preview.warnings);
      } catch (error) {
        warnings.push('Fehler beim Generieren der Vorschau');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      preview
    };
  }

  // Helper methods
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatDateShort(date: Date): string {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  private findPreviousWeekday(date: Date): Date {
    const result = new Date(date);
    do {
      result.setDate(result.getDate() - 1);
    } while (this.isWeekend(result));
    return result;
  }

  private findNextWeekday(date: Date): Date {
    const result = new Date(date);
    do {
      result.setDate(result.getDate() + 1);
    } while (this.isWeekend(result));
    return result;
  }

  private findPreviousNonHoliday(date: Date): Date {
    const result = new Date(date);
    do {
      result.setDate(result.getDate() - 1);
    } while (this.holidays.has(this.formatDate(result)));
    return result;
  }

  private findNextNonHoliday(date: Date): Date {
    const result = new Date(date);
    do {
      result.setDate(result.getDate() + 1);
    } while (this.holidays.has(this.formatDate(result)));
    return result;
  }

  private getWeekdayName(dayIndex: number): WeekDay {
    const weekdays: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return weekdays[dayIndex];
  }

  private getWeekdayIndex(weekday: WeekDay): number {
    const weekdays: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return weekdays.indexOf(weekday);
  }

  private getWeekNumber(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    const oneWeek = 604800000; // milliseconds in one week
    return Math.ceil(diff / oneWeek);
  }

  private getMonthName(monthIndex: number): string {
    const months = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return months[monthIndex];
  }

  private getMonthNameShort(monthIndex: number): string {
    const months = [
      'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
      'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
    ];
    return months[monthIndex];
  }
}

// Export singleton instance
export const recurrenceService = new RecurrenceService(); 