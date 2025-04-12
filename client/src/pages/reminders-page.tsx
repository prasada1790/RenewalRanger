import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Eye,
  RefreshCw,
  Mail
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function RemindersPage() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [renewableFilter, setRenewableFilter] = useState('all');
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Query all renewables to populate filter
  const {
    data: renewables = [],
    isLoading: renewablesLoading,
  } = useQuery({
    queryKey: ["/api/renewables"],
  });

  // Query reminder logs
  const renewableId = renewableFilter !== 'all' ? parseInt(renewableFilter) : null;
  const { 
    data: reminderLogs = [], 
    isLoading: logsLoading,
    error: logsError
  } = useQuery({
    queryKey: [
      renewableId 
        ? `/api/reminder-logs/${renewableId}` 
        : '/api/reminder-logs/all'
    ],
    // If there's no specific API, we'll just show a message
    enabled: renewableId !== null,
  });

  // Query to get clients and item types for display
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Trigger reminders manually (admin only)
  const triggerRemindersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/trigger-reminders", {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reminders triggered",
        description: "Reminder check has been manually triggered.",
      });
      
      if (renewableId) {
        queryClient.invalidateQueries({ queryKey: [`/api/reminder-logs/${renewableId}`] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to trigger reminders",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enhanced renewables with client names for the dropdown
  const enhancedRenewables = renewables.map((renewable: any) => {
    const client = clients.find((client: any) => client.id === renewable.clientId);
    return {
      ...renewable,
      clientName: client?.name || "Unknown Client"
    };
  });

  // Enhanced reminder logs with sender and recipient names
  const enhancedLogs = reminderLogs.map((log: any) => {
    const renewable = renewables.find((r: any) => r.id === log.renewableId);
    const client = clients.find((c: any) => c.id === renewable?.clientId);
    const sentTo = users.find((u: any) => u.id === log.sentToId);

    return {
      ...log,
      renewableName: renewable?.name || "Unknown Item",
      clientName: client?.name || "Unknown Client",
      sentToName: sentTo?.fullName || "Unknown User",
      sentAtFormatted: format(new Date(log.sentAt), "MMM d, yyyy h:mm a")
    };
  });

  // Filter logs based on search query
  const filteredLogs = enhancedLogs.filter((log: any) => 
    log.renewableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.sentToName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.emailSentTo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewLog = (log: any) => {
    setSelectedLog(log);
    setIsViewDialogOpen(true);
  };

  const handleTriggerReminders = () => {
    triggerRemindersMutation.mutate();
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Reminders</h1>
              <p className="text-gray-600">View and manage reminder history</p>
            </div>
            {isAdmin && (
              <Button 
                className="flex items-center gap-1"
                onClick={handleTriggerReminders}
                disabled={triggerRemindersMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 ${triggerRemindersMutation.isPending ? 'animate-spin' : ''}`} />
                <span>{triggerRemindersMutation.isPending ? 'Processing...' : 'Trigger Reminders'}</span>
              </Button>
            )}
          </div>

          {/* Search and Filter bar */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search reminder logs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-72">
              <Select
                value={renewableFilter}
                onValueChange={setRenewableFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by renewable item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Renewables</SelectItem>
                  {renewablesLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : enhancedRenewables.length === 0 ? (
                    <SelectItem value="none" disabled>No renewables found</SelectItem>
                  ) : (
                    enhancedRenewables.map((renewable: any) => (
                      <SelectItem key={renewable.id} value={renewable.id.toString()}>
                        {renewable.name} ({renewable.clientName})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reminder Logs List */}
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle>Reminder History</CardTitle>
              <CardDescription>
                View sent reminders and their details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renewableFilter === 'all' ? (
                <div className="p-8 text-center">
                  <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a renewable item</h3>
                  <p className="text-gray-500">
                    Choose a renewable item from the dropdown above to view its reminder history.
                  </p>
                </div>
              ) : logsLoading ? (
                <div className="p-8 text-center">Loading reminder logs...</div>
              ) : logsError ? (
                <div className="p-8 text-center text-red-500">Error loading reminder logs</div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchQuery ? "No logs match your search" : "No reminder logs found for this item"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date Sent</TableHead>
                      <TableHead>Renewable Item</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Days Before Expiry</TableHead>
                      <TableHead>Sent To</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.sentAtFormatted}</TableCell>
                        <TableCell className="font-medium">{log.renewableName}</TableCell>
                        <TableCell>{log.clientName}</TableCell>
                        <TableCell>{log.daysBeforeExpiry} days</TableCell>
                        <TableCell>{log.sentToName} ({log.emailSentTo})</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 flex items-center gap-1"
                            onClick={() => handleViewLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only md:not-sr-only">View</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* View Email Content Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Email Reminder Details</DialogTitle>
                <DialogDescription>
                  {selectedLog && `Sent on ${selectedLog.sentAtFormatted}`}
                </DialogDescription>
              </DialogHeader>
              
              {selectedLog && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Item</p>
                      <p className="text-sm">{selectedLog.renewableName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Client</p>
                      <p className="text-sm">{selectedLog.clientName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Sent To</p>
                      <p className="text-sm">{selectedLog.sentToName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email Address</p>
                      <p className="text-sm">{selectedLog.emailSentTo}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Days Before Expiry</p>
                      <p className="text-sm">{selectedLog.daysBeforeExpiry} days</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Email Content</p>
                    <Card>
                      <CardContent className="p-4">
                        <div className="max-h-96 overflow-y-auto border rounded-md p-4" dangerouslySetInnerHTML={{ __html: selectedLog.emailContent }} />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
