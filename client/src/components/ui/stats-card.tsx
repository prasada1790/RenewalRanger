import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: "primary" | "success" | "warning" | "danger";
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
    label: string;
  };
}

export function StatCard({ title, value, icon, color, trend }: StatCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case "primary":
        return {
          bg: "bg-primary-50",
          text: "text-primary-500",
          trendUp: "text-green-600",
          trendDown: "text-red-600"
        };
      case "success":
        return {
          bg: "bg-green-50",
          text: "text-green-500",
          trendUp: "text-green-600",
          trendDown: "text-red-600"
        };
      case "warning":
        return {
          bg: "bg-amber-50",
          text: "text-amber-500",
          trendUp: "text-green-600",
          trendDown: "text-red-600"
        };
      case "danger":
        return {
          bg: "bg-red-50",
          text: "text-red-500",
          trendUp: "text-green-600",
          trendDown: "text-red-600"
        };
      default:
        return {
          bg: "bg-gray-50",
          text: "text-gray-500",
          trendUp: "text-green-600",
          trendDown: "text-red-600"
        };
    }
  };

  const colors = getColorClasses();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-3xl font-semibold mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg ${colors.bg} flex items-center justify-center ${colors.text}`}>
            {icon}
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center text-sm">
            {trend.direction === "up" && (
              <ArrowUpIcon className={`h-4 w-4 mr-1 ${colors.trendUp}`} />
            )}
            {trend.direction === "down" && (
              <ArrowDownIcon className={`h-4 w-4 mr-1 ${colors.trendDown}`} />
            )}
            <span
              className={
                trend.direction === "up"
                  ? colors.trendUp
                  : trend.direction === "down"
                  ? colors.trendDown
                  : "text-gray-500"
              }
            >
              {trend.value} {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
