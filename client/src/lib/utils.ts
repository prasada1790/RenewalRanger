
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function calculateTrendFromPreviousMonth(current: number, previous: number | undefined): { value: string; direction: "up" | "down" | "neutral"; label: string } | undefined {
  if (typeof current !== 'number' || typeof previous !== 'number') {
    return undefined;
  }

  if (previous === 0) {
    return { value: "100%", direction: "up", label: "from last month" };
  }

  const percentageChange = ((current - previous) / previous) * 100;
  const direction = percentageChange > 0 ? "up" : percentageChange < 0 ? "down" : "neutral";
  
  return {
    value: `${Math.abs(Math.round(percentageChange))}%`,
    direction,
    label: "from last month"
  };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}
