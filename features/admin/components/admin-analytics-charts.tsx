"use client";

import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {useLocale, useTranslations} from "next-intl";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {formatMoney, type SupportedCurrency} from "@/lib/money";
import {type AdminAnalyticsChartPoint} from "@/features/admin/types";

type AdminAnalyticsChartsProps = {
  bookingVolumeByType: AdminAnalyticsChartPoint[];
  currency: SupportedCurrency;
  revenueByDay: AdminAnalyticsChartPoint[];
};

const pieColors = ["#91543e", "#d8a55a", "#4b7f8a", "#687d51", "#4f5a70", "#a96d66"];

export function AdminAnalyticsCharts({
  bookingVolumeByType,
  currency,
  revenueByDay
}: AdminAnalyticsChartsProps) {
  const locale = useLocale();
  const t = useTranslations("Admin.dashboard.charts");

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="border-[#e8e0d0] bg-white shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-[28px] italic text-[#1c3d2e]">
            Product mix
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Pie
                data={bookingVolumeByType.filter((item) => item.value > 0)}
                dataKey="value"
                nameKey="label"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={3}
              >
                {bookingVolumeByType.map((entry, index) => (
                  <Cell key={entry.label} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-[#e8e0d0] bg-white shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-[28px] italic text-[#1c3d2e]">
            Revenue over the last 30 days
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueByDay}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
              <YAxis
                tickFormatter={(value) =>
                  formatMoney(
                    {
                      amountMinor: Number(value),
                      currency
                    },
                    locale
                  )
                }
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value) =>
                  formatMoney(
                    {
                      amountMinor: Number(value),
                      currency
                    },
                    locale
                  )
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#c9a84c"
                strokeWidth={3}
                dot={{fill: "#c9a84c", r: 3}}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
