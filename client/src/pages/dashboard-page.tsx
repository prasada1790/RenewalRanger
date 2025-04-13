import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BriefcaseBusiness, 
  RefreshCcwDot, 
  Clock, 
  AlertCircle, 
  Check, 
  Plus, 
  AlertTriangle,
  Diff,
  Ban
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stats-card";
import { CalendarView, getEventStatus } from "@/components/ui/calendar-view";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const { toast } = useToast();

  // Query dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  // Query upcoming renewals
  const { data: upcomingRenewals, isLoading: renewalsLoading } = useQuery({
    queryKey: ["/api/renewables/upcoming/30"],
  });

  // Get clients for joining with renewals data
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Get item types for joining with renewals data
  const { data: itemTypes } = useQuery({
    queryKey: ["/api/item-types"],
  });

  // Get users (staff) for joining with renewals data
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  // Transform the renewals data to include client and item type names
  const processedRenewals = upcomingRenewals?.map((renewal: any) => {
    const client = clients?.find((c: any) => c.id === renewal.clientId);
    const itemType = itemTypes?.find((t: any) => t.id === renewal.typeId);
    const assignedTo = users?.find((u: any) => u.id === renewal.assignedToId);

    const now = new Date();
    const endDate = new Date(renewal.endDate);
    const daysLeft = differenceInDays(endDate, now);

    let statusText = "";
    let statusClass = "";

    if (daysLeft <= 0) {
      statusText = "Expired";
      statusClass = "bg-red-100 text-red-800";
    } else if (daysLeft <= 7) {
      statusText = `Urgent (${daysLeft} day${daysLeft === 1 ? '' : 's'})`;
      statusClass = "bg-red-100 text-red-800";
    } else if (daysLeft <= 14) {
      statusText = `In ${daysLeft} days`;
      statusClass = "bg-amber-100 text-amber-800";
    } else {
      statusText = `In ${daysLeft} days`;
      statusClass = "bg-blue-100 text-blue-800";
    }

    return {
      ...renewal,
      clientName: client?.name || "Unknown Client",
      typeName: itemType?.name || "Unknown Type",
      assignedToName: assignedTo?.fullName || "Unassigned",
      endDateFormatted: format(endDate, "MMM d, yyyy"),
      daysLeft,
      statusText,
      statusClass
    };
  }) || [];

  // Prepare calendar data
  const calendarEvents = processedRenewals.map((renewal: any) => ({
    id: renewal.id,
    date: new Date(renewal.endDate),
    title: renewal.name,
    status: getEventStatus(new Date(renewal.endDate)),
    clientId: renewal.clientId,
    renewableId: renewal.id
  }));

  // Get recent activity from reminder logs
  const { data: reminderLogs = [] } = useQuery({
    queryKey: ["/api/reminder-logs/recent"],
  });

  const recentActivity = reminderLogs.map(log => ({
    type: "reminder",
    message: `Reminder sent for ${log.renewableName}`,
    time: format(new Date(log.sentAt), 'PP'),
    icon: <Check className="h-5 w-5 text-green-500" />
  }));


  // Calculate real distribution data
  // Query all renewables
  const { data: renewables = [] } = useQuery({
    queryKey: ["/api/renewables"],
  });

  const distributionData = itemTypes?.map((type, index) => {
    const typeRenewables = renewables.filter((r: any) => r.typeId === type.id);
    const percentage = renewables.length ? Math.round((typeRenewables.length / renewables.length) * 100) : 0;
    
    const colors = ["bg-primary", "bg-green-500", "bg-amber-500", "bg-red-500", "bg-purple-500"];
    return {
      name: type.name,
      percentage,
      color: colors[index % colors.length]
    };
  }) || [];

  const handleCalendarEventClick = (event: any) => {
    toast({
      title: "Renewal Selected",
      description: `${event.title} expiring on ${format(event.date, "MMM d, yyyy")}`,
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar (hidden by default) */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-gray-800 bg-opacity-75" onClick={() => setShowMobileSidebar(false)}></div>
          <Sidebar isMobile={true} onCloseMobile={() => setShowMobileSidebar(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header openMobileMenu={() => setShowMobileSidebar(true)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50 custom-scrollbar">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Overview of your renewal management system</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statsLoading ? (
              <>
                <Card>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-1/3 mb-2" />
                    <Skeleton className="h-10 w-1/4 mb-4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-1/3 mb-2" />
                    <Skeleton className="h-10 w-1/4 mb-4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-1/3 mb-2" />
                    <Skeleton className="h-10 w-1/4 mb-4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-1/3 mb-2" />
                    <Skeleton className="h-10 w-1/4 mb-4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <StatCard
                  title="Total Clients"
                  value={stats?.clientCount || 0}
                  icon={<BriefcaseBusiness className="h-5 w-5" />}
                  color="primary"
                  trend={calculateTrendFromPreviousMonth(stats?.clientCount, stats?.previousMonthStats?.clientCount)}
                />
                <StatCard
                  title="Active Renewals"
                  value={stats?.activeRenewablesCount || 0}
                  icon={<RefreshCcwDot className="h-5 w-5" />}
                  color="success"
                  trend={calculateTrendFromPreviousMonth(stats?.activeRenewablesCount, stats?.previousMonthStats?.activeRenewablesCount)}
                />
                <StatCard
                  title="Upcoming Renewals"
                  value={stats?.upcomingRenewablesCount || 0}
                  icon={<Clock className="h-5 w-5" />}
                  color="warning"
                  trend={{ value: "", direction: "neutral", label: "Due this month" }}
                />
                <StatCard
                  title="Expired Items"
                  value={stats?.expiredRenewablesCount || 0}
                  icon={<AlertCircle className="h-5 w-5" />}
                  color="danger"
                  trend={{ value: "", direction: "neutral", label: "Requires attention" }}
                />
              </>
            )}
          </div>

          {/* Recent Renewals & Calendar Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Renewals Table */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-medium">Upcoming Renewals</CardTitle>
                  <Button variant="link" className="p-0" onClick={() => window.location.href = "/renewals"}>
                    View All
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto custom-scrollbar">
                    {renewalsLoading ? (
                      <div className="p-6 space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {processedRenewals.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                No upcoming renewals found
                              </td>
                            </tr>
                          ) : (
                            processedRenewals.slice(0, 5).map((renewal: any) => (
                              <tr key={renewal.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{renewal.clientName}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{renewal.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">{renewal.typeName}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">{renewal.endDateFormatted}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant="outline" className={renewal.statusClass}>
                                    {renewal.statusText}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {renewal.assignedToName}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mini Calendar with Due Dates */}
            <div>
              <CalendarView 
                events={calendarEvents}
                onEventClick={handleCalendarEventClick}
              />
            </div>
          </div>

          {/* Recent Activity and Client Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ul className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <li key={index} className="flex space-x-3">
                      {activity.icon}
                      <div>
                        <p className="text-sm text-gray-700">{activity.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Renewal Type Distribution */}
            <Card>
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-lg font-medium">Renewal Distribution by Type</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-col space-y-3">
                  {distributionData.map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                        <span className="text-sm text-gray-500">{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Button variant="link" onClick={() => window.location.href = "/renewals"}>
                    View Detailed Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}