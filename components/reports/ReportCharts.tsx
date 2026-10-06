"use client";

// Kept in its own file so the charting library loads after the Reports page is already usable.
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const CHART_STYLE = {
  background: "rgba(22,22,22,0.95)", border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 8, fontSize: 12, color: "#e5e7eb",
};

export function RevenueTrendChart({ data }: { data: { label: string; yosFitness: number; yosStudio: number; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={CHART_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
        <Bar dataKey="yosFitness" name="Yos Fitness" fill="#f97316" radius={[3, 3, 0, 0]} />
        <Bar dataKey="yosStudio"  name="Yos Studio"  fill="#6366f1" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({ data, colors }: { data: { status: string; count: number }[]; colors: string[] }) {
  return (
    <ResponsiveContainer width={160} height={160}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="count" nameKey="status">
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Pie>
        <Tooltip contentStyle={CHART_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ModeBarsChart({ data }: { data: { mode: string; amount: number; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="mode" tick={{ fontSize: 11, fill: "#6b7280" }} width={80} />
        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={CHART_STYLE} />
        <Bar dataKey="amount" fill="#f97316" radius={[0, 4, 4, 0]} name="Amount" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AttendanceLineChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} interval={3} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
        <Tooltip contentStyle={CHART_STYLE} />
        <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={false} name="Check-ins" />
      </LineChart>
    </ResponsiveContainer>
  );
}
