import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Target,
  Award,
  Flame,
  CheckCircle2,
  Calendar,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Task, UserProfile } from '../types/task';

interface ProductivityTrendsProps {
  tasks: Task[];
  userProfile: UserProfile;
  onUpdateWeeklyGoal?: (goal: number) => void;
}

interface WeekDataPoint {
  weekKey: string;
  label: string;
  shortLabel: string;
  startDate: Date;
  endDate: Date;
  actualCompleted: number;
  onTimeCompleted: number;
  goal: number;
  achievementRate: number;
  totalDue: number;
  isCurrentWeek: boolean;
}

export const ProductivityTrends: React.FC<ProductivityTrendsProps> = ({
  tasks,
  userProfile,
  onUpdateWeeklyGoal,
}) => {
  const [weekRange, setWeekRange] = useState<6 | 8 | 12>(8);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const currentGoal = userProfile.weeklyGoal && userProfile.weeklyGoal > 0 ? userProfile.weeklyGoal : 5;
  const [goalInput, setGoalInput] = useState<number>(currentGoal);

  // Compute weekly series based on selected weekRange
  const { weeklyData, currentWeekStats, streakWeeks, avgCompletionRate, totalCompletedInPeriod } =
    useMemo(() => {
      const now = new Date();
      // Start of current week (Monday)
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const mondayThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      mondayThisWeek.setHours(0, 0, 0, 0);

      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      const points: WeekDataPoint[] = [];

      for (let i = weekRange - 1; i >= 0; i--) {
        const start = new Date(mondayThisWeek.getTime() - i * oneWeekMs);
        const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        const startTime = start.getTime();
        const endTime = end.getTime();

        // Calculate ISO week number
        const tempD = new Date(start.getTime());
        tempD.setDate(tempD.getDate() + 3 - ((tempD.getDay() + 6) % 7));
        const week1 = new Date(tempD.getFullYear(), 0, 4);
        const weekNum = 1 + Math.round(((tempD.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);

        const shortLabel = `T${weekNum} (${start.getDate()}/${start.getMonth() + 1})`;
        const fullLabel = `Tuần ${weekNum} (${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1})`;

        let completed = 0;
        let onTime = 0;
        let dueCount = 0;

        tasks.forEach((t) => {
          // Completed in this week
          if (t.status === 'completed' || t.progress === 100) {
            const compTime = t.completedAt
              ? new Date(t.completedAt).getTime()
              : t.dueDate
              ? new Date(t.dueDate).getTime()
              : 0;

            if (compTime >= startTime && compTime <= endTime) {
              completed++;
              if (t.dueDate) {
                const dueTime = new Date(t.dueDate).getTime();
                if (compTime <= dueTime + 3600000) {
                  onTime++;
                }
              } else {
                onTime++;
              }
            }
          }

          // Due in this week
          if (t.dueDate) {
            const dTime = new Date(t.dueDate).getTime();
            if (dTime >= startTime && dTime <= endTime) {
              dueCount++;
            }
          }
        });

        const rate = currentGoal > 0 ? Math.round((completed / currentGoal) * 100) : 100;
        const isCurrent = i === 0;

        points.push({
          weekKey: `w_${i}`,
          label: fullLabel,
          shortLabel,
          startDate: start,
          endDate: end,
          actualCompleted: completed,
          onTimeCompleted: onTime,
          goal: currentGoal,
          achievementRate: rate,
          totalDue: dueCount,
          isCurrentWeek: isCurrent,
        });
      }

      // Current week
      const currentStats = points[points.length - 1];

      // Streak calculation (consecutive weeks meeting or exceeding goal)
      let streak = 0;
      for (let i = points.length - 1; i >= 0; i--) {
        if (points[i].actualCompleted >= points[i].goal) {
          streak++;
        } else {
          // If current week is ongoing and hasn't met goal yet, don't break streak if last week met it
          if (i === points.length - 1) {
            continue;
          }
          break;
        }
      }

      const totalComp = points.reduce((acc, p) => acc + p.actualCompleted, 0);
      const avgRate = points.length > 0
        ? Math.round(points.reduce((acc, p) => acc + p.achievementRate, 0) / points.length)
        : 0;

      return {
        weeklyData: points,
        currentWeekStats: currentStats,
        streakWeeks: streak,
        avgCompletionRate: avgRate,
        totalCompletedInPeriod: totalComp,
      };
    }, [tasks, weekRange, currentGoal]);

  const handleSaveGoal = () => {
    if (goalInput > 0 && onUpdateWeeklyGoal) {
      onUpdateWeeklyGoal(goalInput);
    }
    setIsEditingGoal(false);
  };

  const isCurrentWeekTargetMet = currentWeekStats.actualCompleted >= currentWeekStats.goal;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-xs space-y-6">
      {/* Header with Title and Range Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <TrendingUp className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Xu Hướng Năng Suất &amp; Mục Tiêu Tuần
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Productivity Trends
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              So sánh sản lượng nhiệm vụ hoàn thành thực tế so với mục tiêu kế hoạch đặt ra theo từng tuần
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Time range selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setWeekRange(6)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                weekRange === 6 ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'hover:text-slate-900'
              }`}
            >
              6 tuần
            </button>
            <button
              type="button"
              onClick={() => setWeekRange(8)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                weekRange === 8 ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'hover:text-slate-900'
              }`}
            >
              8 tuần
            </button>
            <button
              type="button"
              onClick={() => setWeekRange(12)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                weekRange === 12 ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'hover:text-slate-900'
              }`}
            >
              12 tuần
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Mục tiêu tuần */}
        <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-amber-500" /> Mục tiêu tuần
            </span>
            <button
              type="button"
              onClick={() => setIsEditingGoal(!isEditingGoal)}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
            >
              {isEditingGoal ? 'Đóng' : 'Đổi'}
            </button>
          </div>
          {isEditingGoal ? (
            <div className="flex items-center gap-1.5 mt-2">
              <input
                type="number"
                min={1}
                max={50}
                value={goalInput}
                onChange={(e) => setGoalInput(Number(e.target.value))}
                className="w-16 px-2 py-1 text-sm font-bold border border-indigo-300 rounded-lg bg-white"
              />
              <button
                type="button"
                onClick={handleSaveGoal}
                className="px-2 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer"
              >
                Lưu
              </button>
            </div>
          ) : (
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{currentGoal}</span>
              <span className="text-xs text-slate-500 font-medium">việc/tuần</span>
            </div>
          )}
          <p className="text-[10px] text-slate-500 mt-1">Chuẩn cam kết cá nhân</p>
        </div>

        {/* Card 2: Hoàn thành tuần này */}
        <div className={`rounded-2xl p-3.5 border ${
          isCurrentWeekTargetMet
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1">
              <CheckCircle2 className={`w-3.5 h-3.5 ${isCurrentWeekTargetMet ? 'text-emerald-600' : 'text-indigo-600'}`} />
              Thực tế tuần này
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
              isCurrentWeekTargetMet ? 'bg-emerald-200 text-emerald-800' : 'bg-indigo-200 text-indigo-800'
            }`}>
              {currentWeekStats.achievementRate}%
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black">
              {currentWeekStats.actualCompleted}
            </span>
            <span className="text-xs opacity-75 font-medium">/ {currentGoal} việc</span>
          </div>
          <p className="text-[10px] opacity-75 mt-1">
            {isCurrentWeekTargetMet ? '✓ Đã đạt vượt chỉ tiêu' : 'Đang hoàn thiện mục tiêu'}
          </p>
        </div>

        {/* Card 3: Chuỗi tuần đạt mục tiêu */}
        <div className="bg-amber-50/70 rounded-2xl p-3.5 border border-amber-200">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" /> Chuỗi tuần đạt
            </span>
            <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-md">
              Chuỗi đạt
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-900">{streakWeeks}</span>
            <span className="text-xs text-amber-700 font-medium">tuần liên tiếp</span>
          </div>
          <p className="text-[10px] text-amber-700/80 mt-1">Duy trì nhịp độ ổn định</p>
        </div>

        {/* Card 4: Tổng sản lượng hoàn thành */}
        <div className="bg-purple-50/70 rounded-2xl p-3.5 border border-purple-200">
          <div className="flex items-center justify-between text-purple-800 text-xs font-semibold">
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-purple-600" /> Tổng trong {weekRange} tuần
            </span>
            <span className="text-[10px] font-black bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded-md">
              Đạt {avgCompletionRate}%
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-purple-900">{totalCompletedInPeriod}</span>
            <span className="text-xs text-purple-700 font-medium">việc đã chốt</span>
          </div>
          <p className="text-[10px] text-purple-700/80 mt-1">
            Trung bình {(totalCompletedInPeriod / weekRange).toFixed(1)} việc/tuần
          </p>
        </div>
      </div>

      {/* Main Recharts Composed Chart */}
      <div className="pt-2">
        <div className="h-[290px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={weeklyData}
              margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="actualBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0.65} />
                </linearGradient>
                <linearGradient id="onTimeBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.6} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />

              <XAxis
                dataKey="shortLabel"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
              />

              {/* Left YAxis: Task Count */}
              <YAxis
                yAxisId="left"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />

              {/* Right YAxis: Percentage */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#F59E0B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                unit="%"
                domain={[0, (dataMax: number) => Math.max(120, Math.ceil(dataMax / 20) * 20)]}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as WeekDataPoint;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[210px]">
                      <div className="font-extrabold text-amber-300 pb-1 border-b border-slate-800">
                        {data.label}
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
                          Thực tế hoàn thành:
                        </span>
                        <strong className="text-white text-sm">{data.actualCompleted} việc</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                          Đúng thời hạn:
                        </span>
                        <strong className="text-emerald-400">{data.onTimeCompleted} việc</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
                          Mục tiêu kế hoạch:
                        </span>
                        <strong className="text-amber-300">{data.goal} việc</strong>
                      </div>
                      <div className="pt-1 mt-1 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">Tỷ lệ đạt kế hoạch:</span>
                        <span className={`font-black ${data.achievementRate >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {data.achievementRate}% {data.achievementRate >= 100 ? '✓ Đạt' : ''}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />

              <Legend
                wrapperStyle={{ paddingTop: 10, fontSize: '11px', fontWeight: 600 }}
                formatter={(val) => {
                  if (val === 'actualCompleted') return 'Thực tế hoàn thành (việc)';
                  if (val === 'onTimeCompleted') return 'Hoàn thành đúng hạn (việc)';
                  if (val === 'goal') return 'Mục tiêu tuần (kế hoạch)';
                  if (val === 'achievementRate') return 'Tỷ lệ đạt kế hoạch (%)';
                  return val;
                }}
              />

              {/* Goal line benchmark */}
              <ReferenceLine
                yAxisId="left"
                y={currentGoal}
                stroke="#F59E0B"
                strokeDasharray="4 4"
                label={{
                  value: `Mục tiêu (${currentGoal} việc)`,
                  position: 'insideTopRight',
                  fill: '#D97706',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />

              {/* Bars for completed tasks */}
              <Bar
                yAxisId="left"
                dataKey="actualCompleted"
                name="actualCompleted"
                fill="url(#actualBarGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
              />

              {/* Line for Goal */}
              <Line
                yAxisId="left"
                type="step"
                dataKey="goal"
                name="goal"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ r: 3, fill: '#F59E0B' }}
                activeDot={{ r: 5 }}
              />

              {/* Line for Achievement Rate */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="achievementRate"
                name="achievementRate"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#10B981' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
