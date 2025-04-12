import { useState } from "react";
import {
  differenceInDays,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CalendarEvent {
  id: number;
  date: Date;
  title: string;
  status: "urgent" | "upcoming" | "future";
  clientId: number;
  renewableId: number;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarView({ events, onEventClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Renewal Calendar</h2>
        <div className="flex space-x-2 items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const dateFormat = "EEE";
    const weekStart = startOfWeek(currentMonth);

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center text-xs text-gray-500 font-medium">
          {format(addDays(weekStart, i), dateFormat)}
        </div>
      );
    }

    return <div className="grid grid-cols-7 gap-1">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        
        const dayEvents = events.filter(event => 
          isSameDay(event.date, cloneDay)
        );
        
        days.push(
          <div
            key={day.toString()}
            className={`calendar-cell p-1 border text-right text-xs
              ${!isSameMonth(day, monthStart) ? "text-gray-400 bg-gray-50" : "bg-white"}
            `}
          >
            {formattedDate}
            <div className="mt-1">
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => onEventClick && onEventClick(event)}
                  className={`calendar-event cursor-pointer truncate
                    ${event.status === "urgent" ? "bg-red-100 text-red-800" : ""}
                    ${event.status === "upcoming" ? "bg-amber-100 text-amber-800" : ""}
                    ${event.status === "future" ? "bg-blue-100 text-blue-800" : ""}
                  `}
                >
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="space-y-1">{rows}</div>;
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "urgent":
        return "bg-red-500";
      case "upcoming":
        return "bg-amber-500";
      case "future":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 border-b">
        {renderHeader()}
      </CardHeader>
      <CardContent className="p-3 custom-scrollbar space-y-3">
        {renderDays()}
        {renderCells()}
        <div className="mt-3 space-y-1">
          <div className="flex space-x-2 items-center">
            <div className={`w-3 h-3 rounded-full ${getStatusColorClass("urgent")}`}></div>
            <span className="text-xs text-gray-700">Urgent (0-7 days)</span>
          </div>
          <div className="flex space-x-2 items-center">
            <div className={`w-3 h-3 rounded-full ${getStatusColorClass("upcoming")}`}></div>
            <span className="text-xs text-gray-700">Upcoming (8-14 days)</span>
          </div>
          <div className="flex space-x-2 items-center">
            <div className={`w-3 h-3 rounded-full ${getStatusColorClass("future")}`}></div>
            <span className="text-xs text-gray-700">Future (15+ days)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Function to determine event status based on days until expiry
export function getEventStatus(expiryDate: Date): "urgent" | "upcoming" | "future" {
  const now = new Date();
  const daysUntil = differenceInDays(expiryDate, now);
  
  if (daysUntil <= 7) return "urgent";
  if (daysUntil <= 14) return "upcoming";
  return "future";
}
