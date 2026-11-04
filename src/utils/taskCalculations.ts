import { Task, Subtask, TaskStatus, TaskTimeframeFilter, AIStrategicReview, StrategicRecommendation, ReportPeriodType, ReportStatistics } from '../types/task';

/**
 * Calculates percentage of completion from a list of subtasks.
 * Returns an integer between 0 and 100.
 */
export function calculateProgress(subtasks: Subtask[]): number {
  if (!subtasks || subtasks.length === 0) {
    return 0;
  }
  const completedCount = subtasks.filter((s) => s.completed).length;
  return Math.round((completedCount / subtasks.length) * 100);
}

/**
 * Real-time task search filter that searches against title and description.
 */
export function filterTasksBySearchQuery(tasks: Task[], query: string): Task[] {
  if (!query || !query.trim()) return tasks;
  const q = query.trim().toLowerCase();
  return tasks.filter((task) => {
    const titleMatch = (task.title || '').toLowerCase().includes(q);
    const descMatch = (task.description || '').toLowerCase().includes(q);
    const unitMatch = (task.unit || '').toLowerCase().includes(q);
    return titleMatch || descMatch || unitMatch;
  });
}

/**
 * Determines if a task is overdue.
 */
export function isTaskOverdue(dueDate: string, completedAt?: string, now = new Date()): boolean {
  if (completedAt) {
    return false; // Already completed, not overdue now
  }
  const due = new Date(dueDate);
  return due.getTime() < now.getTime();
}

/**
 * Checks if a task's due date falls within the current calendar week.
 * Week starts on Monday (00:00:00.000) and ends on Sunday (23:59:59.999) following Vietnamese business standards.
 */
export function isTaskThisWeek(dueDate: string | Date | undefined, refDate = new Date()): boolean {
  if (!dueDate) return false;
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  if (isNaN(due.getTime())) return false;

  const d = new Date(refDate);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const dueTime = due.getTime();
  return dueTime >= monday.getTime() && dueTime <= sunday.getTime();
}

/**
 * Checks if a task's due date falls within the current calendar month (1st to last day of the month).
 */
export function isTaskThisMonth(dueDate: string | Date | undefined, refDate = new Date()): boolean {
  if (!dueDate) return false;
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  if (isNaN(due.getTime())) return false;

  const startOfMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999);

  const dueTime = due.getTime();
  return dueTime >= startOfMonth.getTime() && dueTime <= endOfMonth.getTime();
}

/**
 * Checks if a task's due date is upcoming (due today or in the future).
 * Calculated from the beginning of today (00:00:00.000) onwards.
 */
export function isTaskUpcoming(dueDate: string | Date | undefined, refDate = new Date()): boolean {
  if (!dueDate) return false;
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  if (isNaN(due.getTime())) return false;

  const startOfToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0);
  return due.getTime() >= startOfToday.getTime();
}

/**
 * Filters a list of tasks based on the specified timeframe filter.
 */
export function filterTasksByTimeframe(
  tasks: Task[],
  timeframe: TaskTimeframeFilter,
  refDate = new Date()
): Task[] {
  if (!timeframe || timeframe === 'all') return tasks;
  return tasks.filter((task) => {
    if (timeframe === 'this_week') {
      return isTaskThisWeek(task.dueDate, refDate);
    }
    if (timeframe === 'this_month') {
      return isTaskThisMonth(task.dueDate, refDate);
    }
    if (timeframe === 'upcoming') {
      return isTaskUpcoming(task.dueDate, refDate);
    }
    return true;
  });
}

/**
 * Computes counts of active tasks belonging to each timeframe.
 */
export function getTimeframeCounts(tasks: Task[], refDate = new Date()) {
  let thisWeek = 0;
  let thisMonth = 0;
  let upcoming = 0;

  for (const task of tasks) {
    if (isTaskThisWeek(task.dueDate, refDate)) thisWeek++;
    if (isTaskThisMonth(task.dueDate, refDate)) thisMonth++;
    if (isTaskUpcoming(task.dueDate, refDate)) upcoming++;
  }

  return {
    all: tasks.length,
    thisWeek,
    thisMonth,
    upcoming,
  };
}

/**
 * Returns a friendly Vietnamese badge label and styling class based on task due date.
 */
export function getTaskTimeframeBadge(
  dueDate: string | Date | undefined,
  refDate = new Date()
): { label: string; colorClass: string; tooltip: string } | null {
  if (!dueDate) return null;
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  if (isNaN(due.getTime())) return null;

  const startOfToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 23, 59, 59, 999);
  const endOfTomorrow = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + 1, 23, 59, 59, 999);

  const dueTime = due.getTime();

  // If already overdue (past today 00:00)
  if (dueTime < startOfToday.getTime()) {
    return {
      label: 'Quá hạn',
      colorClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      tooltip: 'Nhiệm vụ đã quá hạn chót',
    };
  }

  // Due today
  if (dueTime <= endOfToday.getTime()) {
    return {
      label: 'Hôm nay',
      colorClass: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold animate-pulse',
      tooltip: 'Hạn chót trong ngày hôm nay',
    };
  }

  // Due tomorrow
  if (dueTime <= endOfTomorrow.getTime()) {
    return {
      label: 'Ngày mai',
      colorClass: 'bg-orange-100 text-orange-800 border-orange-200 font-bold',
      tooltip: 'Hạn chót vào ngày mai',
    };
  }

  // This week (Monday to Sunday)
  if (isTaskThisWeek(due, refDate)) {
    return {
      label: 'Tuần này',
      colorClass: 'bg-sky-100 text-sky-800 border-sky-200 font-semibold',
      tooltip: 'Hạn chót trong tuần làm việc hiện tại',
    };
  }

  // This month
  if (isTaskThisMonth(due, refDate)) {
    return {
      label: 'Tháng này',
      colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200 font-semibold',
      tooltip: 'Hạn chót trong tháng hiện tại',
    };
  }

  // Upcoming in future months
  return {
    label: 'Sắp tới',
    colorClass: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
    tooltip: 'Hạn chót trong các tháng tiếp theo',
  };
}

/**
 * Derives current status of a task based on subtasks, completion date, and due date.
 */
export function getTaskStatus(
  task: Pick<Task, 'dueDate' | 'completedAt' | 'progress' | 'subtasks'>,
  now = new Date()
): TaskStatus {
  if (task.completedAt || task.progress === 100) {
    return 'completed';
  }
  const due = new Date(task.dueDate);
  if (due.getTime() < now.getTime()) {
    return 'overdue';
  }
  if (task.progress > 0 || (task.subtasks && task.subtasks.some((s) => s.completed))) {
    return 'in_progress';
  }
  return 'pending';
}

/**
 * Retrieves the top N most urgent pending tasks for Priority Spotlight.
 * Sorted by: overdue first, then high priority, then nearest due date.
 */
export function getTopUrgentTasks(tasks: Task[], limit = 3, now = new Date()): Task[] {
  const pendingOrInProgress = tasks.filter((t) => t.status !== 'completed' && t.progress < 100);

  return pendingOrInProgress
    .slice()
    .sort((a, b) => {
      const aOverdue = isTaskOverdue(a.dueDate, a.completedAt, now);
      const bOverdue = isTaskOverdue(b.dueDate, b.completedAt, now);

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const aWeight = priorityWeight[a.priority] || 1;
      const bWeight = priorityWeight[b.priority] || 1;

      if (aWeight !== bWeight) {
        return bWeight - aWeight;
      }

      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, limit);
}

/**
 * Formats Vietnamese ISO or date strings into friendly format.
 * E.g., "14:30, 25/10/2026"
 */
export function formatDateVietnamese(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${hours}:${minutes}, ${day}/${month}/${year}`;
}

/**
 * Formats a birth date string strictly into Day / Month / Year (Ngày / Tháng / Năm).
 * E.g., "Ngày 25 tháng 08 năm 1996" or "25/08/1996"
 */
export function formatBirthDateVietnamese(dateStr: string, detailed = false): string {
  if (!dateStr || !dateStr.trim()) return 'Chưa cập nhật';
  const cleanStr = dateStr.trim();

  // Case 1: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  if (cleanStr.includes('-')) {
    const rawDatePart = cleanStr.split('T')[0];
    const parts = rawDatePart.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const dd = String(d).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        return detailed ? `Ngày ${dd} tháng ${mm} năm ${y}` : `${dd}/${mm}/${y}`;
      }
    }
  }

  // Case 2: DD/MM/YYYY
  if (cleanStr.includes('/')) {
    const parts = cleanStr.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const dd = String(d).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        return detailed ? `Ngày ${dd} tháng ${mm} năm ${y}` : `${dd}/${mm}/${y}`;
      }
    }
  }

  const date = new Date(cleanStr);
  if (isNaN(date.getTime())) return cleanStr;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return detailed ? `Ngày ${day} tháng ${month} năm ${year}` : `${day}/${month}/${year}`;
}

/**
/**
 * Safe conversion to ISO string that never throws RangeError: Invalid time value
 */
export function safeToIsoString(dateInput: any, fallbackDate?: Date): string {
  if (!dateInput) {
    return (fallbackDate || new Date()).toISOString();
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    return (fallbackDate || new Date()).toISOString();
  }
  return d.toISOString();
}

/**
 * Formats a date string for input[type="datetime-local"] (YYYY-MM-DDTHH:mm).
 * Safe against invalid time values, null, and undefined.
 */
export function toDatetimeLocal(date?: Date | string | number | null): string {
  if (!date) {
    const now = new Date();
    return formatLocalYmdHm(now);
  }
  const d = date instanceof Date ? date : new Date(date);
  const safeDate = isNaN(d.getTime()) ? new Date() : d;
  return formatLocalYmdHm(safeDate);
}

function formatLocalYmdHm(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

/**
 * Generates direct Google Calendar web event creation link safely without throwing on invalid dates.
 */
export function generateGoogleCalendarUrl(task: Pick<Task, 'title' | 'description' | 'createdAt' | 'dueDate' | 'unit'>): string {
  const start = new Date(task.createdAt || Date.now());
  const safeStart = isNaN(start.getTime()) ? new Date() : start;
  const end = new Date(task.dueDate || Date.now() + 3 * 24 * 60 * 60 * 1000);
  const safeEnd = isNaN(end.getTime()) ? new Date(safeStart.getTime() + 24 * 60 * 60 * 1000) : end;

  // Format to YYYYMMDDTHHmmssZ
  const formatUtc = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const dates = `${formatUtc(safeStart)}/${formatUtc(safeEnd)}`;
  const text = encodeURIComponent(`[${task.unit || 'Nhiệm vụ'}] ${task.title || 'Nhiệm vụ mới'}`);
  const details = encodeURIComponent(
    `Nhiệm vụ: ${task.title || 'Nhiệm vụ mới'}\nĐơn vị: ${task.unit || 'Không xác định'}\n\nMô tả chi tiết:\n${task.description || 'Không có mô tả'}\n\nHệ thống nhắc việc NSTask`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
}

/**
 * Generates an .ics iCalendar file string for download safely without throwing.
 */
export function generateIcsContent(task: Task): string {
  const formatIcsDate = (d: Date) => {
    const safe = isNaN(d.getTime()) ? new Date() : d;
    return safe.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const start = new Date(task.createdAt || Date.now());
  const safeStart = isNaN(start.getTime()) ? new Date() : start;
  const end = new Date(task.dueDate || Date.now() + 3 * 24 * 60 * 60 * 1000);
  const safeEnd = isNaN(end.getTime()) ? new Date(safeStart.getTime() + 24 * 60 * 60 * 1000) : end;
  const now = new Date();

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NSTask//Nhiem Vu Nhac Viec//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:taskmaster-${task.id || Date.now()}@app.local`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(safeStart)}`,
    `DTEND:${formatIcsDate(safeEnd)}`,
    `SUMMARY:[${task.unit || 'Nhiệm vụ'}] ${task.title}`,
    `DESCRIPTION:${(task.description || '').replace(/\n/g, '\\n')}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Nhắc việc: ${task.title}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export interface DashboardStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  completionRate: number; // 0 - 100
  highPriorityCount: number;
  unitDistribution: Record<string, { total: number; completed: number; overdue: number }>;
}

export function calculateDashboardStats(tasks: Task[], now = new Date()): DashboardStats {
  const total = tasks.length;
  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  let overdue = 0;
  let highPriorityCount = 0;

  const unitDistribution: Record<string, { total: number; completed: number; overdue: number }> = {};

  tasks.forEach((task) => {
    const status = getTaskStatus(task, now);
    const unit = task.unit?.trim() || 'Chưa phân loại';

    if (!unitDistribution[unit]) {
      unitDistribution[unit] = { total: 0, completed: 0, overdue: 0 };
    }
    unitDistribution[unit].total += 1;

    if (task.priority === 'high') {
      highPriorityCount += 1;
    }

    if (status === 'completed') {
      completed += 1;
      unitDistribution[unit].completed += 1;
    } else if (status === 'overdue') {
      overdue += 1;
      unitDistribution[unit].overdue += 1;
    } else if (status === 'in_progress') {
      inProgress += 1;
    } else {
      pending += 1;
    }
  });

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    inProgress,
    pending,
    overdue,
    completionRate,
    highPriorityCount,
    unitDistribution
  };
}

export interface TrendDataPoint {
  label: string;
  completed: number;
  created: number;
  overdue: number;
}

/**
 * Calculates work completion, creation, and overdue trends over the last 7 days.
 */
export function calculateWeeklyTrend(tasks: Task[], refDate = new Date()): TrendDataPoint[] {
  const points: TrendDataPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);

    const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
    const label = `${dayName} (${d.getDate()}/${d.getMonth() + 1})`;

    let completed = 0;
    let created = 0;
    let overdue = 0;

    tasks.forEach((t) => {
      if (t.completedAt) {
        const compTime = new Date(t.completedAt).getTime();
        if (compTime >= d.getTime() && compTime < nextD.getTime()) {
          completed++;
        }
      }
      const createTime = new Date(t.createdAt).getTime();
      if (createTime >= d.getTime() && createTime < nextD.getTime()) {
        created++;
      }
      if (t.status === 'overdue') {
        const dueTime = new Date(t.dueDate).getTime();
        if (dueTime >= d.getTime() && dueTime < nextD.getTime()) {
          overdue++;
        }
      }
    });

    points.push({ label, completed, created, overdue });
  }
  return points;
}

/**
 * Calculates work completion, creation, and overdue trends over the last 6 months.
 */
export function calculateMonthlyTrend(tasks: Task[], refDate = new Date()): TrendDataPoint[] {
  const points: TrendDataPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
    const nextM = new Date(refDate.getFullYear(), refDate.getMonth() - i + 1, 1);
    const label = `Thg ${d.getMonth() + 1}/${d.getFullYear()}`;

    let completed = 0;
    let created = 0;
    let overdue = 0;

    tasks.forEach((t) => {
      if (t.completedAt) {
        const compTime = new Date(t.completedAt).getTime();
        if (compTime >= d.getTime() && compTime < nextM.getTime()) {
          completed++;
        }
      }
      const createTime = new Date(t.createdAt).getTime();
      if (createTime >= d.getTime() && createTime < nextM.getTime()) {
        created++;
      }
      if (t.status === 'overdue') {
        const dueTime = new Date(t.dueDate).getTime();
        if (dueTime >= d.getTime() && dueTime < nextM.getTime()) {
          overdue++;
        }
      }
    });

    points.push({ label, completed, created, overdue });
  }
  return points;
}

export interface ProductivityTrendPoint {
  label: string;
  fullDateLabel: string;
  completedTasks: number; // Số lượng nhiệm vụ hoàn thành
  avgExecutionHours: number; // Thời gian thực hiện trung bình (giờ)
  avgExecutionDays: number; // Thời gian thực hiện trung bình (ngày)
  totalExecutionHours: number; // Tổng số giờ thực hiện trong chu kỳ
  createdTasks: number; // Số nhiệm vụ tạo mới
  onTimeCount: number; // Số nhiệm vụ hoàn thành đúng hạn
}

/**
 * Safely calculates task execution lead time in milliseconds.
 * Clamps reasonable bounds (0.5 hour to 720 hours = 30 days) and prevents epoch/invalid date diffs.
 */
export function getSafeTaskLeadDurationMs(
  task: { createdAt?: string; completedAt?: string; dueDate?: string },
  compTimeMs: number
): number {
  const oneHourMs = 60 * 60 * 1000;
  if (isNaN(compTimeMs) || compTimeMs <= 0) return 24 * oneHourMs;

  let createMs = task.createdAt ? new Date(task.createdAt).getTime() : NaN;
  // Year 2020 timestamp is 1577836800000. Reject epoch 0, NaN, or dates before 2020 or after completion
  if (isNaN(createMs) || createMs < 1577836800000 || createMs > compTimeMs) {
    if (task.dueDate) {
      const dueMs = new Date(task.dueDate).getTime();
      if (!isNaN(dueMs) && dueMs >= 1577836800000 && dueMs < compTimeMs) {
        createMs = Math.max(dueMs - 48 * oneHourMs, compTimeMs - 72 * oneHourMs);
      } else {
        createMs = compTimeMs - 24 * oneHourMs;
      }
    } else {
      createMs = compTimeMs - 24 * oneHourMs;
    }
  }

  const rawDuration = compTimeMs - createMs;
  // Bound strictly: minimum 30 minutes (0.5h), maximum 720 hours (30 days)
  return Math.max(0.5 * oneHourMs, Math.min(rawDuration, 720 * oneHourMs));
}

export interface DailyPerformanceSummary {
  createdToday: number;
  completedToday: number;
  onTimeToday: number;
  todayOnTimeRate: number;
  avgHoursToday: number;
  createdYesterday: number;
  completedYesterday: number;
  netCreatedDiff: number; // createdToday - createdYesterday
  netCompletedDiff: number; // completedToday - completedYesterday
  todayStatusMessage: string;
}

/**
 * Computes focused daily performance comparing today with yesterday and the past days.
 */
export function calculateDailyPerformanceSummary(tasks: Task[], refDate = new Date()): DailyPerformanceSummary {
  const oneHourMs = 60 * 60 * 1000;
  const startOfToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0).getTime();
  const endOfToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 23, 59, 59, 999).getTime();

  const startOfYesterday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() - 1, 0, 0, 0, 0).getTime();
  const endOfYesterday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() - 1, 23, 59, 59, 999).getTime();

  let createdToday = 0;
  let completedToday = 0;
  let onTimeToday = 0;
  let totalDurationMsToday = 0;

  let createdYesterday = 0;
  let completedYesterday = 0;

  tasks.forEach((t) => {
    // Created
    if (t.createdAt) {
      const cTime = new Date(t.createdAt).getTime();
      if (cTime >= startOfToday && cTime <= endOfToday) {
        createdToday++;
      } else if (cTime >= startOfYesterday && cTime <= endOfYesterday) {
        createdYesterday++;
      }
    }

    // Completed
    if (t.status === 'completed' || t.progress === 100) {
      const compTime = t.completedAt ? new Date(t.completedAt).getTime() : (t.dueDate ? new Date(t.dueDate).getTime() : 0);
      if (compTime >= startOfToday && compTime <= endOfToday) {
        completedToday++;
        const duration = getSafeTaskLeadDurationMs(t, compTime);
        totalDurationMsToday += duration;

        if (t.dueDate) {
          const dueTime = new Date(t.dueDate).getTime();
          if (compTime <= dueTime + 3600000) onTimeToday++;
        } else {
          onTimeToday++;
        }
      } else if (compTime >= startOfYesterday && compTime <= endOfYesterday) {
        completedYesterday++;
      }
    }
  });

  const todayOnTimeRate = completedToday > 0 ? Math.round((onTimeToday / completedToday) * 100) : 100;
  const avgHoursToday = completedToday > 0 ? Number(((totalDurationMsToday / oneHourMs) / completedToday).toFixed(1)) : 0;
  const netCreatedDiff = createdToday - createdYesterday;
  const netCompletedDiff = completedToday - completedYesterday;

  let todayStatusMessage = 'Nhịp độ ổn định: Khối lượng công việc hôm nay đang được duy trì đều đặn.';
  if (createdToday > createdYesterday) {
    todayStatusMessage = `Hôm nay đã giao mới ${createdToday} nhiệm vụ (+${netCreatedDiff} so với hôm qua). Đơn vị cần phân bổ tiến độ hợp lý.`;
  } else if (completedToday > completedYesterday && completedToday > 0) {
    todayStatusMessage = `Năng suất tăng tốc: Đã nghiệm thu ${completedToday} việc (+${netCompletedDiff} so với hôm qua), tỷ lệ đúng hạn ${todayOnTimeRate}%.`;
  }

  return {
    createdToday,
    completedToday,
    onTimeToday,
    todayOnTimeRate,
    avgHoursToday,
    createdYesterday,
    completedYesterday,
    netCreatedDiff,
    netCompletedDiff,
    todayStatusMessage,
  };
}

/**
 * Calculates daily productivity trends (completed task count & execution lead time)
 * across today and recent individual days (last 7 days).
 */
export function calculateDailyProductivityTrend(tasks: Task[], refDate = new Date()): ProductivityTrendPoint[] {
  return calculateWeeklyProductivityTrend(tasks, refDate);
}

/**
 * Calculates productivity trends (completed task count & execution lead time) over the last 7 days.
 */
export function calculateWeeklyProductivityTrend(tasks: Task[], refDate = new Date()): ProductivityTrendPoint[] {
  const points: ProductivityTrendPoint[] = [];
  const oneHourMs = 60 * 60 * 1000;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);

    const dayName = i === 0 ? 'Hôm nay' : i === 1 ? 'Hôm qua' : ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
    const label = `${dayName} (${d.getDate()}/${d.getMonth() + 1})`;
    const fullDateLabel = `${dayName}, ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

    let completedTasks = 0;
    let createdTasks = 0;
    let onTimeCount = 0;
    let totalDurationMs = 0;

    tasks.forEach((t) => {
      if (t.status === 'completed' || t.progress === 100) {
        const compTime = t.completedAt ? new Date(t.completedAt).getTime() : (t.dueDate ? new Date(t.dueDate).getTime() : 0);
        if (compTime >= d.getTime() && compTime < nextD.getTime()) {
          completedTasks++;

          const duration = getSafeTaskLeadDurationMs(t, compTime);
          totalDurationMs += duration;

          if (t.dueDate) {
            const dueTime = new Date(t.dueDate).getTime();
            if (compTime <= dueTime + 3600000) {
              onTimeCount++;
            }
          } else {
            onTimeCount++;
          }
        }
      }

      if (t.createdAt) {
        const createTime = new Date(t.createdAt).getTime();
        if (createTime >= d.getTime() && createTime < nextD.getTime()) {
          createdTasks++;
        }
      }
    });

    const totalHours = Number(((totalDurationMs / oneHourMs)).toFixed(1));
    const avgHours = completedTasks > 0 ? Number((totalHours / completedTasks).toFixed(1)) : 0;
    const avgDays = Number((avgHours / 24).toFixed(1));

    points.push({
      label,
      fullDateLabel,
      completedTasks,
      avgExecutionHours: avgHours,
      avgExecutionDays: avgDays,
      totalExecutionHours: totalHours,
      createdTasks,
      onTimeCount,
    });
  }

  return points;
}

/**
 * Calculates productivity trends (completed task count & execution lead time) over the last 6 months.
 */
export function calculateMonthlyProductivityTrend(tasks: Task[], refDate = new Date()): ProductivityTrendPoint[] {
  const points: ProductivityTrendPoint[] = [];
  const oneHourMs = 60 * 60 * 1000;

  for (let i = 5; i >= 0; i--) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
    const nextM = new Date(refDate.getFullYear(), refDate.getMonth() - i + 1, 1);
    const label = `Thg ${d.getMonth() + 1}/${d.getFullYear()}`;
    const fullDateLabel = `Tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;

    let completedTasks = 0;
    let createdTasks = 0;
    let onTimeCount = 0;
    let totalDurationMs = 0;

    tasks.forEach((t) => {
      if (t.status === 'completed' || t.progress === 100) {
        const compTime = t.completedAt ? new Date(t.completedAt).getTime() : (t.dueDate ? new Date(t.dueDate).getTime() : 0);
        if (compTime >= d.getTime() && compTime < nextM.getTime()) {
          completedTasks++;

          const duration = getSafeTaskLeadDurationMs(t, compTime);
          totalDurationMs += duration;

          if (t.dueDate) {
            const dueTime = new Date(t.dueDate).getTime();
            if (compTime <= dueTime + 3600000) {
              onTimeCount++;
            }
          } else {
            onTimeCount++;
          }
        }
      }

      if (t.createdAt) {
        const createTime = new Date(t.createdAt).getTime();
        if (createTime >= d.getTime() && createTime < nextM.getTime()) {
          createdTasks++;
        }
      }
    });

    const totalHours = Number(((totalDurationMs / oneHourMs)).toFixed(1));
    const avgHours = completedTasks > 0 ? Number((totalHours / completedTasks).toFixed(1)) : 0;
    const avgDays = Number((avgHours / 24).toFixed(1));

    points.push({
      label,
      fullDateLabel,
      completedTasks,
      avgExecutionHours: avgHours,
      avgExecutionDays: avgDays,
      totalExecutionHours: totalHours,
      createdTasks,
      onTimeCount,
    });
  }

  return points;
}

export interface WeeklyPerformanceDataPoint {
  weekKey: string;
  weekLabel: string;
  shortLabel: string;
  dateRangeLabel: string;
  startDate: string;
  endDate: string;
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  overdueTasks: number;
  createdTasks: number;
  completionRate: number; // 0 - 100 (%)
  onTimeRate: number; // 0 - 100 (%)
  avgLeadTimeHours: number;
  isCurrentWeek: boolean;
}

/**
 * Calculates weekly performance rates (completion rate %, completed tasks, on-time rate) across consecutive weeks.
 */
export function calculateWeeklyPerformanceTrend(
  tasks: Task[],
  numWeeks = 6,
  refDate = new Date()
): WeeklyPerformanceDataPoint[] {
  const points: WeeklyPerformanceDataPoint[] = [];
  const oneHourMs = 60 * 60 * 1000;
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

  // Determine Monday of current week
  const day = refDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const currentMonday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + diffToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  for (let i = numWeeks - 1; i >= 0; i--) {
    const start = new Date(currentMonday.getTime() - i * oneWeekMs);
    const end = new Date(start.getTime() + oneWeekMs - 1);
    const startTime = start.getTime();
    const endTime = end.getTime();

    // ISO week number calculation
    const tempD = new Date(start.getTime());
    tempD.setDate(tempD.getDate() + 3 - ((tempD.getDay() + 6) % 7));
    const week1 = new Date(tempD.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((tempD.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);

    const isCurrentWeek = i === 0;
    const weekLabel = isCurrentWeek ? `Tuần này (T${weekNum})` : `Tuần ${weekNum}`;
    const shortLabel = `T${weekNum} (${start.getDate()}/${start.getMonth() + 1})`;
    const dateRangeLabel = `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;

    let completedTasks = 0;
    let onTimeTasks = 0;
    let overdueTasks = 0;
    let createdTasks = 0;
    let totalDue = 0;
    let totalDurationMs = 0;

    tasks.forEach((t) => {
      // Created in this week
      if (t.createdAt) {
        const createTime = new Date(t.createdAt).getTime();
        if (createTime >= startTime && createTime <= endTime) {
          createdTasks++;
        }
      }

      // Due in this week
      let isDueInWeek = false;
      if (t.dueDate) {
        const dueTime = new Date(t.dueDate).getTime();
        if (dueTime >= startTime && dueTime <= endTime) {
          isDueInWeek = true;
          totalDue++;
          if (t.status === 'overdue' || (t.status !== 'completed' && dueTime < refDate.getTime())) {
            overdueTasks++;
          }
        }
      }

      // Completed in this week
      const isCompleted = t.status === 'completed' || t.progress === 100;
      if (isCompleted) {
        const compTime = t.completedAt ? new Date(t.completedAt).getTime() : (t.dueDate ? new Date(t.dueDate).getTime() : 0);
        if (compTime >= startTime && compTime <= endTime) {
          completedTasks++;
          const duration = getSafeTaskLeadDurationMs(t, compTime);
          totalDurationMs += duration;

          if (t.dueDate) {
            const dueTime = new Date(t.dueDate).getTime();
            if (compTime <= dueTime + 3600000) {
              onTimeTasks++;
            }
          } else {
            onTimeTasks++;
          }
        } else if (isDueInWeek) {
          completedTasks++;
          onTimeTasks++;
        }
      }
    });

    const totalTasks = Math.max(totalDue, completedTasks);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (completedTasks > 0 ? 100 : 0);
    const onTimeRate = completedTasks > 0 ? Math.round((onTimeTasks / completedTasks) * 100) : 100;
    const avgLeadTimeHours = completedTasks > 0 ? Number(((totalDurationMs / (completedTasks * oneHourMs))).toFixed(1)) : 0;

    points.push({
      weekKey: `${start.getFullYear()}-W${String(weekNum).padStart(2, '0')}`,
      weekLabel,
      shortLabel,
      dateRangeLabel,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      totalTasks,
      completedTasks,
      onTimeTasks,
      overdueTasks,
      createdTasks,
      completionRate,
      onTimeRate,
      avgLeadTimeHours,
      isCurrentWeek,
    });
  }

  return points;
}

export interface Comparison30DaysPoint {
  dateKey: string;
  label: string; // e.g. "02/11" or "27/10 - 02/11"
  fullLabel: string;
  completedTasks: number;
  createdTasks: number;
  netChange: number; // completedTasks - createdTasks
}

export interface Comparison30DaysSummary {
  totalCompleted: number;
  totalCreated: number;
  netDifference: number; // completed - created
  completionToCreationRatio: number; // (completed / created) * 100
  highestCompletedDay: { label: string; count: number };
  highestCreatedDay: { label: string; count: number };
  workloadStatus: 'healthy' | 'balanced' | 'overloaded';
  statusMessage: string;
}

/**
 * Calculates a 30-day comparative trend of Completed Tasks vs. Newly Created Tasks.
 * Supports 'daily' (30 points), 'grouped_5d' (6 points), or 'weekly' (4 points).
 */
export function calculate30DaysCreationVsCompletionTrend(
  tasks: Task[],
  refDate = new Date(),
  mode: 'daily' | 'weekly' | 'grouped_5d' = 'daily'
): {
  dataPoints: Comparison30DaysPoint[];
  summary: Comparison30DaysSummary;
} {
  const dailyPoints: Comparison30DaysPoint[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() - i, 0, 0, 0, 0);
    const nextD = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() - i + 1, 0, 0, 0, 0);
    const startTime = d.getTime();
    const endTime = nextD.getTime() - 1;

    const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
    const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const fullLabel = `${dayName}, ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    let completedTasks = 0;
    let createdTasks = 0;

    tasks.forEach((t) => {
      // Completed on this day
      if (t.status === 'completed' || t.progress === 100) {
        const compTime = t.completedAt ? new Date(t.completedAt).getTime() : (t.dueDate ? new Date(t.dueDate).getTime() : 0);
        if (compTime >= startTime && compTime <= endTime) {
          completedTasks++;
        }
      }

      // Created on this day
      if (t.createdAt) {
        const createTime = new Date(t.createdAt).getTime();
        if (createTime >= startTime && createTime <= endTime) {
          createdTasks++;
        }
      }
    });

    dailyPoints.push({
      dateKey,
      label,
      fullLabel,
      completedTasks,
      createdTasks,
      netChange: completedTasks - createdTasks,
    });
  }

  // Handle grouping if requested
  let dataPoints: Comparison30DaysPoint[] = dailyPoints;

  if (mode === 'grouped_5d') {
    const grouped: Comparison30DaysPoint[] = [];
    for (let g = 0; g < 6; g++) {
      const slice = dailyPoints.slice(g * 5, (g + 1) * 5);
      const startP = slice[0];
      const endP = slice[slice.length - 1];
      const compSum = slice.reduce((s, p) => s + p.completedTasks, 0);
      const createSum = slice.reduce((s, p) => s + p.createdTasks, 0);

      grouped.push({
        dateKey: `${startP.dateKey}_to_${endP.dateKey}`,
        label: `${startP.label} - ${endP.label}`,
        fullLabel: `Giai đoạn ${startP.label} đến ${endP.label}`,
        completedTasks: compSum,
        createdTasks: createSum,
        netChange: compSum - createSum,
      });
    }
    dataPoints = grouped;
  } else if (mode === 'weekly') {
    // 4 periods: 3 periods of 7 days + 1 period of 9 days = 30 days
    const weeklyRanges = [
      { startIdx: 0, endIdx: 6 },
      { startIdx: 7, endIdx: 13 },
      { startIdx: 14, endIdx: 20 },
      { startIdx: 21, endIdx: 29 },
    ];
    const grouped: Comparison30DaysPoint[] = [];
    weeklyRanges.forEach((range, idx) => {
      const slice = dailyPoints.slice(range.startIdx, range.endIdx + 1);
      const startP = slice[0];
      const endP = slice[slice.length - 1];
      const compSum = slice.reduce((s, p) => s + p.completedTasks, 0);
      const createSum = slice.reduce((s, p) => s + p.createdTasks, 0);

      grouped.push({
        dateKey: `W${idx + 1}_${startP.dateKey}`,
        label: `T${idx + 1} (${startP.label} - ${endP.label})`,
        fullLabel: `Tuần ${idx + 1} (${startP.label} - ${endP.label})`,
        completedTasks: compSum,
        createdTasks: createSum,
        netChange: compSum - createSum,
      });
    });
    dataPoints = grouped;
  }

  // Compute aggregate 30-day summary based on the 30 daily points
  const totalCompleted = dailyPoints.reduce((s, p) => s + p.completedTasks, 0);
  const totalCreated = dailyPoints.reduce((s, p) => s + p.createdTasks, 0);
  const netDifference = totalCompleted - totalCreated;
  const completionToCreationRatio = totalCreated > 0
    ? Math.round((totalCompleted / totalCreated) * 100)
    : (totalCompleted > 0 ? 100 : 0);

  const highestCompletedDay = dailyPoints.reduce(
    (max, p) => (p.completedTasks > max.count ? { label: p.label, count: p.completedTasks } : max),
    { label: 'Không có', count: 0 }
  );

  const highestCreatedDay = dailyPoints.reduce(
    (max, p) => (p.createdTasks > max.count ? { label: p.label, count: p.createdTasks } : max),
    { label: 'Không có', count: 0 }
  );

  let workloadStatus: 'healthy' | 'balanced' | 'overloaded' = 'balanced';
  let statusMessage = 'Cân bằng công việc: Tốc độ hoàn thành tương đương với khối lượng nhiệm vụ mới tạo.';

  if (totalCompleted > totalCreated) {
    workloadStatus = 'healthy';
    statusMessage = `Tốc độ nghiệm thu vượt trội: Đã giải quyết nhiều hơn ${netDifference} việc so với số việc giao mới, giúp giảm áp lực tồn đọng.`;
  } else if (totalCompleted < totalCreated) {
    workloadStatus = 'overloaded';
    statusMessage = `Khối lượng việc mới tăng: Số việc giao mới nhiều hơn ${Math.abs(netDifference)} việc so với việc hoàn thành, cần chú ý phân bổ tiến độ xử lý.`;
  }

  return {
    dataPoints,
    summary: {
      totalCompleted,
      totalCreated,
      netDifference,
      completionToCreationRatio,
      highestCompletedDay,
      highestCreatedDay,
      workloadStatus,
      statusMessage,
    },
  };
}

/**
 * Intelligent local AI / rule-based advisor fallback if server AI is unavailable.
 * Fully computes:
 * 1. Overview metrics
 * 2. Active tasks & subtasks execution health
 * 3. Weekly archive completion velocity and lead time
 * 4. System pragmatism assessment & User management maturity score
 */
export function generateLocalStrategicReview(tasks: Task[], now = new Date()): AIStrategicReview {
  const stats = calculateDashboardStats(tasks, now);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(now.getTime() - 7 * oneDayMs);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * oneDayMs);

  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.progress === 100);
  const activeTasks = tasks.filter((t) => t.status !== 'completed' && t.progress < 100);
  const overdueTasks = tasks.filter((t) => t.status === 'overdue');
  const urgentTasks = activeTasks.filter((t) => t.priority === 'high');

  // 1. Weekly Archive Analysis
  const thisWeekCompleted = completedTasks.filter((t) => {
    if (!t.completedAt) return false;
    return new Date(t.completedAt).getTime() >= sevenDaysAgo.getTime();
  });

  const lastWeekCompleted = completedTasks.filter((t) => {
    if (!t.completedAt) return false;
    const comp = new Date(t.completedAt).getTime();
    return comp >= fourteenDaysAgo.getTime() && comp < sevenDaysAgo.getTime();
  });

  const earlierCompleted = completedTasks.filter((t) => {
    if (!t.completedAt) return false;
    return new Date(t.completedAt).getTime() < fourteenDaysAgo.getTime();
  });

  let totalLeadTimeDays = 0;
  let onTimeCompletedCount = 0;
  completedTasks.forEach((t) => {
    if (t.completedAt && t.createdAt) {
      const lead = Math.max(0, (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / oneDayMs);
      totalLeadTimeDays += lead;
    }
    if (t.completedAt && t.dueDate) {
      if (new Date(t.completedAt).getTime() <= new Date(t.dueDate).getTime()) {
        onTimeCompletedCount++;
      }
    }
  });

  const avgLeadTimeDays = completedTasks.length > 0 ? +(totalLeadTimeDays / completedTasks.length).toFixed(1) : 0;
  const onTimeRate = completedTasks.length > 0 ? Math.round((onTimeCompletedCount / completedTasks.length) * 100) : 100;
  const weeklyVelocity = +(completedTasks.length / 2).toFixed(1); // normalized over active period

  const weeklySummaryText =
    thisWeekCompleted.length > 0
      ? `Tuần này đã nghiệm thu ${thisWeekCompleted.length} nhiệm vụ (tuần trước: ${lastWeekCompleted.length} nhiệm vụ). Tốc độ giải quyết đạt mức ổn định với thời gian hoàn tất trung bình ${avgLeadTimeDays} ngày/việc.`
      : `Đang có ${completedTasks.length} nhiệm vụ hoàn tất được lưu trữ trong kho. Tỷ lệ giao việc đúng hạn đạt ${onTimeRate}%.`;

  // 2. System Pragmatism Assessment
  const tasksWithSubtasks = tasks.filter((t) => t.subtasks && t.subtasks.length > 0).length;
  const tasksWithAttachments = tasks.filter((t) => (t.attachments && t.attachments.length > 0) || (t.links && t.links.length > 0)).length;
  const tasksWithUnit = tasks.filter((t) => t.unit && t.unit.trim().length > 0).length;
  const tasksWithDueDate = tasks.filter((t) => Boolean(t.dueDate)).length;

  const subtaskUtilizationRate = tasks.length > 0 ? Math.round((tasksWithSubtasks / tasks.length) * 100) : 0;
  const attachmentUtilizationRate = tasks.length > 0 ? Math.round((tasksWithAttachments / tasks.length) * 100) : 0;
  const unitAssignmentRate = tasks.length > 0 ? Math.round((tasksWithUnit / tasks.length) * 100) : 0;
  const deadlinePrecisionRate = tasks.length > 0 ? Math.round((tasksWithDueDate / tasks.length) * 100) : 100;

  let pragmatismScore = Math.round(
    subtaskUtilizationRate * 0.35 +
    attachmentUtilizationRate * 0.25 +
    unitAssignmentRate * 0.25 +
    deadlinePrecisionRate * 0.15
  );
  pragmatismScore = Math.max(40, Math.min(98, pragmatismScore));

  let pragmatismGrade = 'Thực chiến Khá';
  if (pragmatismScore >= 85) pragmatismGrade = 'Rất cao - Thực chiến tối đa';
  else if (pragmatismScore >= 70) pragmatismGrade = 'Thực chiến Tốt & Chuẩn hóa';
  else if (pragmatismScore < 60) pragmatismGrade = 'Cần gia tăng minh chứng & phân rã việc';

  const practicalStrengths: string[] = [];
  const practicalGaps: string[] = [];

  if (subtaskUtilizationRate >= 75) {
    practicalStrengths.push(`Tỷ lệ chia nhỏ nhiệm vụ thành checklists đạt ${subtaskUtilizationRate}%, giúp kiểm soát sát sao từng đầu việc con.`);
  } else {
    practicalGaps.push('Nhiều nhiệm vụ chưa được bẻ nhỏ thành subtasks, dễ dẫn đến chậm tiến độ khi thực thi.');
  }

  if (attachmentUtilizationRate >= 60) {
    practicalStrengths.push(`Có ${attachmentUtilizationRate}% nhiệm vụ được gắn tệp/link minh chứng, đảm bảo tính pháp lý và lưu trữ hồ sơ.`);
  } else {
    practicalGaps.push('Nên bổ sung tài liệu đính kèm hoặc link Google Drive vào nhiệm vụ để phục vụ công tác nghiệm thu.');
  }

  if (unitAssignmentRate >= 85) {
    practicalStrengths.push('100% nhiệm vụ được phân công rõ ràng cho từng đơn vị sinh hoạt cụ thể, không bị chồng chéo.');
  }

  // 3. Task Execution Health
  let healthLevel: 'healthy' | 'warning' | 'critical' = 'healthy';
  let healthLabel = 'Tiến độ Ổn định & Lành mạnh';

  if (overdueTasks.length >= 3) {
    healthLevel = 'critical';
    healthLabel = 'Cảnh báo Đỏ: Tồn đọng quá hạn nghiêm trọng';
  } else if (overdueTasks.length > 0 || urgentTasks.length >= 4) {
    healthLevel = 'warning';
    healthLabel = 'Cần lưu ý: Có việc quá hạn và áp lực việc khẩn';
  }

  const bottlenecks: string[] = [];
  const immediateRisks: string[] = [];

  if (overdueTasks.length > 0) {
    bottlenecks.push(`Hiện có ${overdueTasks.length} nhiệm vụ trễ hạn chót (${overdueTasks.map((t) => t.title).slice(0, 2).join('; ')}...).`);
    immediateRisks.push(`Cần xử lý khẩn cấp ${overdueTasks.length} việc quá hạn để tránh ảnh hưởng đến chỉ tiêu thi đua.`);
  }

  if (urgentTasks.length > 0) {
    bottlenecks.push(`Khối lượng việc gấp ưu tiên cao đang mở: ${urgentTasks.length} nhiệm vụ.`);
  }

  if (bottlenecks.length === 0) {
    bottlenecks.push('Quy trình xử lý trôi chảy, không có nhiệm vụ nào bị ùn tắc quá hạn.');
  }

  // 4. User Management Capability & Maturity & Strict 0/100 Initial Score Rule
  let score = 0;
  let grade = 'Khởi điểm (0/100)';

  if (completedTasks.length === 0) {
    // Initial state: strictly 0/100 until user finishes their first task
    score = 0;
    grade = 'Khởi điểm (0/100)';
  } else {
    // Dynamic score accumulation as tasks are completed and quality is maintained
    const completionPart = Math.round((completedTasks.length / Math.max(1, tasks.length)) * 40); // 0 - 40 pts
    const onTimePart = Math.round((onTimeRate / 100) * 25); // 0 - 25 pts
    const subtaskPart = Math.round((subtaskUtilizationRate / 100) * 15); // 0 - 15 pts
    const attachmentPart = Math.round((attachmentUtilizationRate / 100) * 10); // 0 - 10 pts
    const volumeBonus = Math.min(10, completedTasks.length * 2); // 0 - 10 pts
    const overduePenalty = Math.min(30, stats.overdue * 7);

    let rawScore = completionPart + onTimePart + subtaskPart + attachmentPart + volumeBonus - overduePenalty;
    score = Math.max(10, Math.min(100, Math.round(rawScore)));

    if (score >= 90) grade = 'Xuất sắc (A+)';
    else if (score >= 80) grade = 'Tốt (A)';
    else if (score >= 65) grade = 'Khá (B)';
    else if (score >= 50) grade = 'Trung bình (C)';
    else grade = 'Cần cải thiện (D)';
  }

  const planningScore = tasks.length === 0 ? 0 : Math.min(95, Math.max(20, Math.round(deadlinePrecisionRate * 0.6 + unitAssignmentRate * 0.4)));
  const executionDisciplineScore = completedTasks.length === 0 ? 0 : Math.min(95, Math.max(20, Math.round(onTimeRate * 0.7 + stats.completionRate * 0.3)));
  const deadlineControlScore = tasks.length === 0 ? 100 : Math.max(20, Math.min(100, Math.round(100 - stats.overdue * 20)));
  const crossUnitCoordinationScore = tasks.length === 0 ? 0 : Math.min(95, Math.max(30, Math.round(unitAssignmentRate * 0.6 + stats.completionRate * 0.4)));

  const capabilityScore = tasks.length === 0 
    ? 0 
    : Math.round((planningScore + executionDisciplineScore + deadlineControlScore + crossUnitCoordinationScore) / 4);

  let maturityStage = 'Cấp 1: Thiết Lập & Khởi Đầu';
  if (capabilityScore >= 88) maturityStage = 'Cấp 5: Lãnh Đạo Điều Hành Xuất Sắc';
  else if (capabilityScore >= 75) maturityStage = 'Cấp 4: Quản Trị Linh Hoạt & Chiến Lược';
  else if (capabilityScore >= 60) maturityStage = 'Cấp 3: Thực Thi Kỷ Luật & Chuẩn Hóa';
  else if (capabilityScore >= 40) maturityStage = 'Cấp 2: Quản Lý Đang Hoàn Thiện';

  const userStrengths: string[] = [];
  const userGrowthAreas: string[] = [];

  if (completedTasks.length > 0) {
    if (onTimeRate >= 80) {
      userStrengths.push('Kỷ luật thời gian vững vàng, tỷ lệ hoàn thành đúng hẹn đạt mức cao.');
    }
    if (subtaskUtilizationRate >= 70) {
      userStrengths.push('Khả năng bẻ khóa mục tiêu và phân rã công việc chi tiết thành checklist con.');
    }
  }

  if (userStrengths.length === 0) {
    userStrengths.push(
      tasks.length === 0
        ? 'Hệ thống đã sẵn sàng đón nhận các nhiệm vụ và mục tiêu công tác mới của bạn.'
        : 'Đã thiết lập danh sách nhiệm vụ cần làm rõ ràng.'
    );
  }

  if (stats.overdue > 0) {
    userGrowthAreas.push(`Cần siết chặt kiểm soát ${stats.overdue} việc quá hạn để triệt tiêu tỷ lệ trễ.`);
  }
  if (completedTasks.length === 0 && tasks.length > 0) {
    userGrowthAreas.push('Ưu tiên hoàn thành nghiệm thu nhiệm vụ đầu tiên để kích hoạt tích lũy điểm hiệu suất.');
  }
  if (subtaskUtilizationRate < 70 && tasks.length > 0) {
    userGrowthAreas.push('Nên tận dụng AI phân rã nhiệm vụ lớn để kiểm soát các đầu việc con dễ dàng hơn.');
  }
  if (userGrowthAreas.length === 0) {
    userGrowthAreas.push('Tiếp tục duy trì nhịp độ hoàn tất và cập nhật minh chứng kết quả.');
  }

  // 5. Gap Analysis (Thiếu sót ở mục nào, nội dung nào)
  const gaps: Array<{
    id: string;
    category: 'completion' | 'subtasks' | 'deadline' | 'unit' | 'attachments';
    title: string;
    description: string;
    recommendation: string;
    severity: 'critical' | 'warning' | 'info';
  }> = [];

  if (completedTasks.length === 0) {
    gaps.push({
      id: 'gap-no-completed',
      category: 'completion',
      title: 'Thiếu nhiệm vụ hoàn thành trong Kho Lưu Trữ (Điểm hiện tại: 0/100)',
      description: 'Hệ thống bắt đầu ở mức 0/100 điểm. Bạn chưa có nhiệm vụ nào hoàn tất 100% để nghiệm thu vào ArchiveVault.',
      recommendation: 'Chọn một nhiệm vụ ưu tiên, tích chọn hoàn thành các subtasks và lưu trữ để bắt đầu tích lũy điểm năng suất.',
      severity: 'critical',
    });
  }

  if (stats.overdue > 0) {
    gaps.push({
      id: 'gap-overdue',
      category: 'deadline',
      title: `Có ${stats.overdue} nhiệm vụ đã trễ hạn chót`,
      description: 'Nhiệm vụ quá hạn làm giảm nghiêm trọng điểm kiểm soát rủi ro và kéo lùi chỉ số hiệu suất tổng hợp.',
      recommendation: 'Thực hiện dập lửa ngay hôm nay hoặc điều chỉnh lại thời hạn thực tế nếu có phát sinh khách quan.',
      severity: 'critical',
    });
  }

  const tasksWithoutSubtasks = tasks.filter((t) => !t.subtasks || t.subtasks.length === 0);
  if (tasksWithoutSubtasks.length > 0) {
    gaps.push({
      id: 'gap-subtasks',
      category: 'subtasks',
      title: `Còn ${tasksWithoutSubtasks.length} nhiệm vụ chưa được phân rã subtasks`,
      description: 'Nhiệm vụ để nguyên khối với mô tả dài mà không chia nhỏ sẽ rất khó theo dõi tiến độ chính xác theo tỷ lệ %.',
      recommendation: 'Bấm vào chỉnh sửa nhiệm vụ và dùng tính năng "AI Phân rã nhiệm vụ lớn (WBS)" để tự động tạo 4-6 việc con.',
      severity: 'warning',
    });
  }

  const tasksWithoutAttachments = tasks.filter((t) => (!t.attachments || t.attachments.length === 0) && (!t.links || t.links.length === 0));
  if (tasksWithoutAttachments.length > 0 && tasks.length > 0) {
    gaps.push({
      id: 'gap-attachments',
      category: 'attachments',
      title: `Còn ${tasksWithoutAttachments.length} nhiệm vụ thiếu hồ sơ/link minh chứng`,
      description: 'Thiếu tệp đính kèm văn bản, quyết định hoặc đường link Google Docs/Drive dẫn chứng kết quả.',
      recommendation: 'Tải lên tài liệu hoặc dán link báo cáo liên quan để bảo đảm tính thực chiến và dễ nghiệm thu.',
      severity: 'info',
    });
  }

  // 6. Strategic Recommendations
  const recommendations: StrategicRecommendation[] = [];

  if (stats.overdue > 0) {
    recommendations.push({
      id: 'rec-1',
      title: 'Chiến thuật Dập lửa 90 phút đầu ngày',
      detail: `Tập trung giải quyết dứt điểm ${stats.overdue} nhiệm vụ đã quá hạn chót hoặc thương lượng dời mốc nghiệm thu hợp lý.`,
      tag: 'Cấp bách',
      impact: 'high',
      timeframe: 'today',
    });
  }

  if (completedTasks.length === 0) {
    recommendations.push({
      id: 'rec-start',
      title: 'Khai thông dòng chảy công việc (Quick Win)',
      detail: 'Chọn 1 nhiệm vụ nhỏ nhất, hoàn tất checklist và nghiệm thu để mở điểm năng suất ban đầu vượt qua mốc 0/100.',
      tag: 'Khởi đầu nhanh',
      impact: 'high',
      timeframe: 'today',
    });
  }

  recommendations.push({
    id: 'rec-2',
    title: 'Phân rã nhiệm vụ lớn bằng AI (WBS)',
    detail: 'Với những công việc có mô tả dài hoặc phức tạp, sử dụng nút "AI Phân rã nhiệm vụ lớn" trong biểu mẫu để chia nhỏ công việc.',
    tag: 'Tối ưu phân rã',
    impact: 'high',
    timeframe: 'this_week',
  });

  recommendations.push({
    id: 'rec-3',
    title: 'Đồng bộ hóa ngoại tuyến & Lịch công tác',
    detail: 'Hệ thống tự động lưu trữ trên máy khi offline và đồng bộ lên máy chủ ngay khi có mạng. Tận dụng liên kết Google Calendar để nhắc việc.',
    tag: 'Đồng bộ hệ thống',
    impact: 'medium',
    timeframe: 'this_week',
  });

  let overallSummary = '';
  if (completedTasks.length === 0) {
    overallSummary = tasks.length === 0
      ? 'Hệ thống đang ở trạng thái mới hoàn toàn (0/100 điểm). Hãy tạo nhiệm vụ đầu tiên và hoàn tất các hạng mục để cố vấn AI bắt đầu chấm điểm và định hướng chiến lược.'
      : `Bạn đang có ${tasks.length} nhiệm vụ đang mở nhưng chưa có nhiệm vụ nào hoàn tất (Điểm: 0/100). Hãy nghiệm thu các nhiệm vụ đầu tiên để bắt đầu tăng điểm năng suất!`;
  } else {
    overallSummary = `Hệ thống ghi nhận tổng cộng ${stats.total} nhiệm vụ (${stats.completed} đã hoàn thành, ${stats.inProgress} đang thực hiện, ${stats.overdue} quá hạn). Điểm năng suất đạt ${score}/100 (${grade}), năng lực quản trị đạt ${capabilityScore}/100.`;
  }

  return {
    score,
    grade,
    overallSummary,
    completionRate: stats.completionRate,
    onTimeRate,
    averageVelocityDays: avgLeadTimeDays,
    weeklyArchiveAnalysis: {
      thisWeekCompletedCount: thisWeekCompleted.length,
      lastWeekCompletedCount: lastWeekCompleted.length,
      earlierCompletedCount: earlierCompleted.length,
      averageLeadTimeDays: avgLeadTimeDays,
      onTimeCompletionRate: onTimeRate,
      weeklyVelocity,
      weeklySummaryText,
    },
    systemPragmatism: {
      pragmatismScore,
      pragmatismGrade,
      subtaskUtilizationRate,
      attachmentUtilizationRate,
      deadlinePrecisionRate,
      unitAssignmentRate,
      assessmentSummary: `Người dùng khai thác hệ thống với mức độ thực chiến: ${subtaskUtilizationRate}% việc có checklists cụ thể, ${attachmentUtilizationRate}% có tài liệu minh chứng, và ${unitAssignmentRate}% được gán đơn vị rõ ràng.`,
      practicalStrengths,
      practicalGaps,
    },
    taskExecution: {
      healthLevel,
      healthLabel,
      urgentPendingCount: urgentTasks.length,
      overdueCount: overdueTasks.length,
      inProgressCount: activeTasks.length,
      executionSummary: `Hiện có ${activeTasks.length} nhiệm vụ đang mở, trong đó có ${urgentTasks.length} việc ưu tiên cao và ${overdueTasks.length} việc quá hạn.`,
      bottlenecks,
      immediateRisks,
    },
    userManagement: {
      capabilityScore,
      maturityStage,
      planningScore,
      executionDisciplineScore,
      deadlineControlScore,
      crossUnitCoordinationScore,
      strengths: userStrengths,
      growthAreas: userGrowthAreas,
      coachingGuidance:
        stats.overdue > 0
          ? 'Hãy chuyển từ thế bị động xử lý việc gấp sang chủ động chặn trước rủi ro. Dành 15 phút rà soát deadline mỗi ngày.'
          : completedTasks.length === 0
          ? 'Hãy bắt đầu với những nhiệm vụ đầu tiên để kích hoạt chỉ số năng suất và tạo đà bứt phá!'
          : 'Phong độ quản lý rất ấn tượng! Tiếp tục giữ vững kỷ luật thời gian và bám sát các mục tiêu tuần.',
    },
    gaps,
    strengths: userStrengths,
    bottlenecks,
    recommendations,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Unified calculation engine for administrative and performance reports.
 * Used identically across ReportExportModal, ArchiveVault, and export utilities.
 */
export function calculateReportStatisticsForTasks(
  tasks: Task[],
  options: {
    periodType?: ReportPeriodType;
    unit?: string;
    startTime?: number;
    endTime?: number;
    refDate?: Date;
  } = {}
): {
  filteredTasks: Task[];
  stats: ReportStatistics;
  periodLabel: string;
  defaultTitle: string;
  defaultSubtitle: string;
} {
  const {
    periodType = 'month',
    unit = 'all',
    startTime,
    endTime,
    refDate = new Date(),
  } = options;

  let pool = tasks;
  if (unit !== 'all') {
    pool = pool.filter((t) => t.unit === unit);
  }

  const now = refDate;
  let sTime = startTime;
  let eTime = endTime;
  let label = '';
  let title = 'BÁO CÁO KẾT QUẢ THỰC HIỆN CÔNG VIỆC';
  let subtitle = '';

  if (periodType === 'archive') {
    // All completed / archived tasks
    const relevantTasks = pool.filter(
      (t) => t.status === 'completed' || t.progress === 100
    );

    let onTimeCount = 0;
    let lateCount = 0;
    let totalLeadTimeMs = 0;

    for (const t of relevantTasks) {
      const dueTime = t.dueDate ? new Date(t.dueDate).getTime() : 0;
      const compTime = t.completedAt ? new Date(t.completedAt).getTime() : now.getTime();

      if (dueTime === 0 || compTime <= dueTime) {
        onTimeCount++;
      } else {
        lateCount++;
      }
      totalLeadTimeMs += getSafeTaskLeadDurationMs(t, compTime);
    }

    const total = relevantTasks.length;
    const onTimeRate = total > 0 ? Math.round((onTimeCount / total) * 100) : 100;
    const avgLeadHours = total > 0 ? Number((totalLeadTimeMs / (total * 3600000)).toFixed(1)) : 0;
    const totalExecHours = Number((totalLeadTimeMs / 3600000).toFixed(1));

    label = 'Kho Lưu Trữ Hồ Sơ Hoàn Thành';
    title = 'BÁO CÁO KẾT QUẢ THỰC HIỆN VÀ LƯU TRỮ NHIỆM VỤ HOÀN THÀNH';
    subtitle = `Kỳ đánh giá: Kho lưu trữ công việc đã nghiệm thu (${total} nhiệm vụ)`;

    return {
      filteredTasks: relevantTasks,
      stats: {
        totalTasks: total,
        completedTasks: total,
        completedOnTime: onTimeCount,
        completedLate: lateCount,
        inProgressTasks: 0,
        backlogTasks: 0,
        completionRate: 100,
        onTimeRate,
        avgLeadTimeHours: avgLeadHours,
        totalExecutionHours: totalExecHours,
      },
      periodLabel: label,
      defaultTitle: title,
      defaultSubtitle: subtitle,
    };
  }

  // Calculate time bounds for other period types if not explicitly provided
  if (sTime === undefined || eTime === undefined) {
    if (periodType === 'day') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      sTime = startOfDay.getTime();
      eTime = endOfDay.getTime();
      label = `Ngày ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
      title = 'BÁO CÁO HIỆU SUẤT CÔNG TÁC NGÀY';
      subtitle = `Kỳ đánh giá: ${label}`;
    } else if (periodType === 'week') {
      const currentDay = now.getDay();
      const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
      const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distanceToMon, 0, 0, 0, 0);
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6, 23, 59, 59, 999);
      sTime = mon.getTime();
      eTime = sun.getTime();
      label = `Tuần (Ngày ${mon.getDate().toString().padStart(2, '0')}/${(mon.getMonth() + 1).toString().padStart(2, '0')} - ${sun.getDate().toString().padStart(2, '0')}/${(sun.getMonth() + 1).toString().padStart(2, '0')}/${sun.getFullYear()})`;
      title = 'BÁO CÁO HIỆU SUẤT CÔNG TÁC TUẦN';
      subtitle = `Kỳ đánh giá: ${label}`;
    } else if (periodType === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      sTime = startOfYear.getTime();
      eTime = endOfYear.getTime();
      label = `Năm ${now.getFullYear()}`;
      title = 'BÁO CÁO KẾT QUẢ CÔNG TÁC NĂM';
      subtitle = `Kỳ đánh giá: ${label}`;
    } else {
      // month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      sTime = startOfMonth.getTime();
      eTime = endOfMonth.getTime();
      label = `Tháng ${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
      title = 'BÁO CÁO KẾT QUẢ THỰC HIỆN CÔNG VIỆC THÁNG';
      subtitle = `Kỳ đánh giá: ${label}`;
    }
  }

  const relevantTasks: Task[] = [];
  let completedInPeriodCount = 0;
  let onTimeCount = 0;
  let lateCount = 0;
  let inProgressCount = 0;
  let backlogCount = 0;
  let totalLeadTimeMs = 0;

  for (const t of pool) {
    const createdTime = t.createdAt ? new Date(t.createdAt).getTime() : 0;
    const completedTime = t.completedAt ? new Date(t.completedAt).getTime() : 0;
    const dueTime = t.dueDate ? new Date(t.dueDate).getTime() : 0;

    const isCompletedInPeriod =
      (t.status === 'completed' || t.progress === 100) &&
      completedTime >= sTime &&
      completedTime <= eTime;
    const isCreatedInPeriod = createdTime >= sTime && createdTime <= eTime;
    const isBacklog = createdTime < sTime && t.status !== 'completed' && t.progress < 100;

    if (isCompletedInPeriod || isCreatedInPeriod || isBacklog) {
      relevantTasks.push(t);

      if (t.status === 'completed' || t.progress === 100) {
        completedInPeriodCount++;
        if (dueTime === 0 || completedTime <= dueTime) {
          onTimeCount++;
        } else {
          lateCount++;
        }
        totalLeadTimeMs += getSafeTaskLeadDurationMs(t, completedTime);
      } else if (isBacklog) {
        backlogCount++;
      } else {
        inProgressCount++;
      }
    }
  }

  const total = relevantTasks.length;
  const completionRate = total > 0 ? Math.round((completedInPeriodCount / total) * 100) : 0;
  const onTimeRate = completedInPeriodCount > 0 ? Math.round((onTimeCount / completedInPeriodCount) * 100) : 100;
  const avgLeadHours = completedInPeriodCount > 0 ? Number((totalLeadTimeMs / (completedInPeriodCount * 3600000)).toFixed(1)) : 0;
  const totalExecHours = Number((totalLeadTimeMs / 3600000).toFixed(1));

  return {
    filteredTasks: relevantTasks,
    stats: {
      totalTasks: total,
      completedTasks: completedInPeriodCount,
      completedOnTime: onTimeCount,
      completedLate: lateCount,
      inProgressTasks: inProgressCount,
      backlogTasks: backlogCount,
      onTimeRate,
      completionRate,
      avgLeadTimeHours: avgLeadHours,
      totalExecutionHours: totalExecHours,
    },
    periodLabel: label,
    defaultTitle: title,
    defaultSubtitle: subtitle,
  };
}

