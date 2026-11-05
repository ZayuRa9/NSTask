import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Building2,
  Calendar,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  PlusCircle,
  BarChart3,
  Activity,
  Layers,
  Zap,
  Flame,
  Check,
  Edit3,
  ExternalLink,
  Target,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays,
  Plus,
  CheckSquare,
  Timer,
  StickyNote,
  Pin,
  FileSpreadsheet,
  FileText,
  Mic,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { Task, UserProfile, Note, NOTE_COLOR_PALETTES, TaskTimeframeFilter } from '../types/task';
import { ProductivityTrends } from './ProductivityTrends';
import { useActiveUsageTracker } from '../utils/activeUsageTracker';
import {
  calculateDashboardStats,
  formatDateVietnamese,
  calculateWeeklyTrend,
  calculateMonthlyTrend,
  calculateWeeklyProductivityTrend,
  calculateMonthlyProductivityTrend,
  calculateDailyProductivityTrend,
  calculateDailyPerformanceSummary,
  calculateWeeklyPerformanceTrend,
  calculate30DaysCreationVsCompletionTrend,
  ProductivityTrendPoint,
  WeeklyPerformanceDataPoint,
  Comparison30DaysPoint,
  Comparison30DaysSummary,
  getTopUrgentTasks,
  isTaskOverdue,
  getTimeframeCounts,
} from '../utils/taskCalculations';
import {
  getWeeklyDays,
  getWeekDateRangeLabel,
  getWeeklyStats,
  groupTasksByDueDateKey,
  formatDateKey,
  WeekDay
} from '../utils/calendarUtils';
import { getUnitColorStyle, getTaskCardColorStyle } from '../utils/unitTheme';

interface DashboardOverviewProps {
  tasks: Task[];
  notes?: Note[];
  userProfile: UserProfile;
  onNavigateToTasks: (
    filter?: 'all' | 'in_progress' | 'overdue' | 'completed',
    timeframe?: TaskTimeframeFilter
  ) => void;
  onOpenCreateModal: (defaultDueDate?: string) => void;
  onNavigateToAiAdvisor?: () => void;
  onNavigateToNotes?: () => void;
  onOpenCreateNote?: () => void;
  onQuickCompleteTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onOpenCalendarSync?: () => void;
  onOpenWordExcelImport?: () => void;
  onOpenReportModal?: () => void;
  onOpenQuickVoice?: () => void;
  onUpdateWeeklyGoal?: (goal: number) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  tasks,
  notes = [],
  userProfile,
  onNavigateToTasks,
  onOpenCreateModal,
  onNavigateToAiAdvisor,
  onNavigateToNotes,
  onOpenCreateNote,
  onQuickCompleteTask,
  onEditTask,
  onOpenCalendarSync,
  onOpenWordExcelImport,
  onOpenReportModal,
  onOpenQuickVoice,
  onUpdateWeeklyGoal,
}) => {
  const stats = calculateDashboardStats(tasks);
  const { sessionFormatted, todayFormatted, totalFormatted } = useActiveUsageTracker(
    userProfile.displayName || 'default_user'
  );
  const [trendPeriod, setTrendPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [productivityPeriod, setProductivityPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [productivityMetricUnit, setProductivityMetricUnit] = useState<'hours' | 'days'>('hours');
  const [productivityChartType, setProductivityChartType] = useState<'productivity' | 'flow' | 'line'>('productivity');
  const [performanceWeekCount, setPerformanceWeekCount] = useState<4 | 6 | 8 | 12>(6);
  const [performanceMetricFocus, setPerformanceMetricFocus] = useState<'all' | 'rate' | 'count'>('all');
  const weeklyPerformanceData = useMemo(
    () => calculateWeeklyPerformanceTrend(tasks, performanceWeekCount),
    [tasks, performanceWeekCount]
  );
  const performanceSummary = useMemo(() => {
    const totalDone = weeklyPerformanceData.reduce((s, p) => s + p.completedTasks, 0);
    const totalTasks = weeklyPerformanceData.reduce((s, p) => s + p.totalTasks, 0);
    const totalOnTime = weeklyPerformanceData.reduce((s, p) => s + p.onTimeTasks, 0);
    const totalOverdue = weeklyPerformanceData.reduce((s, p) => s + p.overdueTasks, 0);
    const avgRate = Math.round(
      weeklyPerformanceData.reduce((s, p) => s + p.completionRate, 0) / (weeklyPerformanceData.length || 1)
    );
    const overallOnTimeRate = totalDone > 0 ? Math.round((totalOnTime / totalDone) * 100) : 100;
    const sorted = [...weeklyPerformanceData].sort(
      (a, b) => b.completionRate - a.completionRate || b.completedTasks - a.completedTasks
    );
    const bestWeek = sorted[0];

    return {
      totalDone,
      totalTasks,
      totalOnTime,
      totalOverdue,
      avgRate,
      overallOnTimeRate,
      bestWeekLabel: bestWeek ? `${bestWeek.weekLabel} (${bestWeek.completionRate}%)` : 'Đang cập nhật',
    };
  }, [weeklyPerformanceData]);

  // 30-Day Comparison: Completed Tasks vs Newly Created Tasks
  const [comparison30dMode, setComparison30dMode] = useState<'daily' | 'grouped_5d' | 'weekly'>('daily');
  const { dataPoints: comparison30dData, summary: comparison30dSummary } = useMemo(
    () => calculate30DaysCreationVsCompletionTrend(tasks, new Date(), comparison30dMode),
    [tasks, comparison30dMode]
  );

  // Chế độ xem: 'metrics' (Tổng quan số liệu & biểu đồ) hoặc 'weekly_calendar' (Lịch tuần 7 ngày)
  const [dashboardViewMode, setDashboardViewMode] = useState<'metrics' | 'weekly_calendar'>('metrics');

  // Điều hướng lịch tuần (Thứ 2 - Chủ Nhật)
  const [weekRefDate, setWeekRefDate] = useState<Date>(() => new Date());

  // Bộ lọc bên trong chế độ Lịch tuần
  const [weeklyUnitFilter, setWeeklyUnitFilter] = useState<string>('all');
  const [weeklyPriorityFilter, setWeeklyPriorityFilter] = useState<string>('all');
  const [weeklyStatusFilter, setWeeklyStatusFilter] = useState<string>('all');

  // Tính toán 7 ngày trong tuần được chọn
  const weeklyDays = useMemo(() => getWeeklyDays(weekRefDate), [weekRefDate]);
  const weeklyRangeLabel = useMemo(() => getWeekDateRangeLabel(weeklyDays), [weeklyDays]);
  const weeklyStats = useMemo(() => getWeeklyStats(tasks, weeklyDays), [tasks, weeklyDays]);

  // Active tasks & Timeframe counts (Tuần này, Tháng này, Sắp tới)
  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== 'completed'), [tasks]);
  const timeframeCounts = useMemo(() => getTimeframeCounts(activeTasks), [activeTasks]);

  // Nhóm tasks theo ngày hạn chót YYYY-MM-DD
  const tasksByDueDate = useMemo(() => groupTasksByDueDateKey(tasks), [tasks]);

  // Kiểm tra xem tuần đang xem có phải tuần này không
  const isCurrentWeek = useMemo(() => {
    const nowDays = getWeeklyDays(new Date());
    return nowDays[0]?.dateKey === weeklyDays[0]?.dateKey;
  }, [weeklyDays]);

  // Chuyển tuần
  const handlePrevWeek = () => {
    setWeekRefDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setWeekRefDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleCurrentWeek = () => {
    setWeekRefDate(new Date());
  };

  // Filter overdue tasks
  const overdueTasks = tasks.filter((t) => t.status === 'overdue');

  // Top 3 most urgent pending tasks for Priority Spotlight
  const urgentTasks = getTopUrgentTasks(tasks, 3);

  // Recharts trend data
  const weeklyData = calculateWeeklyTrend(tasks);
  const monthlyData = calculateMonthlyTrend(tasks);
  const trendData = productivityPeriod === 'weekly' ? weeklyData : monthlyData;

  // Recharts productivity trend data (Số lượng hoàn thành & Thời gian thực hiện)
  const dailyProdData = useMemo(() => calculateDailyProductivityTrend(tasks), [tasks]);
  const weeklyProdData = useMemo(() => calculateWeeklyProductivityTrend(tasks), [tasks]);
  const monthlyProdData = useMemo(() => calculateMonthlyProductivityTrend(tasks), [tasks]);
  const currentProdData = productivityPeriod === 'daily' ? dailyProdData : (productivityPeriod === 'weekly' ? weeklyProdData : monthlyProdData);

  const dailySummary = useMemo(() => calculateDailyPerformanceSummary(tasks), [tasks]);

  const prodSummary = useMemo(() => {
    const totalDone = currentProdData.reduce((s, p) => s + p.completedTasks, 0);
    const rawTotalHours = currentProdData.reduce((s, p) => s + p.totalExecutionHours, 0);
    const totalHours = Number(rawTotalHours.toFixed(1));
    const totalOnTime = currentProdData.reduce((s, p) => s + p.onTimeCount, 0);
    const totalCreated = currentProdData.reduce((s, p) => s + p.createdTasks, 0);
    const avgHours = totalDone > 0 ? Number((totalHours / totalDone).toFixed(1)) : 0;
    const avgDays = Number((avgHours / 24).toFixed(1));
    const onTimeRate = totalDone > 0 ? Math.round((totalOnTime / totalDone) * 100) : 100;

    return {
      totalDone,
      totalHours,
      avgHours,
      avgDays,
      totalOnTime,
      totalCreated,
      onTimeRate,
    };
  }, [currentProdData]);

  // Recharts unit comparison data
  const unitChartData = Object.entries(stats.unitDistribution).map(([unitName, uStats]) => ({
    name: unitName.length > 15 ? unitName.slice(0, 15) + '...' : unitName,
    fullName: unitName,
    'Hoàn thành': uStats.completed,
    'Đang làm': uStats.total - uStats.completed - uStats.overdue,
    'Trễ hạn': uStats.overdue,
    total: uStats.total,
  }));

  // SVG Donut calculation
  const total = stats.total || 1;
  const c = 251.32;
  const compDash = (stats.completed / total) * c;
  const inProgDash = (stats.inProgress / total) * c;
  const overdueDash = (stats.overdue / total) * c;
  const pendDash = (stats.pending / total) * c;

  return (
    <div className="space-y-6">
      {/* HÀNG 1: XIN CHÀO, THÔNG TIN TÀI KHOẢN, NGÀY THÁNG, TIẾN ĐỘ & THANH TRẠNG THÁI (HÀNG NGANG PHÍA TRÊN) */}
      <div className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-indigo-950/15 border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 via-indigo-400/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          {/* Trái: Avatar + Xin chào + Đơn vị/Vai trò + Ngày tháng */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <img
                src={userProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                alt={userProfile.displayName}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-white/30 shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-indigo-900 rounded-full" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                  Xin chào, {userProfile.displayName}!
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping inline-block" />
                  Trực tuyến
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-100 font-medium">
                <span className="font-semibold text-white">{userProfile.role || 'Cán bộ phụ trách'}</span>
                <span>•</span>
                <span className="text-indigo-200 truncate max-w-sm">
                  {userProfile.units && userProfile.units.length > 0
                    ? userProfile.units.join(', ')
                    : 'Ban chuyên môn'}
                </span>
                <span>•</span>
                <span className="text-indigo-200/90">
                  {new Date().toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Phải: Tiến độ hoàn thành tổng thể & Thanh trạng thái */}
          <div className="xl:w-96 shrink-0 bg-white/10 p-3.5 sm:p-4 rounded-2xl border border-white/15 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-indigo-100 font-semibold flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-200" />
                Tiến độ công việc:
              </span>
              <span className="font-black text-emerald-300 text-sm">
                {stats.completed}/{stats.total} ({stats.completionRate}%)
              </span>
            </div>
            <div className="w-full bg-black/25 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-indigo-100/90 pt-0.5">
              <span>Đang làm: {stats.inProgress} việc</span>
              <span className={stats.overdue > 0 ? 'text-rose-300 font-bold' : ''}>Trễ hạn: {stats.overdue} việc</span>
              <span>Chờ làm: {stats.pending} việc</span>
            </div>
          </div>
        </div>
      </div>

      {/* HÀNG 2: CÁC NHÓM CÔNG CỤ NHANH PHÂN BỔ ĐỒNG NHẤT VỚI MÀU SẮC ĐẶC TRƯNG */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
        {/* 1. Google Lịch */}
        <button
          type="button"
          onClick={onOpenCalendarSync}
          className="flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border-2 border-blue-200/90 bg-gradient-to-br from-blue-50/90 via-white to-sky-50/70 hover:border-blue-400 hover:shadow-md text-left transition-all duration-200 group cursor-pointer active:scale-98 shadow-xs"
          title="Đồng bộ hai chiều với Google Calendar"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-3">
            <div className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-blue-700 transition-colors">
              Google Lịch
            </div>
            <p className="text-[11px] text-blue-700/80 font-medium line-clamp-1 mt-0.5">
              Đồng bộ hai chiều
            </p>
          </div>
        </button>

        {/* 2. Nhập Word/Excel */}
        <button
          type="button"
          onClick={onOpenWordExcelImport}
          className="flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 hover:border-emerald-400 hover:shadow-md text-left transition-all duration-200 group cursor-pointer active:scale-98 shadow-xs"
          title="Nhập hàng loạt công việc từ file Word/Excel"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-4.5 h-4.5" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-3">
            <div className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
              Nhập Word/Excel
            </div>
            <p className="text-[11px] text-emerald-700/80 font-medium line-clamp-1 mt-0.5">
              Trích xuất hàng loạt
            </p>
          </div>
        </button>

        {/* 3. Báo cáo Word */}
        <button
          type="button"
          onClick={onOpenReportModal}
          className="flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border-2 border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/70 hover:border-indigo-400 hover:shadow-md text-left transition-all duration-200 group cursor-pointer active:scale-98 shadow-xs"
          title="Xuất báo cáo văn bản Word (.docx)"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-3">
            <div className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-700 transition-colors">
              Báo cáo Word
            </div>
            <p className="text-[11px] text-indigo-700/80 font-medium line-clamp-1 mt-0.5">
              Xuất file văn bản
            </p>
          </div>
        </button>

        {/* 4. Ghi chú */}
        <button
          type="button"
          onClick={() => onNavigateToNotes && onNavigateToNotes()}
          className="flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border-2 border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-yellow-50/70 hover:border-amber-400 hover:shadow-md text-left transition-all duration-200 group cursor-pointer active:scale-98 shadow-xs"
          title="Sổ tay ghi chú & checklist việc phát sinh"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <StickyNote className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] font-black text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-md">
              {notes.filter((n) => !n.isArchived && !n.isDeleted).length}
            </span>
          </div>
          <div className="mt-3">
            <div className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-amber-700 transition-colors">
              Ghi chú
            </div>
            <p className="text-[11px] text-amber-800/80 font-medium line-clamp-1 mt-0.5">
              Sổ tay &amp; checklist
            </p>
          </div>
        </button>

        {/* 5. Nhập Giọng Nói */}
        {onOpenQuickVoice && (
          <button
            type="button"
            onClick={onOpenQuickVoice}
            className="flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border-2 border-rose-200/90 bg-gradient-to-br from-rose-50/90 via-white to-pink-50/70 hover:border-rose-400 hover:shadow-md text-left transition-all duration-200 group cursor-pointer active:scale-98 shadow-xs"
            title="Nói vào micro để tạo việc hoặc ghi chú tức thì qua Web Speech API"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Mic className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded-md">
                Voice
              </span>
            </div>
            <div className="mt-3">
              <div className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-rose-700 transition-colors">
                Nhập Giọng Nói
              </div>
              <p className="text-[11px] text-rose-700/80 font-medium line-clamp-1 mt-0.5">
                Nói để tạo việc &amp; ghi chú
              </p>
            </div>
          </button>
        )}

        {/* 6. Tạo việc mới */}
        <button
          type="button"
          onClick={() => onOpenCreateModal()}
          className="flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border-2 border-indigo-600 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white text-left transition-all duration-200 group cursor-pointer shadow-md shadow-indigo-600/25 hover:shadow-lg active:scale-98"
          title="Tạo nhiệm vụ công tác mới"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <PlusCircle className="w-4.5 h-4.5" />
            </div>
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <div className="mt-3">
            <div className="font-black text-xs sm:text-sm text-white">
              Tạo việc mới
            </div>
            <p className="text-[11px] text-indigo-100 line-clamp-1 mt-0.5">
              Thêm việc &amp; mốc con
            </p>
          </div>
        </button>
      </div>

      {/* VIEW MODE SWITCHER: TỔNG QUAN & BIỂU ĐỒ vs LỊCH TUẦN (LƯỚI 7 NGÀY) */}
      <div className="bg-white/95 backdrop-blur-xs p-3 rounded-2xl border-2 border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setDashboardViewMode('metrics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              dashboardViewMode === 'metrics'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className={`w-4 h-4 ${dashboardViewMode === 'metrics' ? 'text-white' : 'text-indigo-600'}`} />
            <span>Tổng quan & Biểu đồ</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                dashboardViewMode === 'metrics'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-50 text-indigo-700'
              }`}
            >
              {stats.total} việc
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDashboardViewMode('weekly_calendar')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              dashboardViewMode === 'weekly_calendar'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className={`w-4 h-4 ${dashboardViewMode === 'weekly_calendar' ? 'text-white' : 'text-indigo-600'}`} />
            <span>Lịch tuần (7 ngày)</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                dashboardViewMode === 'weekly_calendar'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              {weeklyStats.total} việc
            </span>
          </button>
        </div>

        {/* Quick status indicator */}
        <div className="flex items-center justify-between sm:justify-end gap-3 px-2 text-xs text-slate-500">
          {dashboardViewMode === 'metrics' ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                Tuần này: <strong>{weeklyStats.total} việc có hạn</strong> ({weeklyStats.completed} xong, {weeklyStats.overdue} trễ)
              </span>
              <button
                type="button"
                onClick={() => setDashboardViewMode('weekly_calendar')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer hover:underline"
              >
                Mở lịch tuần →
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                {isCurrentWeek ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    Tuần hiện tại
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium text-[11px]">
                    Tuần đang chọn
                  </span>
                )}
                <span>{weeklyRangeLabel}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CONDITIONAL RENDERING BASED ON VIEW MODE */}
      {dashboardViewMode === 'weekly_calendar' ? (
        /* =========================================================================
         * CHẾ ĐỘ XEM: LỊCH TUẦN 7 NGÀY (THỨ 2 ĐẾN CHỦ NHẬT / T2 - CN)
         * ========================================================================= */
        <div className="space-y-6">
          {/* Header Card & Navigation */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Lịch Nhiệm Vụ Tuần (7 Ngày)
                    </h2>
                    {isCurrentWeek && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-300 text-[11px] font-black uppercase tracking-wider">
                        Tuần này
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quản lý các nhiệm vụ dựa trên thời hạn (due date) từ Thứ Hai đến Chủ Nhật, hỗ trợ xử lý ngay hoặc thêm việc cho từng ngày
                  </p>
                </div>
              </div>

              {/* Navigation Controls: Prev, Range, Today, Next, Add */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={handlePrevWeek}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer flex items-center gap-1 active:scale-95"
                  title="Xem tuần trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Tuần trước</span>
                </button>

                <div className="px-3.5 py-2 rounded-xl bg-indigo-50/70 border border-indigo-200/80 text-indigo-900 text-xs sm:text-sm font-extrabold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{weeklyRangeLabel}</span>
                </div>

                <button
                  type="button"
                  onClick={handleCurrentWeek}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer active:scale-95 ${
                    isCurrentWeek
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                  title="Nhảy về tuần hiện tại"
                >
                  Hôm nay
                </button>

                <button
                  type="button"
                  onClick={handleNextWeek}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer flex items-center gap-1 active:scale-95"
                  title="Xem tuần sau"
                >
                  <span className="hidden sm:inline">Tuần sau</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenCreateModal(weeklyDays[0]?.dateKey)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm việc tuần</span>
                </button>
              </div>
            </div>

            {/* Weekly Metric Snapshot */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>HẠN VIỆC TRONG TUẦN</span>
                  <Calendar className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900">{weeklyStats.total}</span>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                    7 ngày
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Tổng hạn chót theo lịch</p>
              </div>

              <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
                  <span>ĐÃ HOÀN THÀNH</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-emerald-700">{weeklyStats.completed}</span>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    {weeklyStats.total > 0 ? Math.round((weeklyStats.completed / weeklyStats.total) * 100) : 100}%
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700/80 mt-1">Đã nghiệm thu lưu trữ</p>
              </div>

              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                <div className="flex items-center justify-between text-xs text-blue-800 font-semibold">
                  <span>ĐANG TIẾN HÀNH</span>
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-blue-700">{weeklyStats.pending}</span>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                    {weeklyStats.highPriority} việc gấp
                  </span>
                </div>
                <p className="text-[11px] text-blue-700/80 mt-1">Cần hoàn thành đúng hạn</p>
              </div>

              <div
                className={`rounded-2xl p-4 border ${
                  weeklyStats.overdue > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className={weeklyStats.overdue > 0 ? 'text-rose-800' : 'text-slate-500'}>
                    TRỄ HẠN TRONG TUẦN
                  </span>
                  <AlertCircle
                    className={`w-4 h-4 ${
                      weeklyStats.overdue > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'
                    }`}
                  />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span
                    className={`text-2xl font-black ${weeklyStats.overdue > 0 ? 'text-rose-600' : 'text-slate-900'}`}
                  >
                    {weeklyStats.overdue}
                  </span>
                  {weeklyStats.overdue > 0 && (
                    <span className="text-[11px] font-black text-rose-900 bg-rose-200 px-2 py-0.5 rounded-md uppercase">
                      Cần xử lý
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {weeklyStats.overdue > 0 ? 'Quá mốc thời gian cam kết' : 'Không có việc trễ'}
                </p>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Lọc nhanh:
                </span>

                {/* Filter Unit */}
                <select
                  value={weeklyUnitFilter}
                  onChange={(e) => setWeeklyUnitFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold focus:outline-indigo-500 cursor-pointer"
                >
                  <option value="all">Tất cả đơn vị ({Object.keys(stats.unitDistribution).length})</option>
                  {Object.keys(stats.unitDistribution).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>

                {/* Filter Priority */}
                <select
                  value={weeklyPriorityFilter}
                  onChange={(e) => setWeeklyPriorityFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold focus:outline-indigo-500 cursor-pointer"
                >
                  <option value="all">Mọi mức độ ưu tiên</option>
                  <option value="high">Việc khẩn cấp (Gấp)</option>
                  <option value="medium">Mức bình thường</option>
                  <option value="low">Mức thấp</option>
                </select>

                {/* Filter Status */}
                <select
                  value={weeklyStatusFilter}
                  onChange={(e) => setWeeklyStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold focus:outline-indigo-500 cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Đang làm / Chưa xong</option>
                  <option value="completed">Đã hoàn thành</option>
                  <option value="overdue">Đang trễ hạn</option>
                </select>
              </div>

              {(weeklyUnitFilter !== 'all' || weeklyPriorityFilter !== 'all' || weeklyStatusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setWeeklyUnitFilter('all');
                    setWeeklyPriorityFilter('all');
                    setWeeklyStatusFilter('all');
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              )}
            </div>
          </div>

          {/* 7-DAY RESPONSIVE GRID (Thứ 2 đến Chủ Nhật) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-3.5 items-start">
            {weeklyDays.map((day) => {
              const dayAllTasks = tasksByDueDate[day.dateKey] || [];
              const dayTasks = dayAllTasks.filter((t) => {
                if (weeklyUnitFilter !== 'all' && t.unit !== weeklyUnitFilter) return false;
                if (weeklyPriorityFilter !== 'all' && t.priority !== weeklyPriorityFilter) return false;
                if (weeklyStatusFilter === 'completed' && t.status !== 'completed' && t.progress < 100) return false;
                if (weeklyStatusFilter === 'pending' && (t.status === 'completed' || t.progress === 100)) return false;
                if (weeklyStatusFilter === 'overdue' && t.status !== 'overdue') return false;
                return true;
              });

              return (
                <div
                  key={day.dateKey}
                  className={`rounded-2xl flex flex-col transition-all duration-200 overflow-hidden shadow-2xs ${
                    day.isToday
                      ? 'bg-indigo-50/60 border-2 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                      : day.isWeekend
                      ? 'bg-purple-50/30 border-2 border-purple-200/90'
                      : 'bg-white border-2 border-slate-200/90 shadow-2xs'
                  }`}
                >
                  {/* Day Header with vibrant, differentiated palette */}
                  <div
                    className={`p-3.5 border-b flex items-center justify-between ${
                      day.isToday
                        ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white border-indigo-700 shadow-xs'
                        : day.isWeekend
                        ? 'bg-gradient-to-r from-purple-100 via-violet-100 to-indigo-50 text-purple-950 border-purple-200'
                        : 'bg-gradient-to-r from-sky-100 via-blue-50 to-indigo-50 text-sky-950 border-sky-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm tracking-tight">{day.dayNameShort}</span>
                        <span className={`text-[11px] font-bold ${day.isToday ? 'text-indigo-100' : day.isWeekend ? 'text-purple-700' : 'text-sky-800'}`}>
                          ({day.dayNameFull})
                        </span>
                      </div>
                      <div className="text-xs font-bold mt-0.5 opacity-90">
                        {day.dayNumber} Thg {day.date.getMonth() + 1}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {day.isToday && (
                        <span className="px-2 py-0.5 rounded-full bg-white text-indigo-900 text-[10px] font-black uppercase tracking-wider shadow-xs animate-pulse">
                          Hôm nay
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs ${
                          day.isToday
                            ? 'bg-white/25 text-white'
                            : dayTasks.length > 0
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {dayTasks.length} việc
                      </span>
                    </div>
                  </div>

                  {/* Day Tasks Container */}
                  <div className="p-2.5 space-y-2.5 flex-1 min-h-[160px] flex flex-col justify-between">
                    {dayTasks.length > 0 ? (
                      <div className="space-y-2.5">
                        {dayTasks.map((task) => {
                          const isOverdue = isTaskOverdue(task.dueDate, task.completedAt);
                          const isDone = task.status === 'completed' || task.progress === 100;
                          const subDone = task.subtasks.filter((s) => s.completed).length;
                          const unitStyle = getUnitColorStyle(task.unit);
                          const cardColorStyle = getTaskCardColorStyle(task.priority, isOverdue);

                          return (
                            <div
                              key={task.id}
                              className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between gap-2 shadow-2xs hover:shadow-md group ${cardColorStyle.cardClass}`}
                            >
                              <div>
                                {/* Badges Row with Department Color */}
                                <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold truncate max-w-[100px] shadow-2xs ${unitStyle.badgeClass}`}>
                                    {task.unit}
                                  </span>

                                  {isDone ? (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-2xs">
                                      <CheckCircle2 className="w-3 h-3 text-white" /> Xong
                                    </span>
                                  ) : isOverdue ? (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse shadow-2xs">
                                      <AlertCircle className="w-3 h-3" /> Trễ
                                    </span>
                                  ) : task.priority === 'high' ? (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                      <Flame className="w-3 h-3" /> Gấp
                                    </span>
                                  ) : task.priority === 'medium' ? (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                      Vừa
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-2xs">
                                      Thường
                                    </span>
                                  )}
                                </div>

                                {/* Task Title */}
                                <h3
                                  onClick={() => onEditTask(task)}
                                  className={`font-extrabold text-slate-900 leading-snug line-clamp-2 hover:text-indigo-700 cursor-pointer ${
                                    isDone ? 'line-through text-slate-500' : ''
                                  }`}
                                  title={task.title}
                                >
                                  {task.title}
                                </h3>

                                {/* Due Time */}
                                <div className="flex items-center gap-1 text-[10px] text-slate-600 font-semibold mt-1.5">
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{formatDateVietnamese(task.dueDate)}</span>
                                </div>
                              </div>

                              {/* Progress and Quick Actions */}
                              <div className="pt-2 border-t border-slate-200/70 space-y-2">
                                <div className="flex items-center justify-between text-[10px] text-slate-600 font-semibold">
                                  <span>
                                    Tiến độ ({subDone}/{task.subtasks.length}):
                                  </span>
                                  <span className="font-black text-slate-900">{task.progress}%</span>
                                </div>
                                <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden p-0.5 border border-slate-300/50">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      isDone
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                        : isOverdue
                                        ? 'bg-gradient-to-r from-rose-500 to-red-600'
                                        : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500'
                                    }`}
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-1.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => onEditTask(task)}
                                    className="p-1 rounded-md text-slate-500 hover:text-indigo-700 hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                                    title="Chỉnh sửa nhiệm vụ"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  {!isDone && (
                                    <button
                                      type="button"
                                      onClick={() => onQuickCompleteTask(task)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] shadow-xs cursor-pointer transition-all active:scale-95"
                                      title="Đánh dấu hoàn thành"
                                    >
                                      <Check className="w-3 h-3 stroke-[3]" />
                                      <span>Xong</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-6 px-2 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center space-y-1.5">
                        <Calendar className="w-5 h-5 text-slate-300" />
                        <span className="text-[11px] text-slate-500">Chưa có việc</span>
                      </div>
                    )}

                    {/* Quick Add Task For This Specific Day */}
                    <button
                      type="button"
                      onClick={() => onOpenCreateModal(day.dateKey)}
                      className="w-full py-1.5 px-2 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-500 hover:text-indigo-700 text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 mt-1"
                      title={`Thêm nhiệm vụ hạn ngày ${day.dayNumber}/${day.date.getMonth() + 1}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm việc ngày này</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* =========================================================================
         * CHẾ ĐỘ XEM: TỔNG QUAN SỐ LIỆU & BIỂU ĐỒ (METRICS & TRENDS)
         * ========================================================================= */
        <div className="space-y-6">
          {/* Quick Weekly Calendar Spotlight Teaser */}
          <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-purple-50/80 border-2 border-indigo-200/90 border-l-4 border-l-indigo-600 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Lịch Tuần 7 Ngày ({weeklyRangeLabel})
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                    T2 - CN
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tuần này có <strong className="text-indigo-900">{weeklyStats.total} nhiệm vụ có hạn</strong> ({weeklyStats.completed} đã xong, {weeklyStats.pending} đang làm{weeklyStats.overdue > 0 ? `, ${weeklyStats.overdue} trễ hạn` : ''}).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDashboardViewMode('weekly_calendar')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
            >
              <span>Xem Lịch Tuần</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* KHỐI LƯỢNG CÔNG VIỆC THEO THỜI HẠN (LỌC NHANH: TUẦN NÀY, THÁNG NÀY, SẮP TỚI) */}
          <div className="bg-white/95 rounded-3xl p-5 sm:p-6 border-2 border-sky-200/90 border-t-4 border-t-sky-500 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Khối Lượng Công Việc Hiện Tại Theo Thời Hạn
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lọc nhanh danh sách nhiệm vụ theo mốc thời gian để quản lý tải công việc hiệu quả
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTasks('all', 'all')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>Xem toàn bộ danh sách ({activeTasks.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Card 1: Tuần này */}
              <button
                type="button"
                onClick={() => onNavigateToTasks('all', 'this_week')}
                className="p-4 rounded-2xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 via-sky-50/60 to-white hover:border-sky-500 hover:shadow-md transition-all text-left flex flex-col justify-between gap-3 group cursor-pointer active:scale-98 shadow-xs"
                title="Lọc nhanh các nhiệm vụ có hạn trong tuần này"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-600 text-white text-xs font-black shadow-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>TUẦN NÀY</span>
                  </span>
                  <span className="text-[11px] font-bold text-sky-700 bg-sky-100/90 px-2 py-0.5 rounded-md flex items-center gap-1 group-hover:bg-sky-200 transition-colors">
                    <span>Lọc ngay</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-sky-700 transition-colors">
                    {timeframeCounts.thisWeek} <span className="text-xs font-bold text-slate-500">nhiệm vụ</span>
                  </div>
                  <p className="text-[11px] text-sky-800/80 font-medium mt-1">
                    Hạn chót Thứ Hai đến Chủ Nhật tuần này
                  </p>
                </div>
              </button>

              {/* Card 2: Tháng này */}
              <button
                type="button"
                onClick={() => onNavigateToTasks('all', 'this_month')}
                className="p-4 rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-indigo-50/60 to-white hover:border-indigo-500 hover:shadow-md transition-all text-left flex flex-col justify-between gap-3 group cursor-pointer active:scale-98 shadow-xs"
                title="Lọc nhanh các nhiệm vụ có hạn trong tháng này"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-black shadow-xs">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>THÁNG NÀY</span>
                  </span>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/90 px-2 py-0.5 rounded-md flex items-center gap-1 group-hover:bg-indigo-200 transition-colors">
                    <span>Lọc ngay</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                    {timeframeCounts.thisMonth} <span className="text-xs font-bold text-slate-500">nhiệm vụ</span>
                  </div>
                  <p className="text-[11px] text-indigo-800/80 font-medium mt-1">
                    Hạn chót trong tháng hiện tại
                  </p>
                </div>
              </button>

              {/* Card 3: Sắp tới */}
              <button
                type="button"
                onClick={() => onNavigateToTasks('all', 'upcoming')}
                className="p-4 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-amber-50/60 to-white hover:border-amber-500 hover:shadow-md transition-all text-left flex flex-col justify-between gap-3 group cursor-pointer active:scale-98 shadow-xs"
                title="Lọc nhanh các nhiệm vụ sắp tới từ hôm nay trở đi"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 text-white text-xs font-black shadow-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>SẮP TỚI</span>
                  </span>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md flex items-center gap-1 group-hover:bg-amber-200 transition-colors">
                    <span>Lọc ngay</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-amber-800 transition-colors">
                    {timeframeCounts.upcoming} <span className="text-xs font-bold text-slate-500">nhiệm vụ</span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 font-medium mt-1">
                    Hạn chót từ hôm nay trở đi
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Metric Cards Row: 4 Cards with Distinct Color Themes & Top Accent Borders */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* 1. Đã hoàn thành (Emerald) */}
            <div
              onClick={() => onNavigateToTasks('completed')}
              className="bg-gradient-to-b from-white via-white to-emerald-50/60 p-5 rounded-2xl border-2 border-emerald-200 border-t-4 border-t-emerald-500 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-800 tracking-wide">ĐÃ HOÀN THÀNH</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl font-black text-slate-900">{stats.completed}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {stats.completionRate}%
                </span>
              </div>
              <p className="mt-2 text-[11px] text-emerald-700/80 font-medium">Đã lưu trữ vào hệ thống</p>
            </div>

            {/* 2. Đang thực hiện (Blue) */}
            <div
              onClick={() => onNavigateToTasks('in_progress')}
              className="bg-gradient-to-b from-white via-white to-blue-50/60 p-5 rounded-2xl border-2 border-blue-200 border-t-4 border-t-blue-500 shadow-xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-800 tracking-wide">ĐANG THỰC HIỆN</span>
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl font-black text-slate-900">{stats.inProgress}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                  {Math.round((stats.inProgress / (stats.total || 1)) * 100)}%
                </span>
              </div>
              <p className="mt-2 text-[11px] text-blue-700/80 font-medium">Đang triển khai các việc con</p>
            </div>

            {/* 3. Trễ việc / Quá hạn (Rose) */}
            <div
              onClick={() => onNavigateToTasks('overdue')}
              className={`p-5 rounded-2xl border-2 border-t-4 transition-all cursor-pointer group ${
                stats.overdue > 0
                  ? 'bg-gradient-to-b from-rose-50 via-white to-rose-100/50 border-rose-300 border-t-rose-600 shadow-md shadow-rose-500/10 hover:border-rose-400'
                  : 'bg-gradient-to-b from-white to-slate-50/60 border-slate-200 border-t-slate-400 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black tracking-wide ${stats.overdue > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                  TRỄ VIỆC (QUÁ HẠN)
                </span>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform ${
                    stats.overdue > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className={`text-3xl font-black ${stats.overdue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {stats.overdue}
                </span>
                {stats.overdue > 0 && (
                  <span className="text-xs font-black px-2 py-0.5 rounded-md bg-rose-200 text-rose-900 animate-bounce">
                    Khẩn cấp
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px] text-rose-700/90 font-bold">
                {stats.overdue > 0 ? 'Cần xử lý dứt điểm ngay' : 'Không có việc quá hạn'}
              </p>
            </div>

            {/* 4. Tổng số nhiệm vụ (Purple/Indigo) */}
            <div
              onClick={() => onNavigateToTasks('all')}
              className="bg-gradient-to-b from-white via-white to-purple-50/60 p-5 rounded-2xl border-2 border-purple-200 border-t-4 border-t-purple-600 shadow-xs hover:shadow-md hover:border-purple-400 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-900 tracking-wide">TỔNG NHIỆM VỤ</span>
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl font-black text-slate-900">{stats.total}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                  {stats.highPriorityCount} việc gấp
                </span>
              </div>
              <p className="mt-2 text-[11px] text-purple-700/80 font-medium">Trên toàn bộ các đơn vị</p>
            </div>
          </div>

          {/* BÁO CÁO HIỆU SUẤT: THỜI GIAN THỰC HIỆN & TỔNG THỜI GIAN (CHỈ TÍNH KHI MỞ WEB/PHẦN MỀM) */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white border border-indigo-900/60 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-indigo-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center shrink-0">
                  <Timer className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                      Báo Cáo Hiệu Suất: Thời Gian Thực Hiện &amp; Tổng Thời Gian
                    </h2>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                      Đang ghi nhận
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 self-start sm:self-auto flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Phân tích thực tế toàn phần mềm</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              {/* 1. Thời gian thực hiện (Phiên hiện tại) */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-indigo-900/50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-indigo-200/80 font-bold">
                  <span>THỜI GIAN THỰC HIỆN (PHIÊN NÀY)</span>
                  <Clock className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="my-2.5 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white tracking-tight">
                    {sessionFormatted.value}
                  </span>
                  <span className="text-sm font-bold text-indigo-300 uppercase">
                    {sessionFormatted.unit}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-200/60">
                  Tính từ khi mở web/phần mềm lên phiên này
                </p>
              </div>

              {/* 2. Thời gian thực hiện hôm nay */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-indigo-900/50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
                  <span>THỜI GIAN THỰC HIỆN (HÔM NAY)</span>
                  <Calendar className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="my-2.5 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-300 tracking-tight">
                    {todayFormatted.value}
                  </span>
                  <span className="text-sm font-bold text-emerald-400 uppercase">
                    {todayFormatted.unit}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-200/60">
                  Tích lũy các phiên mở phần mềm trong ngày
                </p>
              </div>

              {/* 3. Tổng thời gian sử dụng tích lũy */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-indigo-900/50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
                  <span>TỔNG THỜI GIAN SỬ DỤNG</span>
                  <Timer className="w-4 h-4 text-amber-400" />
                </div>
                <div className="my-2.5 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-300 tracking-tight">
                    {totalFormatted.value}
                  </span>
                  <span className="text-sm font-bold text-amber-400 uppercase">
                    {totalFormatted.unit}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-200/60">
                  Tổng thời gian mở web tích lũy toàn tài khoản
                </p>
              </div>
            </div>
          </div>

          {/* PRODUCTIVITY TRENDS: GOALS VS ACTUAL TASK COMPLETION */}
          <ProductivityTrends
            tasks={tasks}
            userProfile={userProfile}
            onUpdateWeeklyGoal={onUpdateWeeklyGoal}
          />

          {/* RECHARTS: BIỂU ĐỒ ĐƯỜNG HIỆU SUẤT HOÀN THÀNH CÔNG VIỆC THEO TỪNG TUẦN */}
          <div className="bg-white/95 p-6 sm:p-7 rounded-3xl border-2 border-emerald-200/90 border-t-4 border-t-emerald-500 shadow-xs space-y-6">
            {/* Header with Title and Mode Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-emerald-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
                    <TrendingUp className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        Biểu Đồ Đường Hiệu Suất Hoàn Thành Công Việc Theo Từng Tuần
                      </h2>
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Recharts LineChart
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đo lường xu hướng biến thiên tỷ lệ hoàn thành (%), số lượng nhiệm vụ thực hiện và tỷ lệ đúng hạn qua từng tuần liên tiếp
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Controls: Number of Weeks & Metric Focus */}
              <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                {/* Metric Focus Filter */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPerformanceMetricFocus('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      performanceMetricFocus === 'all'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả chỉ số
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerformanceMetricFocus('rate')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      performanceMetricFocus === 'rate'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tỷ lệ (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerformanceMetricFocus('count')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      performanceMetricFocus === 'count'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Số lượng (việc)
                  </button>
                </div>

                {/* Week Range Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Số tuần:
                  </span>
                  {([4, 6, 8, 12] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setPerformanceWeekCount(w)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        performanceWeekCount === w
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {w} tuần
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4 Summary Highlight Cards With Colorful Theme Backgrounds */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-white border-2 border-emerald-300 shadow-xs">
                <div className="flex items-center justify-between text-xs font-black text-emerald-800">
                  <span>TỶ LỆ HOÀN THÀNH TB</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                    {performanceSummary.avgRate}%
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
                    {performanceWeekCount} tuần gần nhất
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 font-medium mt-1">Đạt chuẩn năng suất hoạt động</p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 via-blue-50/60 to-white border-2 border-blue-300 shadow-xs">
                <div className="flex items-center justify-between text-xs font-black text-blue-800">
                  <span>TỔNG VIỆC HOÀN THÀNH</span>
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-blue-700">
                    {performanceSummary.totalDone}
                  </span>
                  <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                    / {performanceSummary.totalTasks} việc
                  </span>
                </div>
                <p className="text-[11px] text-blue-800/80 font-medium mt-1">Đã nghiệm thu và chốt lưu trữ</p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-indigo-50/60 to-white border-2 border-indigo-300 shadow-xs">
                <div className="flex items-center justify-between text-xs font-black text-indigo-800">
                  <span>TỶ LỆ ĐÚNG HẠN</span>
                  <Clock className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-indigo-700">
                    {performanceSummary.overallOnTimeRate}%
                  </span>
                  <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200">
                    {performanceSummary.totalOnTime} việc
                  </span>
                </div>
                <p className="text-[11px] text-indigo-800/80 font-medium mt-1">Không trễ quá hạn cam kết</p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-50/60 to-white border-2 border-amber-300 shadow-xs">
                <div className="flex items-center justify-between text-xs font-black text-amber-800">
                  <span>TUẦN ĐẠT ĐỈNH CAO NHẤT</span>
                  <Flame className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-base sm:text-lg font-black text-amber-900 truncate">
                    {performanceSummary.bestWeekLabel}
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80 font-medium mt-1">Tuần có hiệu suất giải quyết tối ưu</p>
              </div>
            </div>

            {/* Recharts LineChart Canvas */}
            <div className="h-80 sm:h-96 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weeklyPerformanceData}
                  margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

                  <XAxis
                    dataKey="shortLabel"
                    stroke="#64748B"
                    fontSize={11}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />

                  {/* Left Axis: Task Counts */}
                  {(performanceMetricFocus === 'all' || performanceMetricFocus === 'count') && (
                    <YAxis
                      yAxisId="count"
                      orientation="left"
                      stroke="#3B82F6"
                      fontSize={11}
                      fontWeight={700}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      label={{
                        value: 'Số nhiệm vụ (việc)',
                        angle: -90,
                        position: 'insideLeft',
                        fill: '#2563EB',
                        fontSize: 10,
                        fontWeight: 700,
                        offset: 14,
                      }}
                    />
                  )}

                  {/* Right Axis: Completion Rate % */}
                  {(performanceMetricFocus === 'all' || performanceMetricFocus === 'rate') && (
                    <YAxis
                      yAxisId="rate"
                      orientation={performanceMetricFocus === 'rate' ? 'left' : 'right'}
                      stroke="#10B981"
                      fontSize={11}
                      fontWeight={700}
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                      label={{
                        value: 'Tỷ lệ hoàn thành (%)',
                        angle: performanceMetricFocus === 'rate' ? -90 : 90,
                        position: performanceMetricFocus === 'rate' ? 'insideLeft' : 'insideRight',
                        fill: '#059669',
                        fontSize: 10,
                        fontWeight: 700,
                        offset: 14,
                      }}
                    />
                  )}

                  {/* Tooltip */}
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload || !payload.length) return null;
                      const pt = payload[0]?.payload as WeeklyPerformanceDataPoint;
                      if (!pt) return null;

                      return (
                        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl border border-slate-700/80 shadow-2xl text-xs space-y-2.5 min-w-[260px]">
                          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                            <div>
                              <p className="font-extrabold text-sm text-indigo-300">
                                {pt.weekLabel}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {pt.dateRangeLabel}
                              </p>
                            </div>
                            {pt.isCurrentWeek && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase">
                                Tuần này
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-emerald-300 flex items-center gap-1.5 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                                Tỷ lệ hoàn thành:
                              </span>
                              <span className="font-black text-emerald-400 text-sm">
                                {pt.completionRate}%
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-blue-300 flex items-center gap-1.5 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
                                Đã xong / Tổng hạn:
                              </span>
                              <span className="font-extrabold text-blue-300">
                                {pt.completedTasks} / {pt.totalTasks} việc
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-purple-300 flex items-center gap-1.5 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                                Đúng hạn cam kết:
                              </span>
                              <span className="font-extrabold text-purple-300">
                                {pt.onTimeTasks} việc ({pt.onTimeRate}%)
                              </span>
                            </div>

                            {pt.overdueTasks > 0 && (
                              <div className="flex items-center justify-between gap-3 text-rose-300">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                                  Trễ hạn:
                                </span>
                                <span className="font-extrabold text-rose-400">
                                  {pt.overdueTasks} việc
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                              <span>Nhiệm vụ giao mới:</span>
                              <span className="font-semibold text-slate-200">
                                {pt.createdTasks} việc
                              </span>
                            </div>

                            {pt.avgLeadTimeHours > 0 && (
                              <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                                <span>Thời gian xử lý TB:</span>
                                <span className="font-semibold text-slate-200">
                                  {pt.avgLeadTimeHours} giờ/việc
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />

                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '16px', fontSize: '11px', fontWeight: 600 }}
                  />

                  {/* Benchmark 85% Reference Line */}
                  {(performanceMetricFocus === 'all' || performanceMetricFocus === 'rate') && (
                    <ReferenceLine
                      yAxisId="rate"
                      y={85}
                      stroke="#F59E0B"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Chỉ tiêu 85%',
                        fill: '#D97706',
                        fontSize: 10,
                        fontWeight: 700,
                        position: 'insideTopRight',
                      }}
                    />
                  )}

                  {/* Primary Line: Completion Rate (%) */}
                  {(performanceMetricFocus === 'all' || performanceMetricFocus === 'rate') && (
                    <Line
                      yAxisId="rate"
                      type="monotone"
                      dataKey="completionRate"
                      name="Tỷ lệ hoàn thành (%)"
                      stroke="#10B981"
                      strokeWidth={3.5}
                      dot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: '#FFFFFF' }}
                      activeDot={{ r: 8, stroke: '#059669', strokeWidth: 3, fill: '#FFFFFF' }}
                    />
                  )}

                  {/* Line: Completed Tasks (việc) */}
                  {(performanceMetricFocus === 'all' || performanceMetricFocus === 'count') && (
                    <Line
                      yAxisId="count"
                      type="monotone"
                      dataKey="completedTasks"
                      name="Số việc hoàn thành (việc)"
                      stroke="#3B82F6"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#FFFFFF' }}
                      activeDot={{ r: 7, stroke: '#1D4ED8', strokeWidth: 2, fill: '#FFFFFF' }}
                    />
                  )}

                  {/* Line: On-Time Tasks (việc) */}
                  {(performanceMetricFocus === 'all' || performanceMetricFocus === 'count') && (
                    <Line
                      yAxisId="count"
                      type="monotone"
                      dataKey="onTimeTasks"
                      name="Hoàn thành đúng hạn (việc)"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#8B5CF6' }}
                    />
                  )}

                  {/* Line: Overdue Tasks (việc) */}
                  {(performanceMetricFocus === 'all' || performanceMetricFocus === 'count') && (
                    <Line
                      yAxisId="count"
                      type="monotone"
                      dataKey="overdueTasks"
                      name="Trễ hạn trong tuần (việc)"
                      stroke="#EF4444"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={{ r: 3, fill: '#EF4444' }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Footer with note & quick action button */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  Chu kỳ tính toán tuần: Thứ Hai (00:00) đến Chủ Nhật (23:59:59) theo tiêu chuẩn quản lý công vụ.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTasks('all', 'this_week')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto hover:underline"
              >
                <span>Xem danh sách việc tuần này ({timeframeCounts.thisWeek})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* RECHARTS: BIỂU ĐỒ CỘT SO SÁNH HOÀN THÀNH VS TẠO MỚI (30 NGÀY QUA) */}
          <div className="bg-white/95 p-6 sm:p-7 rounded-3xl border-2 border-blue-200/90 border-t-4 border-t-blue-600 shadow-xs space-y-6">
            {/* Header with Title and Mode Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-blue-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                    <BarChart3 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        So Sánh Nhiệm Vụ Hoàn Thành vs Tạo Mới (30 Ngày Qua)
                      </h2>
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                        30 Ngày Qua
                      </span>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Recharts BarChart
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      So sánh khối lượng công việc đã giải quyết so với nhiệm vụ mới phát sinh để nắm bắt xu hướng và tốc độ xử lý
                    </p>
                  </div>
                </div>
              </div>

              {/* View Grouping Controls */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => setComparison30dMode('daily')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    comparison30dMode === 'daily'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theo ngày (30 ngày)
                </button>
                <button
                  type="button"
                  onClick={() => setComparison30dMode('grouped_5d')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    comparison30dMode === 'grouped_5d'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Gom 5 ngày (6 mốc)
                </button>
                <button
                  type="button"
                  onClick={() => setComparison30dMode('weekly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    comparison30dMode === 'weekly'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theo tuần (4 mốc)
                </button>
              </div>
            </div>

            {/* 4 Summary Highlight Cards With Colorful Theme Backgrounds */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* 1. Tổng hoàn thành 30 ngày */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-white border-2 border-emerald-300 shadow-xs">
                <div className="flex items-center justify-between text-xs font-black text-emerald-800">
                  <span>VIỆC ĐÃ HOÀN THÀNH</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                    {comparison30dSummary.totalCompleted}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
                    30 ngày
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 font-medium mt-1">Đã xử lý & nghiệm thu xong</p>
              </div>

              {/* 2. Tổng tạo mới 30 ngày */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-indigo-50/60 to-white border-2 border-indigo-300 shadow-xs">
                <div className="flex items-center justify-between text-xs font-black text-indigo-800">
                  <span>VIỆC MỚI TẠO</span>
                  <PlusCircle className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-indigo-700">
                    {comparison30dSummary.totalCreated}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200">
                    Giao mới
                  </span>
                </div>
                <p className="text-[11px] text-indigo-800/80 font-medium mt-1">Đưa vào quy trình công tác</p>
              </div>

              {/* 3. Tỷ lệ giải quyết / Tạo mới */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 via-blue-50/60 to-white border-2 border-blue-300 shadow-xs">
                <div className="flex items-center justify-between text-xs font-black text-blue-800">
                  <span>TỐC ĐỘ GIẢI QUYẾT</span>
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-blue-700">
                    {comparison30dSummary.completionToCreationRatio}%
                  </span>
                  <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                    Hoàn thành/Mới
                  </span>
                </div>
                <p className="text-[11px] text-blue-800/80 font-medium mt-1">
                  {comparison30dSummary.completionToCreationRatio >= 100
                    ? 'Giải quyết nhanh hơn giao mới'
                    : 'Giao mới nhiều hơn hoàn thành'}
                </p>
              </div>

              {/* 4. Chênh lệch ròng (Net Balance) */}
              <div
                className={`p-4 rounded-2xl border-2 shadow-xs ${
                  comparison30dSummary.netDifference >= 0
                    ? 'bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-white border-emerald-300'
                    : 'bg-gradient-to-br from-amber-50 via-amber-50/60 to-white border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-black">
                  <span
                    className={
                      comparison30dSummary.netDifference >= 0 ? 'text-emerald-800' : 'text-amber-900'
                    }
                  >
                    CHÊNH LỆCH RÒNG
                  </span>
                  <TrendingUp
                    className={`w-4 h-4 ${
                      comparison30dSummary.netDifference >= 0 ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span
                    className={`text-2xl sm:text-3xl font-black ${
                      comparison30dSummary.netDifference >= 0 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {comparison30dSummary.netDifference > 0
                      ? `+${comparison30dSummary.netDifference}`
                      : comparison30dSummary.netDifference}{' '}
                    <span className="text-xs font-bold text-slate-500">việc</span>
                  </span>
                </div>
                <p className="text-[11px] font-medium mt-1 text-slate-600">
                  {comparison30dSummary.netDifference >= 0
                    ? 'Giảm tồn đọng luồng công việc'
                    : 'Khối lượng tồn đọng gia tăng'}
                </p>
              </div>
            </div>

            {/* Recharts BarChart Canvas */}
            <div className="h-80 sm:h-96 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparison30dData}
                  margin={{ top: 15, right: 15, left: -10, bottom: comparison30dMode === 'daily' ? 25 : 10 }}
                >
                  <defs>
                    <linearGradient id="colorCompletedBar30d" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="colorCreatedBar30d" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

                  <XAxis
                    dataKey="label"
                    stroke="#64748B"
                    fontSize={comparison30dMode === 'daily' ? 10 : 11}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    interval={comparison30dMode === 'daily' ? 2 : 0}
                    angle={comparison30dMode === 'daily' ? -25 : 0}
                    textAnchor={comparison30dMode === 'daily' ? 'end' : 'middle'}
                  />

                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    fontWeight={700}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    label={{
                      value: 'Số nhiệm vụ (việc)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#475569',
                      fontSize: 10,
                      fontWeight: 700,
                      offset: 14,
                    }}
                  />

                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload || !payload.length) return null;
                      const pt = payload[0]?.payload as Comparison30DaysPoint;
                      if (!pt) return null;

                      return (
                        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-700/80 shadow-2xl text-xs space-y-2 min-w-[230px]">
                          <div className="border-b border-slate-700/80 pb-1.5">
                            <p className="font-extrabold text-sm text-indigo-300">
                              {pt.fullLabel || pt.label}
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-emerald-300 flex items-center gap-1.5 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                                Nhiệm vụ đã hoàn thành:
                              </span>
                              <span className="font-black text-emerald-400 text-sm">
                                {pt.completedTasks} việc
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-indigo-300 flex items-center gap-1.5 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
                                Nhiệm vụ mới tạo:
                              </span>
                              <span className="font-black text-indigo-300 text-sm">
                                {pt.createdTasks} việc
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                              <span>Chênh lệch trong mốc:</span>
                              <span
                                className={`font-bold ${
                                  pt.netChange > 0
                                    ? 'text-emerald-400'
                                    : pt.netChange < 0
                                    ? 'text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              >
                                {pt.netChange > 0 ? `+${pt.netChange}` : pt.netChange} việc
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />

                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '16px', fontSize: '11px', fontWeight: 600 }}
                  />

                  {/* Bar: Hoàn thành */}
                  <Bar
                    dataKey="completedTasks"
                    name="Số lượng nhiệm vụ đã hoàn thành"
                    fill="url(#colorCompletedBar30d)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={comparison30dMode === 'daily' ? 16 : 36}
                  />

                  {/* Bar: Mới tạo */}
                  <Bar
                    dataKey="createdTasks"
                    name="Số lượng nhiệm vụ mới tạo"
                    fill="url(#colorCreatedBar30d)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={comparison30dMode === 'daily' ? 16 : 36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Contextual Status Alert & Footer */}
            <div
              className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                comparison30dSummary.workloadStatus === 'healthy'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : comparison30dSummary.workloadStatus === 'overloaded'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-medium">{comparison30dSummary.statusMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToTasks('all')}
                className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer shrink-0 hover:underline"
              >
                <span>Xem chi tiết danh sách ({tasks.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

            {/* RECHARTS: BIỂU ĐỒ THỐNG KÊ XU HƯỚNG NĂNG SUẤT (HOÀN THÀNH & THỜI GIAN THỰC HIỆN) */}
          <div className="bg-white/95 p-6 sm:p-7 rounded-3xl border-2 border-violet-200/90 border-t-4 border-t-violet-600 shadow-xs space-y-5">
            {/* Header with Title and Mode Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-violet-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-violet-500/25">
                    <TrendingUp className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      {productivityPeriod === 'daily'
                        ? 'Báo Cáo Hiệu Suất Ngày'
                        : productivityPeriod === 'weekly'
                        ? 'Báo Cáo Hiệu Suất Tuần'
                        : 'Báo Cáo Hiệu Suất Tháng'}
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-300">
                        {productivityPeriod === 'daily'
                          ? 'Hôm nay & Ngày qua'
                          : productivityPeriod === 'weekly'
                          ? '7 Ngày'
                          : '6 Tháng'}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {productivityPeriod === 'daily'
                        ? 'Theo dõi chi tiết số nhiệm vụ tạo mới, tiến độ hoàn thành và thời gian xử lý hôm nay so với các ngày qua'
                        : productivityPeriod === 'weekly'
                        ? 'Đo lường xu hướng năng suất và thời lượng xử lý thực tế qua 7 ngày trong tuần'
                        : 'Tổng hợp nhịp độ hoàn thành công việc và thời gian xử lý qua 6 tháng liên tiếp'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Controls: View Type & Period */}
              <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                {/* Chart Type Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setProductivityChartType('productivity')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      productivityChartType === 'productivity'
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Năng suất (Cột & Đường)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductivityChartType('line')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      productivityChartType === 'line'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Biểu đồ đường (Line)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductivityChartType('flow')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      productivityChartType === 'flow'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Dòng chảy (Diện tích)</span>
                  </button>
                </div>

                {/* Period Selector: Day / Week / Month */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setProductivityPeriod('daily')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      productivityPeriod === 'daily'
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Theo Ngày (Hôm nay)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductivityPeriod('weekly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      productivityPeriod === 'weekly'
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Theo Tuần (7 ngày)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductivityPeriod('monthly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      productivityPeriod === 'monthly'
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Theo Tháng (6 tháng)
                  </button>
                </div>

                {/* Metric Unit Toggle (Hours / Days) - only in productivity chart */}
                {productivityChartType === 'productivity' && (
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setProductivityMetricUnit('hours')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        productivityMetricUnit === 'hours'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Hiển thị thời gian thực hiện theo Giờ"
                    >
                      Giờ (h)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductivityMetricUnit('days')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        productivityMetricUnit === 'days'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Hiển thị thời gian thực hiện theo Ngày"
                    >
                      Ngày (d)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Productivity Highlights Pills With Theme Gradients */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-white border-2 border-emerald-300 shadow-xs">
                <div className="flex items-center justify-between text-xs font-black text-emerald-800">
                  <span>VIỆC HOÀN THÀNH</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-emerald-700">{prodSummary.totalDone}</span>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
                    {prodSummary.onTimeRate}% đúng hạn
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 font-medium mt-1">Đã nghiệm thu trong kỳ</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 via-indigo-50/60 to-white border-2 border-indigo-300 shadow-xs">
                <div className="flex items-center justify-between text-xs font-black text-indigo-800">
                  <span>THỜI GIAN THỰC HIỆN TB</span>
                  <Clock className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-indigo-700">
                    {productivityMetricUnit === 'hours' ? prodSummary.avgHours : prodSummary.avgDays}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200">
                    {productivityMetricUnit === 'hours' ? 'giờ/việc' : 'ngày/việc'}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-800/80 font-medium mt-1">
                  ~{prodSummary.avgDays} ngày ({prodSummary.avgHours} giờ)
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 via-blue-50/60 to-white border-2 border-blue-300 shadow-xs">
                <div className="flex items-center justify-between text-xs font-black text-blue-800">
                  <span>TỔNG THỜI GIAN XỬ LÝ</span>
                  <Timer className="w-4 h-4 text-blue-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-blue-700">{prodSummary.totalHours}</span>
                  <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                    Giờ
                  </span>
                </div>
                <p className="text-[11px] text-blue-800/80 font-medium mt-1">Tổng thời lượng công tác</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 via-purple-50/60 to-white border-2 border-purple-300 shadow-xs">
                <div className="flex items-center justify-between text-xs font-black text-purple-900">
                  <span>NHIỆM VỤ GIAO MỚI</span>
                  <PlusCircle className="w-4 h-4 text-purple-600" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-purple-900">{prodSummary.totalCreated}</span>
                  <span className="text-[11px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                    Việc mới
                  </span>
                </div>
                <p className="text-[11px] text-purple-800/80 font-medium mt-1">Đưa vào luồng xử lý</p>
              </div>
            </div>

            {/* Daily Contextual Comparison Banner (Active when viewing daily report or as an overview) */}
            <div className="p-3.5 rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-violet-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-black text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>Hiệu suất công tác ngày: Hôm nay vs Ngày qua</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Hôm nay tạo mới: {dailySummary.createdToday} việc (Hôm qua: {dailySummary.createdYesterday} việc)
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-900/80 font-medium mt-0.5">
                    {dailySummary.todayStatusMessage}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white border border-indigo-200 text-indigo-900 shadow-2xs">
                  Đã xong hôm nay: <strong className="text-emerald-700">{dailySummary.completedToday}</strong> việc
                </span>
              </div>
            </div>

            {/* Recharts Chart Canvas */}
            <div className="h-80 sm:h-96 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                {productivityChartType === 'productivity' ? (
                  /* COMPOSED CHART: DUAL-AXIS BAR (SỐ LƯỢNG HOÀN THÀNH) + LINE (THỜI GIAN THỰC HIỆN) */
                  <ComposedChart
                    data={currentProdData}
                    margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorCompletedBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

                    <XAxis
                      dataKey="label"
                      stroke="#64748B"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                    />

                    {/* Left Axis: Completed Task Count */}
                    <YAxis
                      yAxisId="left"
                      stroke="#10B981"
                      fontSize={11}
                      fontWeight={700}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      label={{
                        value: 'Số lượng hoàn thành (việc)',
                        angle: -90,
                        position: 'insideLeft',
                        fill: '#059669',
                        fontSize: 10,
                        fontWeight: 700,
                        offset: 14,
                      }}
                    />

                    {/* Right Axis: Execution Time (Hours or Days) */}
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#6366F1"
                      fontSize={11}
                      fontWeight={700}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value:
                          productivityMetricUnit === 'hours'
                            ? 'Thời gian thực hiện TB (giờ)'
                            : 'Thời gian thực hiện TB (ngày)',
                        angle: 90,
                        position: 'insideRight',
                        fill: '#4F46E5',
                        fontSize: 10,
                        fontWeight: 700,
                        offset: 14,
                      }}
                    />

                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload || !payload.length) return null;
                        const pt = payload[0]?.payload as ProductivityTrendPoint;
                        if (!pt) return null;

                        return (
                          <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-700/80 shadow-xl text-xs space-y-2 min-w-[220px]">
                            <div className="border-b border-slate-700/80 pb-1.5">
                              <p className="font-extrabold text-sm text-indigo-300">
                                {pt.fullDateLabel || pt.label}
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-emerald-300 flex items-center gap-1.5 font-medium">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                                  Số việc hoàn thành:
                                </span>
                                <span className="font-extrabold text-emerald-400 text-sm">
                                  {pt.completedTasks} nhiệm vụ
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-3">
                                <span className="text-indigo-300 flex items-center gap-1.5 font-medium">
                                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
                                  Thời gian thực hiện TB:
                                </span>
                                <span className="font-extrabold text-indigo-300">
                                  {productivityMetricUnit === 'hours'
                                    ? `${pt.avgExecutionHours} giờ/việc`
                                    : `${pt.avgExecutionDays} ngày/việc`}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                                <span>Tổng thời gian tích lũy:</span>
                                <span className="font-semibold text-slate-200">
                                  {pt.totalExecutionHours} giờ
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                                <span>Đạt tiến độ đúng hạn:</span>
                                <span className="font-semibold text-emerald-400">
                                  {pt.onTimeCount} việc
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                                <span>Nhiệm vụ giao mới:</span>
                                <span className="font-semibold text-sky-400">
                                  {pt.createdTasks} việc
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />

                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: '16px', fontSize: '11px', fontWeight: 600 }}
                      formatter={(value) => {
                        const labelMap: Record<string, string> = {
                          completedTasks: 'Số nhiệm vụ hoàn thành (Cột)',
                          avgExecutionHours: 'Thời gian thực hiện TB (Giờ)',
                          avgExecutionDays: 'Thời gian thực hiện TB (Ngày)',
                          createdTasks: 'Nhiệm vụ giao mới (Đường)',
                        };
                        return (
                          <span className="text-slate-700 ml-1 font-semibold">
                            {labelMap[value] || value}
                          </span>
                        );
                      }}
                    />

                    {/* Bar for Completed Task Count */}
                    <Bar
                      yAxisId="left"
                      dataKey="completedTasks"
                      name="completedTasks"
                      fill="url(#colorCompletedBar)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={44}
                    />

                    {/* Line for Average Execution Time */}
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={
                        productivityMetricUnit === 'hours' ? 'avgExecutionHours' : 'avgExecutionDays'
                      }
                      name={
                        productivityMetricUnit === 'hours' ? 'avgExecutionHours' : 'avgExecutionDays'
                      }
                      stroke="#6366F1"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#6366F1', strokeWidth: 2, stroke: '#FFFFFF' }}
                      activeDot={{ r: 8, stroke: '#6366F1', strokeWidth: 3, fill: '#FFFFFF' }}
                    />

                    {/* Optional line for created tasks */}
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="createdTasks"
                      name="createdTasks"
                      stroke="#94A3B8"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#94A3B8' }}
                    />
                  </ComposedChart>
                ) : productivityChartType === 'line' ? (
                  /* RECHARTS LINE CHART: HIỆU SUẤT HOÀN THÀNH VÀ THỜI GIAN */
                  <LineChart
                    data={currentProdData}
                    margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748B"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#10B981"
                      fontSize={11}
                      fontWeight={700}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      label={{
                        value: 'Số lượng hoàn thành (việc)',
                        angle: -90,
                        position: 'insideLeft',
                        fill: '#059669',
                        fontSize: 10,
                        fontWeight: 700,
                        offset: 14,
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#6366F1"
                      fontSize={11}
                      fontWeight={700}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value:
                          productivityMetricUnit === 'hours'
                            ? 'Thời gian thực hiện TB (giờ)'
                            : 'Thời gian thực hiện TB (ngày)',
                        angle: 90,
                        position: 'insideRight',
                        fill: '#4F46E5',
                        fontSize: 10,
                        fontWeight: 700,
                        offset: 14,
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload || !payload.length) return null;
                        const pt = payload[0]?.payload as ProductivityTrendPoint;
                        if (!pt) return null;

                        return (
                          <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-700/80 shadow-xl text-xs space-y-2 min-w-[220px]">
                            <div className="border-b border-slate-700/80 pb-1.5">
                              <p className="font-extrabold text-sm text-indigo-300">
                                {pt.fullDateLabel || pt.label}
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-emerald-300 flex items-center gap-1.5 font-medium">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                                  Số việc hoàn thành:
                                </span>
                                <span className="font-extrabold text-emerald-400 text-sm">
                                  {pt.completedTasks} nhiệm vụ
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-indigo-300 flex items-center gap-1.5 font-medium">
                                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
                                  Thời gian thực hiện TB:
                                </span>
                                <span className="font-extrabold text-indigo-300">
                                  {productivityMetricUnit === 'hours'
                                    ? `${pt.avgExecutionHours} giờ/việc`
                                    : `${pt.avgExecutionDays} ngày/việc`}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                                <span>Đạt tiến độ đúng hạn:</span>
                                <span className="font-semibold text-emerald-400">
                                  {pt.onTimeCount} việc
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                                <span>Nhiệm vụ giao mới:</span>
                                <span className="font-semibold text-sky-400">
                                  {pt.createdTasks} việc
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: '16px', fontSize: '11px', fontWeight: 600 }}
                      formatter={(value) => {
                        const labelMap: Record<string, string> = {
                          completedTasks: 'Số nhiệm vụ hoàn thành',
                          avgExecutionHours: 'Thời gian thực hiện TB (Giờ)',
                          avgExecutionDays: 'Thời gian thực hiện TB (Ngày)',
                          createdTasks: 'Nhiệm vụ giao mới',
                        };
                        return (
                          <span className="text-slate-700 ml-1 font-semibold">
                            {labelMap[value] || value}
                          </span>
                        );
                      }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="completedTasks"
                      name="completedTasks"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: '#FFFFFF' }}
                      activeDot={{ r: 8, stroke: '#059669', strokeWidth: 3, fill: '#FFFFFF' }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={
                        productivityMetricUnit === 'hours' ? 'avgExecutionHours' : 'avgExecutionDays'
                      }
                      name={
                        productivityMetricUnit === 'hours' ? 'avgExecutionHours' : 'avgExecutionDays'
                      }
                      stroke="#6366F1"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#6366F1', strokeWidth: 2, stroke: '#FFFFFF' }}
                      activeDot={{ r: 8, stroke: '#6366F1', strokeWidth: 3, fill: '#FFFFFF' }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="createdTasks"
                      name="createdTasks"
                      stroke="#94A3B8"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#94A3B8' }}
                    />
                  </LineChart>
                ) : (
                  /* AREA CHART: WORKFLOW DYNAMICS (TẠO MỚI, HOÀN THÀNH, TRỄ HẠN) */
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                      formatter={(value: any, name: any) => {
                        const labelMap: Record<string, string> = {
                          completed: 'Việc hoàn thành',
                          created: 'Việc tạo mới',
                          overdue: 'Việc trễ hạn',
                        };
                        return [`${value} nhiệm vụ`, labelMap[name] || name];
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
                      formatter={(value) => {
                        const labelMap: Record<string, string> = {
                          completed: 'Nhiệm vụ hoàn thành',
                          created: 'Nhiệm vụ tạo mới',
                          overdue: 'Nhiệm vụ trễ hạn',
                        };
                        return <span className="text-slate-700 ml-1">{labelMap[value] || value}</span>;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorCompleted)"
                      name="completed"
                    />
                    <Area
                      type="monotone"
                      dataKey="created"
                      stroke="#6366F1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCreated)"
                      name="created"
                    />
                    <Area
                      type="monotone"
                      dataKey="overdue"
                      stroke="#EF4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorOverdue)"
                      name="overdue"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Main Charts & Breakdown Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* RECHARTS: BIỂU ĐỒ CỘT SO SÁNH TIẾN ĐỘ THEO ĐƠN VỊ */}
            <div className="lg:col-span-7 bg-white/95 p-6 rounded-3xl border-2 border-teal-200/90 border-t-4 border-t-teal-500 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-teal-600" />
                    <h2 className="text-base font-black text-slate-900">
                      Phân Bổ Việc Tôi Làm Theo Mảng Đơn Vị (Recharts)
                    </h2>
                  </div>
                  <span className="text-[11px] font-black text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-200">
                    {unitChartData.length} Mảng đơn vị
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Thống kê khối lượng công việc tôi trực tiếp thực hiện cho từng đơn vị (hoàn thành, đang làm, trễ hạn)
                </p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={unitChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#94A3B8"
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: '#E2E8F0' }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        stroke="#94A3B8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '16px',
                          border: '1px solid #E2E8F0',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px',
                        }}
                        labelFormatter={(label, payload) => {
                          const full = payload?.[0]?.payload?.fullName;
                          return full || label;
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ paddingBottom: '8px', fontSize: '11px', fontWeight: 600 }}
                      />
                      <Bar dataKey="Hoàn thành" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Đang làm" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Trễ hạn" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Dữ liệu biểu đồ tự động cập nhật khi tick chọn task</span>
                <button
                  onClick={() => onNavigateToTasks('all')}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                >
                  Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Biểu đồ Donut & Thống kê Tỷ lệ */}
            <div className="lg:col-span-5 bg-white/95 p-6 rounded-3xl border-2 border-indigo-200/90 border-t-4 border-t-indigo-600 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-900">Tỷ Lệ Nghiệm Thu Tổng Thể</h2>
                    <p className="text-xs text-slate-500">Tỷ trọng hoàn thành, trễ hạn và đang làm</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-200">
                    Tổng: {stats.total}
                  </span>
                </div>

                {/* Circular Ring Chart */}
                <div className="my-5 flex items-center justify-center">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#F1F5F9"
                        strokeWidth="12"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#10B981"
                        strokeWidth="12"
                        strokeDasharray={`${compDash} ${c}`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#3B82F6"
                        strokeWidth="12"
                        strokeDasharray={`${inProgDash} ${c}`}
                        strokeDashoffset={`${-compDash}`}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#EF4444"
                        strokeWidth="12"
                        strokeDasharray={`${overdueDash} ${c}`}
                        strokeDashoffset={`${-(compDash + inProgDash)}`}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#94A3B8"
                        strokeWidth="12"
                        strokeDasharray={`${pendDash} ${c}`}
                        strokeDashoffset={`${-(compDash + inProgDash + overdueDash)}`}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-extrabold text-slate-800 tracking-tight">
                        {stats.completionRate}%
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Hoàn thành
                      </span>
                    </div>
                  </div>
                </div>

                {/* Legend & Percentages */}
                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-600 font-medium">Đã xong:</span>
                    <span className="font-bold text-slate-900 ml-auto">{stats.completed}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-slate-600 font-medium">Đang làm:</span>
                    <span className="font-bold text-slate-900 ml-auto">{stats.inProgress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-slate-600 font-medium">Trễ hạn:</span>
                    <span className="font-bold text-rose-600 ml-auto">{stats.overdue}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-400 shrink-0" />
                    <span className="text-slate-600 font-medium">Chưa bắt đầu:</span>
                    <span className="font-bold text-slate-900 ml-auto">{stats.pending}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cảnh báo việc trễ hạn & Việc khẩn cấp */}
          {overdueTasks.length > 0 && (
            <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-rose-900">Danh mục Việc Quá Hạn Cần Xử Lý Ngay</h2>
                    <p className="text-xs text-rose-700/80">
                      Các nhiệm vụ đã vượt quá mốc thời gian hoàn thành cam kết
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToTasks('overdue')}
                  className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-white px-3 py-1.5 rounded-xl border border-rose-200 shadow-xs cursor-pointer"
                >
                  Xem tất cả ({overdueTasks.length})
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {overdueTasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onNavigateToTasks('overdue')}
                    className="bg-white p-4 rounded-2xl border border-rose-200/80 hover:border-rose-400 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                          {task.unit}
                        </span>
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Hạn: {formatDateVietnamese(task.dueDate)}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1 mt-1">{task.title}</h3>
                      <p className="text-slate-500 text-xs line-clamp-2 mt-1">{task.description}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Tiến độ: {task.progress}%</span>
                      <span className="text-indigo-600 font-bold hover:underline">Mở xử lý →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TÍCH HỢP VỚI DASHBOARD: KHU VỰC GHI CHÚ GẦN ĐÂY & ĐÃ GHIM (GOOGLE KEEP STYLE) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <StickyNote className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      Ghi Chú Đã Ghim &amp; Gần Đây
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Dạng thẻ Keep
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Xem nhanh các ghi chép quan trọng, việc cần nhớ tức thì và checklist hằng ngày
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => (onOpenCreateNote ? onOpenCreateNote() : onNavigateToNotes && onNavigateToNotes())}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo ghi chú</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToNotes && onNavigateToNotes()}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                >
                  Xem tất cả →
                </button>
              </div>
            </div>

            {(() => {
              const activeNotes = notes.filter((n) => !n.isArchived && !n.isDeleted);
              const pinned = activeNotes.filter((n) => n.isPinned);
              const others = activeNotes.filter((n) => !n.isPinned);
              const displayNotes = [...pinned, ...others].slice(0, 4);

              if (displayNotes.length === 0) {
                return (
                  <div className="text-center py-8 px-4 rounded-2xl bg-amber-50/40 border border-dashed border-amber-200 text-amber-900/80">
                    <StickyNote className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">Chưa có ghi chú nào được tạo</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                      Bấm &quot;Tạo ghi chú&quot; để lưu nhanh ý tưởng, số liệu hoặc tạo danh sách việc cần làm hằng ngày.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {displayNotes.map((note) => {
                    const palette =
                      NOTE_COLOR_PALETTES.find((p) => p.id === note.color || p.hex === note.color) ||
                      NOTE_COLOR_PALETTES[1];
                    const checklist = note.checklistItems || note.checklist || [];
                    return (
                      <div
                        key={note.id}
                        onClick={() => onNavigateToNotes && onNavigateToNotes()}
                        className={`p-4 rounded-2xl border ${palette.borderClass} ${palette.bgClass} shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between min-h-[140px] group text-slate-800`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5 mb-1.5">
                            <h3 className="font-bold text-xs sm:text-sm line-clamp-1 flex-1">
                              {note.title || 'Ghi chú không tiêu đề'}
                            </h3>
                            {note.isPinned && (
                              <Pin className="w-3.5 h-3.5 fill-amber-600 text-amber-700 shrink-0" />
                            )}
                          </div>

                          {note.content && (
                            <p className="text-[11px] opacity-90 line-clamp-3 leading-relaxed mb-2">
                              {note.content}
                            </p>
                          )}

                          {checklist.length > 0 && (
                            <div className="space-y-1 mb-2">
                              {checklist.slice(0, 2).map((item) => (
                                <div key={item.id} className="flex items-center gap-1.5 text-[11px]">
                                  <span className={item.completed ? 'opacity-50 line-through' : 'font-medium'}>
                                    {item.completed ? '☑' : '☐'} {item.text}
                                  </span>
                                </div>
                              ))}
                              {checklist.length > 2 && (
                                <span className="text-[10px] opacity-75 font-semibold">
                                  +{checklist.length - 2} việc khác
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[10px] opacity-75">
                          <span>{new Date(note.updatedAt).toLocaleDateString('vi-VN')}</span>
                          <span className="font-bold group-hover:underline">Mở xem →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
