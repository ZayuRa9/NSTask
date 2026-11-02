import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  BarChart2
} from 'lucide-react';
import { Task, UserProfile } from '../types/task';
import { isTaskOverdue } from '../utils/taskCalculations';

interface WeeklyCompletionTrendsD3Props {
  tasks: Task[];
  userProfile?: UserProfile;
  className?: string;
}

interface WeekDataPoint {
  weekKey: string;
  weekLabel: string;
  startDate: Date;
  endDate: Date;
  completedCount: number;
  createdCount: number;
  onTimeCount: number;
  overdueCount: number;
  onTimeRate: number;
  avgHours: number;
  weeklyGoal: number;
}

export const WeeklyCompletionTrendsD3: React.FC<WeeklyCompletionTrendsD3Props> = ({
  tasks,
  userProfile,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    point: WeekDataPoint | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    point: null,
  });

  const weeklyGoal = userProfile?.weeklyGoal || 4;

  // 1. Phân tích dữ liệu thực tế của toàn phần mềm theo tuần
  const weeklyData: WeekDataPoint[] = useMemo(() => {
    const points: WeekDataPoint[] = [];
    const now = new Date();

    // Lấy 6 tuần gần nhất (từ tuần 5 tuần trước đến tuần này)
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(now);
      ref.setDate(now.getDate() - i * 7);

      // Tính ngày Thứ Hai đầu tuần (theo giờ VN)
      const day = ref.getDay();
      const diffToMon = (day === 0 ? -6 : 1) - day;
      const mon = new Date(ref);
      mon.setDate(ref.getDate() + diffToMon);
      mon.setHours(0, 0, 0, 0);

      // Tính ngày Chủ Nhật cuối tuần
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23, 59, 59, 999);

      const monStr = `${mon.getDate().toString().padStart(2, '0')}/${(mon.getMonth() + 1).toString().padStart(2, '0')}`;
      const sunStr = `${sun.getDate().toString().padStart(2, '0')}/${(sun.getMonth() + 1).toString().padStart(2, '0')}`;
      const weekLabel = i === 0 ? 'Tuần này' : `T-${i} (${monStr})`;

      // Lọc các tasks thuộc tuần này dựa trên thực tế dữ liệu toàn phần mềm
      const tasksCompletedInWeek = tasks.filter((t) => {
        if (t.status !== 'completed' || !t.completedAt) return false;
        const compDate = new Date(t.completedAt);
        return compDate >= mon && compDate <= sun;
      });

      const tasksCreatedInWeek = tasks.filter((t) => {
        if (!t.createdAt) return false;
        const cDate = new Date(t.createdAt);
        return cDate >= mon && cDate <= sun;
      });

      const onTimeInWeek = tasksCompletedInWeek.filter((t) => {
        if (!t.dueDate || !t.completedAt) return true;
        const d = new Date(t.dueDate);
        const c = new Date(t.completedAt);
        return c <= d;
      }).length;

      // Tính thời gian thực hiện trung bình trong tuần
      let totalExecutionHours = 0;
      tasksCompletedInWeek.forEach((t) => {
        if (t.completedAt && t.createdAt) {
          const diffMs = Math.max(0, new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime());
          totalExecutionHours += diffMs / (1000 * 60 * 60);
        } else {
          totalExecutionHours += 4; // Mặc định ước lượng 4h nếu thiếu timestamp
        }
      });

      const completedCount = tasksCompletedInWeek.length;
      const avgHours = completedCount > 0 ? +(totalExecutionHours / completedCount).toFixed(1) : 0;
      const onTimeRate = completedCount > 0 ? Math.round((onTimeInWeek / completedCount) * 100) : 100;

      // Đếm số việc có hạn trong tuần nhưng đang trễ
      const overdueInWeek = tasks.filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= mon && d <= sun && isTaskOverdue(t.dueDate, t.completedAt);
      }).length;

      points.push({
        weekKey: `w_${mon.toISOString().slice(0, 10)}`,
        weekLabel,
        startDate: mon,
        endDate: sun,
        completedCount,
        createdCount: tasksCreatedInWeek.length,
        onTimeCount: onTimeInWeek,
        overdueCount: overdueInWeek,
        onTimeRate,
        avgHours,
        weeklyGoal,
      });
    }

    return points;
  }, [tasks, weeklyGoal]);


  // 3. Render biểu đồ D3.js
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current.clientWidth || 600;
    const height = 280;
    const margin = { top: 25, right: 30, bottom: 45, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scale X & Y
    const xScale = d3
      .scalePoint<string>()
      .domain(weeklyData.map((d) => d.weekLabel))
      .range([0, innerWidth])
      .padding(0.4);

    const maxCount = Math.max(
      d3.max(weeklyData, (d) => Math.max(d.completedCount, d.createdCount, d.weeklyGoal)) || 5,
      6
    );

    const yScale = d3
      .scaleLinear()
      .domain([0, maxCount + 1])
      .nice()
      .range([innerHeight, 0]);

    // Thêm gradient cho Area biểu đồ D3
    const defs = svg.append('defs');

    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'd3-completed-area-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#10B981')
      .attr('stop-opacity', 0.45);

    areaGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#10B981')
      .attr('stop-opacity', 0.0);

    // Lưới ngang (Gridlines)
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#F1F5F9')
      .attr('stroke-dasharray', '3 3');

    // Đường mục tiêu tuần (Weekly Target Dashed Line)
    const targetY = yScale(weeklyGoal);
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', targetY)
      .attr('y2', targetY)
      .attr('stroke', '#F59E0B')
      .attr('stroke-dasharray', '5 4')
      .attr('stroke-width', 1.8)
      .attr('opacity', 0.85);

    g.append('text')
      .attr('x', innerWidth - 5)
      .attr('y', targetY - 6)
      .attr('text-anchor', 'end')
      .attr('fill', '#D97706')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .text(`Mục tiêu tuần: ${weeklyGoal} việc`);

    // D3 Area Generator
    const areaGenerator = d3
      .area<WeekDataPoint>()
      .x((d) => xScale(d.weekLabel) || 0)
      .y0(innerHeight)
      .y1((d) => yScale(d.completedCount))
      .curve(d3.curveMonotoneX);

    // Vẽ Area hoàn thành
    g.append('path')
      .datum(weeklyData)
      .attr('fill', 'url(#d3-completed-area-grad)')
      .attr('d', areaGenerator);

    // D3 Line Generator cho Completed Tasks
    const lineGenerator = d3
      .line<WeekDataPoint>()
      .x((d) => xScale(d.weekLabel) || 0)
      .y((d) => yScale(d.completedCount))
      .curve(d3.curveMonotoneX);

    // Vẽ đường Line hoàn thành
    g.append('path')
      .datum(weeklyData)
      .attr('fill', 'none')
      .attr('stroke', '#10B981')
      .attr('stroke-width', 3)
      .attr('d', lineGenerator);

    // D3 Line Generator cho Created Tasks (Đường phụ nét đứt màu chàm)
    const createdLine = d3
      .line<WeekDataPoint>()
      .x((d) => xScale(d.weekLabel) || 0)
      .y((d) => yScale(d.createdCount))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(weeklyData)
      .attr('fill', 'none')
      .attr('stroke', '#6366F1')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 4')
      .attr('opacity', 0.7)
      .attr('d', createdLine);

    // Trục X
    const xAxis = d3.axisBottom(xScale);
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call((ax) => ax.select('.domain').attr('stroke', '#E2E8F0'))
      .selectAll('text')
      .attr('fill', '#64748B')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('dy', '1.2em');

    // Trục Y
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('d'));
    g.append('g')
      .call(yAxis)
      .call((ay) => ay.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#64748B')
      .attr('font-size', '11px')
      .attr('font-weight', '600');

    // Nhãn trục Y
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -35)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#059669')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .text('Số nhiệm vụ hoàn thành (việc)');

    // Các điểm nút tương tác (Interactive Dots with Tooltip)
    const dotsGroup = g.append('g').attr('class', 'dots');

    weeklyData.forEach((d) => {
      const cx = xScale(d.weekLabel) || 0;
      const cy = yScale(d.completedCount);

      // Outer halo
      dotsGroup
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 7)
        .attr('fill', '#10B981')
        .attr('opacity', 0.2);

      // Inner dot
      const circle = dotsGroup
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 4.5)
        .attr('fill', '#FFFFFF')
        .attr('stroke', '#10B981')
        .attr('stroke-width', 2.5)
        .style('cursor', 'pointer');

      // Tương tác hover
      circle
        .on('mouseenter', (event) => {
          circle.transition().duration(150).attr('r', 7).attr('fill', '#10B981');
          const [mx, my] = d3.pointer(event, containerRef.current);
          setTooltipData({
            visible: true,
            x: mx,
            y: my - 10,
            point: d,
          });
        })
        .on('mousemove', (event) => {
          const [mx, my] = d3.pointer(event, containerRef.current);
          setTooltipData((prev) => ({
            ...prev,
            x: mx,
            y: my - 10,
          }));
        })
        .on('mouseleave', () => {
          circle.transition().duration(150).attr('r', 4.5).attr('fill', '#FFFFFF');
          setTooltipData((prev) => ({ ...prev, visible: false }));
        });
    });
  }, [weeklyData, weeklyGoal]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* KHỐI BIỂU ĐỒ D3.JS XU HƯỚNG HOÀN THÀNH NHIỆM VỤ THEO TUẦN */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Xu Hướng Hoàn Thành Nhiệm Vụ Theo Tuần
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs self-start sm:self-auto">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span>Đã hoàn thành</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-500">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-indigo-500 inline-block" />
              <span>Việc tạo mới</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-amber-600">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" />
              <span>Chỉ tiêu ({weeklyGoal})</span>
            </div>
          </div>
        </div>

        {/* D3 Canvas Container */}
        <div ref={containerRef} className="relative w-full overflow-hidden">
          <svg ref={svgRef} className="w-full h-auto overflow-visible select-none" />

          {/* D3 Tooltip */}
          {tooltipData.visible && tooltipData.point && (
            <div
              className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-950/95 backdrop-blur-md text-white p-3 rounded-xl border border-slate-700 shadow-2xl text-xs space-y-1.5 min-w-[200px]"
              style={{
                left: `${tooltipData.x}px`,
                top: `${tooltipData.y}px`,
              }}
            >
              <div className="font-extrabold text-emerald-400 border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>{tooltipData.point.weekLabel}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Mục tiêu: {tooltipData.point.weeklyGoal}
                </span>
              </div>
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Hoàn thành:</span>
                  <span className="font-extrabold text-emerald-400">
                    {tooltipData.point.completedCount} việc
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Việc tạo mới:</span>
                  <span className="font-bold text-indigo-300">
                    {tooltipData.point.createdCount} việc
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Tỷ lệ đúng hạn:</span>
                  <span className="font-bold text-amber-300">
                    {tooltipData.point.onTimeRate}%
                  </span>
                </div>
                {tooltipData.point.avgHours > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 border-t border-slate-800">
                    <span>Thời gian thực hiện TB:</span>
                    <span className="font-semibold text-white">
                      {tooltipData.point.avgHours}h / việc
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Thống kê nhanh dưới chân biểu đồ D3 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-500 font-medium block">Tuần này hoàn tất</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">
              {weeklyData[weeklyData.length - 1]?.completedCount || 0} việc
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <span className="text-emerald-800 font-medium block">Tỷ lệ đúng hạn</span>
            <span className="text-lg font-black text-emerald-700 mt-0.5 block">
              {weeklyData[weeklyData.length - 1]?.onTimeRate || 100}%
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
            <span className="text-indigo-800 font-medium block">Tổng hoàn tất 6 tuần</span>
            <span className="text-lg font-black text-indigo-700 mt-0.5 block">
              {weeklyData.reduce((s, d) => s + d.completedCount, 0)} việc
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
            <span className="text-amber-800 font-medium block">Mục tiêu tuần đặt ra</span>
            <span className="text-lg font-black text-amber-700 mt-0.5 block">
              {weeklyGoal} việc / tuần
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
