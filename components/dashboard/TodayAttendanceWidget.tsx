"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { CalendarCheck } from "lucide-react";

type Props = { trend: { date: string; count: number }[] };

export function TodayAttendanceWidget({ trend }: Props) {
  const avg = trend.length ? Math.round(trend.reduce((s, t) => s + t.count, 0) / trend.length) : 0;
  const peak = Math.max(...trend.map((t) => t.count), 0);

  return (
    <div className="rounded-2xl p-6" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="rounded-xl p-2" style={{ background: "rgba(59,130,246,0.12)" }}>
              <CalendarCheck className="h-4 w-4 text-blue-400" />
            </div>
            <h3 className="font-bold text-white text-base">Attendance Trend</h3>
          </div>
          <p className="text-xs text-gray-600 ml-10">Last 7 days · member check-ins</p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Avg / day</p>
            <p className="text-2xl font-extrabold text-white">{avg}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Peak</p>
            <p className="text-2xl font-extrabold text-orange-400">{peak}</p>
          </div>
        </div>
      </div>

      {trend.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-44 gap-3">
          <CalendarCheck className="h-10 w-10 text-gray-700" />
          <p className="text-sm text-gray-600">No attendance data yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={trend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                fontSize: 12, borderRadius: 12,
                background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
              cursor={{ fill: "rgba(249,115,22,0.08)", rx: 4, ry: 4 }}
              formatter={(v: number) => [v, "Check-ins"]}
            />
            <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={44} name="Members" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
