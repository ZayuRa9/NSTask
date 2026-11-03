import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProgress,
  filterTasksBySearchQuery,
  isTaskOverdue,
  getTaskStatus,
  formatDateVietnamese,
  generateGoogleCalendarUrl,
  calculateDashboardStats,
  generateLocalStrategicReview,
  calculateWeeklyTrend,
  calculateMonthlyTrend,
  getTopUrgentTasks,
  formatBirthDateVietnamese,
  isTaskThisWeek,
  isTaskThisMonth,
  isTaskUpcoming,
  filterTasksByTimeframe,
  getTimeframeCounts,
  getTaskTimeframeBadge,
  calculateWeeklyPerformanceTrend,
  calculate30DaysCreationVsCompletionTrend,
  getSafeTaskLeadDurationMs,
  calculateDailyPerformanceSummary,
  calculateWeeklyProductivityTrend
} from './taskCalculations.ts';
import { Task, Subtask, TaskTimeframeFilter } from '../types/task.ts';

test('calculateProgress returns correct percentage', () => {
  assert.equal(calculateProgress([]), 0);

  const subtasks: Subtask[] = [
    { id: '1', title: 'Task 1', completed: true },
    { id: '2', title: 'Task 2', completed: false },
    { id: '3', title: 'Task 3', completed: true },
    { id: '4', title: 'Task 4', completed: false }
  ];
  assert.equal(calculateProgress(subtasks), 50);

  const allCompleted: Subtask[] = [
    { id: '1', title: 'Task 1', completed: true },
    { id: '2', title: 'Task 2', completed: true }
  ];
  assert.equal(calculateProgress(allCompleted), 100);
});

test('isTaskOverdue detects overdue and completed dates correctly', () => {
  const baseTime = new Date('2026-10-22T10:00:00Z');
  const pastDue = '2026-10-20T10:00:00Z';
  const futureDue = '2026-10-25T10:00:00Z';

  assert.equal(isTaskOverdue(pastDue, undefined, baseTime), true);
  assert.equal(isTaskOverdue(futureDue, undefined, baseTime), false);
  // If completed, not overdue now
  assert.equal(isTaskOverdue(pastDue, '2026-10-19T10:00:00Z', baseTime), false);
});

test('getTaskStatus derives correct status', () => {
  const now = new Date('2026-10-22T12:00:00Z');

  // Completed
  assert.equal(
    getTaskStatus(
      { dueDate: '2026-10-20T12:00:00Z', completedAt: '2026-10-20T11:00:00Z', progress: 100, subtasks: [] },
      now
    ),
    'completed'
  );

  // Overdue
  assert.equal(
    getTaskStatus(
      { dueDate: '2026-10-20T12:00:00Z', completedAt: undefined, progress: 30, subtasks: [] },
      now
    ),
    'overdue'
  );

  // In progress
  assert.equal(
    getTaskStatus(
      { dueDate: '2026-10-25T12:00:00Z', completedAt: undefined, progress: 50, subtasks: [] },
      now
    ),
    'in_progress'
  );

  // Pending
  assert.equal(
    getTaskStatus(
      { dueDate: '2026-10-25T12:00:00Z', completedAt: undefined, progress: 0, subtasks: [] },
      now
    ),
    'pending'
  );
});

test('generateGoogleCalendarUrl formats calendar link with query parameters', () => {
  const url = generateGoogleCalendarUrl({
    title: 'Họp chi hội thường kỳ',
    description: 'Thảo luận kế hoạch sinh hoạt',
    createdAt: '2026-10-22T08:00:00Z',
    dueDate: '2026-10-22T10:00:00Z',
    unit: 'Chi hội 1'
  });

  assert.match(url, /https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
  assert.match(url, /Chi%20h%E1%BB%99i%201/);
});

test('calculateDashboardStats aggregates tasks and unit breakdown', () => {
  const now = new Date('2026-10-22T12:00:00Z');
  const tasks: Task[] = [
    {
      id: 't1',
      title: 'Task 1',
      description: '',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: '2026-10-20T00:00:00Z',
      dueDate: '2026-10-21T00:00:00Z',
      completedAt: '2026-10-20T10:00:00Z',
      progress: 100,
      status: 'completed',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 30 }
    },
    {
      id: 't2',
      title: 'Task 2',
      description: '',
      unit: 'Ban Thanh Niên',
      priority: 'medium',
      createdAt: '2026-10-20T00:00:00Z',
      dueDate: '2026-10-21T00:00:00Z', // past due & not completed
      progress: 20,
      status: 'overdue',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 30 }
    },
    {
      id: 't3',
      title: 'Task 3',
      description: '',
      unit: 'Phòng Kỹ Thuật',
      priority: 'high',
      createdAt: '2026-10-21T00:00:00Z',
      dueDate: '2026-10-25T00:00:00Z',
      progress: 40,
      status: 'in_progress',
      subtasks: [{ id: 's1', title: 'Sub 1', completed: true }],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 30 }
    }
  ];

  const stats = calculateDashboardStats(tasks, now);
  assert.equal(stats.total, 3);
  assert.equal(stats.completed, 1);
  assert.equal(stats.overdue, 1);
  assert.equal(stats.inProgress, 1);
  assert.equal(stats.highPriorityCount, 2);
  assert.equal(stats.unitDistribution['Ban Thanh Niên'].total, 2);
  assert.equal(stats.unitDistribution['Ban Thanh Niên'].completed, 1);
  assert.equal(stats.unitDistribution['Ban Thanh Niên'].overdue, 1);
});

test('generateLocalStrategicReview produces grade and recommendations', () => {
  const review = generateLocalStrategicReview([]);
  assert.ok(review.score >= 0 && review.score <= 100);
  assert.ok(review.recommendations.length > 0);
  assert.ok(review.grade);
});

test('filterTasksBySearchQuery matches title and description real-time', () => {
  const sampleTasks: Task[] = [
    {
      id: '1',
      title: 'Họp ban thường vụ',
      description: 'Lập kế hoạch thanh niên',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: '2026-10-20T00:00:00Z',
      dueDate: '2026-10-25T00:00:00Z',
      progress: 0,
      status: 'pending',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 15 },
    },
    {
      id: '2',
      title: 'Chiến dịch xanh',
      description: 'Dọn dẹp môi trường',
      unit: 'CLB Tình Nguyện',
      priority: 'low',
      createdAt: '2026-10-20T00:00:00Z',
      dueDate: '2026-10-25T00:00:00Z',
      progress: 0,
      status: 'pending',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 15 },
    },
  ];

  // Match by title
  assert.equal(filterTasksBySearchQuery(sampleTasks, 'Họp').length, 1);
  assert.equal(filterTasksBySearchQuery(sampleTasks, 'Họp')[0].id, '1');

  // Match by description
  assert.equal(filterTasksBySearchQuery(sampleTasks, 'môi trường').length, 1);
  assert.equal(filterTasksBySearchQuery(sampleTasks, 'môi trường')[0].id, '2');

  // Case insensitive
  assert.equal(filterTasksBySearchQuery(sampleTasks, 'chiến dịch').length, 1);

  // No match
  assert.equal(filterTasksBySearchQuery(sampleTasks, 'không tồn tại').length, 0);

  // Empty query returns all
  assert.equal(filterTasksBySearchQuery(sampleTasks, '').length, 2);
});

test('calculateWeeklyTrend returns 7 day points with completed and created counts', () => {
  const refDate = new Date('2026-10-22T12:00:00Z');
  const sampleTasks: Task[] = [
    {
      id: '1',
      title: 'Task today',
      description: '',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: '2026-10-22T08:00:00Z',
      dueDate: '2026-10-25T00:00:00Z',
      completedAt: '2026-10-22T10:00:00Z',
      progress: 100,
      status: 'completed',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 15 },
    },
  ];

  const trend = calculateWeeklyTrend(sampleTasks, refDate);
  assert.equal(trend.length, 7);
  const lastPoint = trend[trend.length - 1];
  assert.equal(lastPoint.completed, 1);
  assert.equal(lastPoint.created, 1);
});

test('calculateMonthlyTrend returns 6 month points', () => {
  const refDate = new Date('2026-10-22T12:00:00Z');
  const trend = calculateMonthlyTrend([], refDate);
  assert.equal(trend.length, 6);
  assert.ok(trend[0].label.includes('Thg'));
});

test('getTopUrgentTasks prioritizes overdue and high priority tasks', () => {
  const refDate = new Date('2026-10-22T12:00:00Z');
  const tasks: Task[] = [
    {
      id: 'low-future',
      title: 'Low priority',
      description: '',
      unit: 'Ban Thanh Niên',
      priority: 'low',
      createdAt: '2026-10-20T00:00:00Z',
      dueDate: '2026-10-28T00:00:00Z',
      progress: 0,
      status: 'pending',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 0 },
    },
    {
      id: 'high-urgent',
      title: 'High priority urgent',
      description: '',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: '2026-10-20T00:00:00Z',
      dueDate: '2026-10-24T00:00:00Z',
      progress: 20,
      status: 'in_progress',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 0 },
    },
    {
      id: 'overdue-task',
      title: 'Overdue task',
      description: '',
      unit: 'Ban Thanh Niên',
      priority: 'medium',
      createdAt: '2026-10-15T00:00:00Z',
      dueDate: '2026-10-20T00:00:00Z', // past
      progress: 50,
      status: 'overdue',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 0 },
    },
    {
      id: 'done-task',
      title: 'Already completed',
      description: '',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: '2026-10-15T00:00:00Z',
      dueDate: '2026-10-20T00:00:00Z',
      completedAt: '2026-10-19T00:00:00Z',
      progress: 100,
      status: 'completed',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 0 },
    },
  ];

  const top3 = getTopUrgentTasks(tasks, 3, refDate);
  assert.equal(top3.length, 3);
  // First must be overdue
  assert.equal(top3[0].id, 'overdue-task');
  // Second must be high priority
  assert.equal(top3[1].id, 'high-urgent');
  assert.equal(top3[2].id, 'low-future');
});

test('generateLocalStrategicReview computes all 4 required evaluation pillars', () => {
  const refDate = new Date('2026-10-22T12:00:00Z');
  const tasks: Task[] = [
    {
      id: 'task-1',
      title: 'Xây dựng kế hoạch công tác',
      description: 'Lập kế hoạch chi tiết',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: '2026-10-18T08:00:00Z',
      dueDate: '2026-10-21T17:00:00Z',
      completedAt: '2026-10-20T16:00:00Z',
      progress: 100,
      status: 'completed',
      subtasks: [
        { id: 's1', title: 'Khảo sát', completed: true },
        { id: 's2', title: 'Tổng hợp', completed: true },
      ],
      attachments: [{ id: 'a1', name: 'kehoach.docx', size: 1000, type: 'docx', uploadDate: '2026-10-18' }],
      links: [],
      reminder: { enabled: true, minutesBefore: 30 },
    },
    {
      id: 'task-2',
      title: 'Báo cáo định kỳ',
      description: 'Soạn thảo báo cáo',
      unit: 'Phòng Kế Hoạch',
      priority: 'medium',
      createdAt: '2026-10-10T08:00:00Z',
      dueDate: '2026-10-19T17:00:00Z',
      progress: 40,
      status: 'overdue',
      subtasks: [
        { id: 's3', title: 'Thu thập số liệu', completed: true },
        { id: 's4', title: 'Viết báo cáo', completed: false },
      ],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 60 },
    },
  ];

  const review = generateLocalStrategicReview(tasks, refDate);

  // Pillar 1: System Pragmatism
  assert.ok(review.systemPragmatism);
  assert.ok(review.systemPragmatism.pragmatismScore >= 0 && review.systemPragmatism.pragmatismScore <= 100);
  assert.equal(review.systemPragmatism.subtaskUtilizationRate, 100);
  assert.equal(review.systemPragmatism.attachmentUtilizationRate, 50);
  assert.ok(review.systemPragmatism.practicalStrengths.length > 0);

  // Pillar 2: Task Execution Health
  assert.ok(review.taskExecution);
  assert.equal(review.taskExecution.overdueCount, 1);
  assert.ok(['healthy', 'warning', 'critical'].includes(review.taskExecution.healthLevel));
  assert.ok(review.taskExecution.bottlenecks.length > 0);

  // Pillar 3: User Management Capability
  assert.ok(review.userManagement);
  assert.ok(review.userManagement.capabilityScore >= 0 && review.userManagement.capabilityScore <= 100);
  assert.ok(review.userManagement.planningScore > 0);
  assert.ok(review.userManagement.coachingGuidance.length > 0);

  // Pillar 4: Strategic Recommendations & Weekly Archive
  assert.ok(review.weeklyArchiveAnalysis);
  assert.equal(review.weeklyArchiveAnalysis.thisWeekCompletedCount, 1);
  assert.ok(review.recommendations.length >= 3);
  assert.ok(review.recommendations.some((r) => r.timeframe === 'today' || r.timeframe === 'this_week'));

  // Gaps analysis
  assert.ok(Array.isArray(review.gaps));
  assert.ok(review.gaps.some((g) => g.category === 'deadline')); // task-2 is overdue
});

test('generateLocalStrategicReview enforces 0/100 score initially and increases upon completion', () => {
  // Empty tasks -> strictly 0
  const emptyReview = generateLocalStrategicReview([]);
  assert.equal(emptyReview.score, 0);
  assert.equal(emptyReview.grade, 'Khởi điểm (0/100)');
  assert.ok(emptyReview.gaps.some((g) => g.id === 'gap-no-completed'));

  // Tasks created but none completed -> strictly 0
  const pendingTasks: Task[] = [
    {
      id: 't-pending',
      title: 'Kế hoạch công tác năm',
      description: 'Lập bản thảo',
      unit: 'Ban Thanh Niên',
      priority: 'high',
      createdAt: '2026-10-22T08:00:00Z',
      dueDate: '2026-10-25T17:00:00Z',
      progress: 0,
      status: 'pending',
      subtasks: [{ id: 's1', title: 'Thu thập số liệu', completed: false }],
      attachments: [],
      links: [],
      reminder: { enabled: true, minutesBefore: 30 }
    }
  ];
  const pendingReview = generateLocalStrategicReview(pendingTasks);
  assert.equal(pendingReview.score, 0);
  assert.equal(pendingReview.grade, 'Khởi điểm (0/100)');
  assert.ok(pendingReview.gaps.some((g) => g.id === 'gap-no-completed'));

  // When task is completed -> score increases from 0
  const completedTask: Task = {
    ...pendingTasks[0],
    progress: 100,
    status: 'completed',
    completedAt: '2026-10-22T10:00:00Z',
    subtasks: [{ id: 's1', title: 'Thu thập số liệu', completed: true }]
  };
  const completedReview = generateLocalStrategicReview([completedTask]);
  assert.ok(completedReview.score > 0, `Expected score > 0, got ${completedReview.score}`);
  assert.equal(completedReview.gaps.some((g) => g.id === 'gap-no-completed'), false);
});

test('formatBirthDateVietnamese strictly formats Day/Month/Year in Vietnamese order', () => {
  // Test standard YYYY-MM-DD input
  assert.equal(formatBirthDateVietnamese('1990-05-18'), '18/05/1990');
  assert.equal(formatBirthDateVietnamese('1990-05-18', true), 'Ngày 18 tháng 05 năm 1990');

  // Test already formatted DD/MM/YYYY
  assert.equal(formatBirthDateVietnamese('18/05/1990'), '18/05/1990');
  assert.equal(formatBirthDateVietnamese('18/05/1990', true), 'Ngày 18 tháng 05 năm 1990');

  // Test ISO string
  assert.equal(formatBirthDateVietnamese('1995-12-05T00:00:00.000Z'), '05/12/1995');
  assert.equal(formatBirthDateVietnamese('1995-12-05T00:00:00.000Z', true), 'Ngày 05 tháng 12 năm 1995');

  // Test empty string fallback
  assert.equal(formatBirthDateVietnamese(''), 'Chưa cập nhật');
});

test('isTaskThisWeek detects dates inside current Monday-to-Sunday week', () => {
  // Reference date: Wednesday, Nov 4, 2026
  const ref = new Date('2026-11-04T10:00:00Z');
  // Monday of this week is Nov 2, 2026
  // Sunday of this week is Nov 8, 2026

  assert.equal(isTaskThisWeek('2026-11-02T08:00:00Z', ref), true);
  assert.equal(isTaskThisWeek('2026-11-04T12:00:00Z', ref), true);
  assert.equal(isTaskThisWeek('2026-11-08T22:00:00Z', ref), true);

  // Previous week (Sunday Nov 1)
  assert.equal(isTaskThisWeek('2026-11-01T23:59:00Z', ref), false);
  // Next week (Monday Nov 9)
  assert.equal(isTaskThisWeek('2026-11-09T08:00:00Z', ref), false);
  // Invalid date
  assert.equal(isTaskThisWeek(undefined, ref), false);
  assert.equal(isTaskThisWeek('', ref), false);
});

test('isTaskThisMonth detects dates within the active calendar month', () => {
  const ref = new Date('2026-11-15T10:00:00Z');

  // November dates
  assert.equal(isTaskThisMonth('2026-11-01T00:00:00Z', ref), true);
  assert.equal(isTaskThisMonth('2026-11-15T14:30:00Z', ref), true);
  assert.equal(isTaskThisMonth('2026-11-30T23:59:00Z', ref), true);

  // October date
  assert.equal(isTaskThisMonth('2026-10-31T23:59:00Z', ref), false);
  // December date
  assert.equal(isTaskThisMonth('2026-12-01T00:00:00Z', ref), false);
});

test('isTaskUpcoming detects dates from today onwards', () => {
  const ref = new Date('2026-11-02T10:00:00Z');

  // Today
  assert.equal(isTaskUpcoming('2026-11-02T15:00:00Z', ref), true);
  // Tomorrow
  assert.equal(isTaskUpcoming('2026-11-03T10:00:00Z', ref), true);
  // Next week
  assert.equal(isTaskUpcoming('2026-11-10T10:00:00Z', ref), true);
  // Next month
  assert.equal(isTaskUpcoming('2026-12-05T10:00:00Z', ref), true);

  // Yesterday
  assert.equal(isTaskUpcoming('2026-11-01T23:00:00Z', ref), false);
  // Past date
  assert.equal(isTaskUpcoming('2026-10-20T10:00:00Z', ref), false);
});

test('filterTasksByTimeframe and getTimeframeCounts filter correctly', () => {
  const ref = new Date('2026-11-04T10:00:00Z'); // Wednesday
  const sampleTasks: Task[] = [
    {
      id: 't-overdue',
      title: 'Việc cũ',
      description: '',
      unit: 'Ban TN',
      priority: 'high',
      createdAt: '2026-10-01T00:00:00Z',
      dueDate: '2026-10-20T10:00:00Z',
      progress: 0,
      status: 'overdue',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 15 }
    },
    {
      id: 't-this-week',
      title: 'Việc tuần này',
      description: '',
      unit: 'Ban TN',
      priority: 'medium',
      createdAt: '2026-11-01T00:00:00Z',
      dueDate: '2026-11-06T17:00:00Z', // Friday of this week
      progress: 20,
      status: 'in_progress',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 15 }
    },
    {
      id: 't-this-month-later',
      title: 'Việc cuối tháng',
      description: '',
      unit: 'Ban TN',
      priority: 'low',
      createdAt: '2026-11-01T00:00:00Z',
      dueDate: '2026-11-25T17:00:00Z', // Later in Nov
      progress: 0,
      status: 'pending',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 15 }
    },
    {
      id: 't-next-month',
      title: 'Việc tháng sau',
      description: '',
      unit: 'Ban TN',
      priority: 'medium',
      createdAt: '2026-11-01T00:00:00Z',
      dueDate: '2026-12-15T17:00:00Z', // Dec
      progress: 0,
      status: 'pending',
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 15 }
    }
  ];

  const counts = getTimeframeCounts(sampleTasks, ref);
  assert.equal(counts.all, 4);
  assert.equal(counts.thisWeek, 1); // only t-this-week
  assert.equal(counts.thisMonth, 2); // t-this-week and t-this-month-later
  assert.equal(counts.upcoming, 3); // t-this-week, t-this-month-later, t-next-month

  const thisWeekTasks = filterTasksByTimeframe(sampleTasks, 'this_week', ref);
  assert.equal(thisWeekTasks.length, 1);
  assert.equal(thisWeekTasks[0].id, 't-this-week');

  const thisMonthTasks = filterTasksByTimeframe(sampleTasks, 'this_month', ref);
  assert.equal(thisMonthTasks.length, 2);

  const upcomingTasks = filterTasksByTimeframe(sampleTasks, 'upcoming', ref);
  assert.equal(upcomingTasks.length, 3);

  const allTasks = filterTasksByTimeframe(sampleTasks, 'all', ref);
  assert.equal(allTasks.length, 4);
});

test('getTaskTimeframeBadge returns appropriate Vietnamese badge labels and styles', () => {
  const ref = new Date('2026-11-04T10:00:00Z'); // Wednesday

  // Due today
  const todayBadge = getTaskTimeframeBadge('2026-11-04T18:00:00Z', ref);
  assert.equal(todayBadge?.label, 'Hôm nay');

  // Due tomorrow
  const tomorrowBadge = getTaskTimeframeBadge('2026-11-05T10:00:00Z', ref);
  assert.equal(tomorrowBadge?.label, 'Ngày mai');

  // Due this week (Friday)
  const thisWeekBadge = getTaskTimeframeBadge('2026-11-06T15:00:00Z', ref);
  assert.equal(thisWeekBadge?.label, 'Tuần này');

  // Due this month (later in Nov)
  const thisMonthBadge = getTaskTimeframeBadge('2026-11-20T10:00:00Z', ref);
  assert.equal(thisMonthBadge?.label, 'Tháng này');

  // Due next month (Dec)
  const upcomingBadge = getTaskTimeframeBadge('2026-12-10T10:00:00Z', ref);
  assert.equal(upcomingBadge?.label, 'Sắp tới');

  // Past due
  const overdueBadge = getTaskTimeframeBadge('2026-10-25T10:00:00Z', ref);
  assert.equal(overdueBadge?.label, 'Quá hạn');

  // Undefined
  assert.equal(getTaskTimeframeBadge(undefined, ref), null);
});

test('calculateWeeklyPerformanceTrend calculates week-by-week completion rates correctly', () => {
  const ref = new Date('2026-11-04T10:00:00Z'); // Wednesday, Week 45
  const sampleTasks = [
    {
      id: 'task-w1',
      title: 'Task Done This Week',
      description: '',
      unit: 'Ban Thanh Niên',
      dueDate: '2026-11-05T17:00:00Z',
      createdAt: '2026-11-02T08:00:00Z',
      completedAt: '2026-11-04T12:00:00Z',
      status: 'completed',
      priority: 'high',
      progress: 100,
      subtasks: []
    },
    {
      id: 'task-w2',
      title: 'Task Pending This Week',
      description: '',
      unit: 'Ban Thanh Niên',
      dueDate: '2026-11-06T17:00:00Z',
      createdAt: '2026-11-02T08:00:00Z',
      status: 'in_progress',
      priority: 'medium',
      progress: 50,
      subtasks: []
    },
    {
      id: 'task-prev-week',
      title: 'Task Done Last Week',
      description: '',
      unit: 'Chi hội 1',
      dueDate: '2026-10-29T17:00:00Z',
      createdAt: '2026-10-26T08:00:00Z',
      completedAt: '2026-10-28T10:00:00Z',
      status: 'completed',
      priority: 'high',
      progress: 100,
      subtasks: []
    }
  ];

  const trend = calculateWeeklyPerformanceTrend(sampleTasks as unknown as Task[], 4, ref);
  assert.equal(trend.length, 4);

  // The last point is current week
  const currentWeek = trend[trend.length - 1];
  assert.equal(currentWeek.isCurrentWeek, true);
  assert.equal(currentWeek.totalTasks, 2);
  assert.equal(currentWeek.completedTasks, 1);
  assert.equal(currentWeek.completionRate, 50);

  // The second to last point is previous week
  const prevWeek = trend[trend.length - 2];
  assert.equal(prevWeek.isCurrentWeek, false);
  assert.equal(prevWeek.completedTasks, 1);
  assert.equal(prevWeek.completionRate, 100);
});

test('calculate30DaysCreationVsCompletionTrend calculates 30 daily points and aggregates correctly', () => {
  const ref = new Date('2026-11-02T12:00:00Z');
  const sampleTasks = [
    {
      id: 'task-c1',
      title: 'Task Created Today',
      description: '',
      unit: 'Ban Thanh Niên',
      dueDate: '2026-11-05T17:00:00Z',
      createdAt: '2026-11-02T08:00:00Z',
      status: 'pending',
      priority: 'high',
      progress: 0,
      subtasks: []
    },
    {
      id: 'task-d1',
      title: 'Task Completed Today',
      description: '',
      unit: 'Chi hội 1',
      dueDate: '2026-11-02T10:00:00Z',
      createdAt: '2026-10-30T08:00:00Z',
      completedAt: '2026-11-02T09:30:00Z',
      status: 'completed',
      priority: 'medium',
      progress: 100,
      subtasks: []
    },
    {
      id: 'task-d2',
      title: 'Task Completed 10 days ago',
      description: '',
      unit: 'Chi hội 1',
      dueDate: '2026-10-23T10:00:00Z',
      createdAt: '2026-10-20T08:00:00Z',
      completedAt: '2026-10-23T09:30:00Z',
      status: 'completed',
      priority: 'low',
      progress: 100,
      subtasks: []
    },
    {
      id: 'task-old',
      title: 'Task 40 days ago (outside window)',
      description: '',
      unit: 'Ban Thanh Niên',
      dueDate: '2026-09-20T10:00:00Z',
      createdAt: '2026-09-15T08:00:00Z',
      completedAt: '2026-09-20T09:30:00Z',
      status: 'completed',
      priority: 'low',
      progress: 100,
      subtasks: []
    }
  ];

  // Daily mode
  const { dataPoints, summary } = calculate30DaysCreationVsCompletionTrend(sampleTasks as unknown as Task[], ref, 'daily');
  assert.equal(dataPoints.length, 30);
  assert.equal(summary.totalCompleted, 2); // task-d1 and task-d2
  assert.equal(summary.totalCreated, 3); // task-c1, task-d1, task-d2 (task-old is 40 days ago)
  assert.equal(summary.netDifference, -1);
  assert.equal(summary.workloadStatus, 'overloaded');

  // Today point (last point)
  const todayPoint = dataPoints[dataPoints.length - 1];
  assert.equal(todayPoint.createdTasks, 1);
  assert.equal(todayPoint.completedTasks, 1);
  assert.equal(todayPoint.netChange, 0);

  // Grouped 5d mode
  const grouped5d = calculate30DaysCreationVsCompletionTrend(sampleTasks as unknown as Task[], ref, 'grouped_5d');
  assert.equal(grouped5d.dataPoints.length, 6);

  // Weekly mode
  const weekly = calculate30DaysCreationVsCompletionTrend(sampleTasks as unknown as Task[], ref, 'weekly');
  assert.equal(weekly.dataPoints.length, 4);
});

test('getSafeTaskLeadDurationMs safely prevents epoch 1970 bugs and bounds realistic hours', () => {
  const oneHourMs = 3600000;
  const compTime = new Date('2026-11-03T10:00:00Z').getTime();

  // Test 1: Corrupted or missing createdAt (must not return 62,321 hours)
  const taskCorrupted = { createdAt: '1970-01-01T00:00:00Z', completedAt: '2026-11-03T10:00:00Z' };
  const dur1 = getSafeTaskLeadDurationMs(taskCorrupted, compTime);
  const hours1 = dur1 / oneHourMs;
  assert.ok(hours1 <= 720, 'Must clamp to maximum realistic hours');
  assert.ok(hours1 >= 0.5, 'Must be at least 0.5 hours');
  assert.ok(hours1 < 100, 'Should fall back to realistic 24-72 hours, never thousands');

  // Test 2: Valid normal task
  const taskNormal = { createdAt: '2026-11-02T10:00:00Z', completedAt: '2026-11-03T10:00:00Z' };
  const durNormal = getSafeTaskLeadDurationMs(taskNormal, compTime);
  assert.equal(durNormal / oneHourMs, 24);

  // Test 3: Same-time completion (minimum 0.5 hours)
  const taskInstant = { createdAt: '2026-11-03T10:00:00Z', completedAt: '2026-11-03T10:00:00Z' };
  const durInstant = getSafeTaskLeadDurationMs(taskInstant, compTime);
  assert.equal(durInstant / oneHourMs, 0.5);
});

test('calculateDailyPerformanceSummary accurately calculates today vs yesterday metrics', () => {
  const ref = new Date('2026-11-03T12:00:00Z');
  const sampleTasks: Task[] = [
    {
      id: 'today-1',
      title: 'Created and completed today on time',
      unit: 'Ban Thanh Niên',
      createdAt: '2026-11-03T08:00:00Z',
      dueDate: '2026-11-03T17:00:00Z',
      completedAt: '2026-11-03T11:00:00Z',
      status: 'completed',
      priority: 'high',
      progress: 100,
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 0 }
    },
    {
      id: 'today-2',
      title: 'Created today, pending',
      unit: 'Chi hội 1',
      createdAt: '2026-11-03T09:00:00Z',
      dueDate: '2026-11-05T17:00:00Z',
      status: 'in_progress',
      priority: 'medium',
      progress: 20,
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 0 }
    },
    {
      id: 'yest-1',
      title: 'Created yesterday',
      unit: 'Ban Thanh Niên',
      createdAt: '2026-11-02T08:00:00Z',
      dueDate: '2026-11-04T17:00:00Z',
      completedAt: '2026-11-02T16:00:00Z',
      status: 'completed',
      priority: 'low',
      progress: 100,
      subtasks: [],
      attachments: [],
      links: [],
      reminder: { enabled: false, minutesBefore: 0 }
    }
  ];

  const summary = calculateDailyPerformanceSummary(sampleTasks, ref);
  assert.equal(summary.createdToday, 2);
  assert.equal(summary.completedToday, 1);
  assert.equal(summary.createdYesterday, 1);
  assert.equal(summary.completedYesterday, 1);
  assert.equal(summary.netCreatedDiff, 1);
  assert.equal(summary.todayOnTimeRate, 100);
  assert.ok(summary.avgHoursToday > 0);
  assert.ok(summary.todayStatusMessage.length > 0);
});



