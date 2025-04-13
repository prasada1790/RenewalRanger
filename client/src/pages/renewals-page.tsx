import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRenewableSchema, Renewable } from "@shared/schema";
import { format, differenceInDays } from "date-fns";
import { z } from "zod";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Edit,
  Trash,
  CalendarIcon,
  MoreHorizontal,
  Filter,
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function RenewalsPage() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRenewal, setSelectedRenewal] = useState<Renewable | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  // Query renewables
  const {
    data: renewables = [],
    isLoading: renewablesLoading,
  } = useQuery<Renewable[]>({
    queryKey: ["/api/renewables"],
  });

  // Query clients for the dropdown
  const {
    data: clients = [],
    isLoading: clientsLoading,
  } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Query item types for the dropdown
  const {
    data: itemTypes = [],
    isLoading: itemTypesLoading,
  } = useQuery({
    queryKey: ["/api/item-types"],
  });

  // Query users (staff) for the dropdown
  const {
    data: users = [],
    isLoading: usersLoading,
  } = useQuery({
    queryKey: ["/api/users"],
  });

  // Create form
  const createForm = useForm<z.infer<typeof insertRenewableSchema>>({
    resolver: zodResolver(insertRenewableSchema),
    defaultValues: {
      name: "",
      clientId: 0,
      typeId: 0,
      assignedToId: 0,
      startDate: new Date(),
      endDate: new Date(),
      amount: 0,
      reminderIntervals: [30, 15, 7],
      notes: "",
      status: "active",
    },
  });

  // Edit form
  const editForm = useForm<z.infer<typeof insertRenewableSchema>>({
    resolver: zodResolver(insertRenewableSchema),
    defaultValues: {
      name: "",
      clientId: 0,
      typeId: 0,
      assignedToId: 0,
      startDate: new Date(),
      endDate: new Date(),
      amount: 0,
      reminderIntervals: [30, 15, 7],
      notes: "",
      status: "active",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertRenewableSchema>) => {
      const res = await apiRequest("POST", "/api/renewables", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/renewables"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Renewal created",
        description: "New renewable item has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create renewable item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: z.infer<typeof insertRenewableSchema>;
    }) => {
      const res = await apiRequest("PUT", `/api/renewables/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/renewables"] });
      setIsEditDialogOpen(false);
      editForm.reset();
      setSelectedRenewal(null);
      toast({
        title: "Renewal updated",
        description: "Renewable item has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update renewable item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/renewables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/renewables"] });
      setIsDeleteDialogOpen(false);
      setSelectedRenewal(null);
      toast({
        title: "Renewal deleted",
        description: "Renewable item has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete renewable item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Apply item type defaults when type is selected
  useEffect(() => {
    const typeId = createForm.watch("typeId");
    if (typeId && itemTypes) {
      const selectedType = itemTypes.find((type: any) => type.id === Number(typeId));
      if (selectedType) {
        // Set default reminder intervals from the selected item type
        createForm.setValue("reminderIntervals", selectedType.defaultReminderIntervals);
        
        // Set default end date based on the start date and default renewal period
        const startDate = createForm.watch("startDate");
        if (startDate && selectedType.defaultRenewalPeriod) {
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + selectedType.defaultRenewalPeriod);
          createForm.setValue("endDate", endDate);
        }
      }
    }
  }, [createForm.watch("typeId"), itemTypes]);

  const onCreateSubmit = (values: z.infer<typeof insertRenewableSchema>) => {
    createMutation.mutate(values);
  };

  const onEditSubmit = (values: z.infer<typeof insertRenewableSchema>) => {
    if (selectedRenewal) {
      updateMutation.mutate({ id: selectedRenewal.id, data: values });
    }
  };

  const handleEditClick = (renewal: Renewable) => {
    setSelectedRenewal(renewal);
    const startDate = new Date(renewal.startDate);
    const endDate = new Date(renewal.endDate);
    
    editForm.reset({
      name: renewal.name,
      clientId: renewal.clientId,
      typeId: renewal.typeId,
      assignedToId: renewal.assignedToId || 0,
      startDate,
      endDate,
      amount: renewal.amount || 0,
      reminderIntervals: renewal.reminderIntervals || [30, 15, 7],
      notes: renewal.notes || "",
      status: renewal.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (renewal: Renewable) => {
    setSelectedRenewal(renewal);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRenewal) {
      deleteMutation.mutate(selectedRenewal.id);
    }
  };

  // Get client, type, and user names for display
  const enhancedRenewables = renewables.map(renewal => {
    const client = clients.find((client: any) => client.id === renewal.clientId);
    const itemType = itemTypes.find((type: any) => type.id === renewal.typeId);
    const assignedTo = users.find((user: any) => user.id === renewal.assignedToId);
    
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
      startDateFormatted: format(new Date(renewal.startDate), "MMM d, yyyy"),
      endDateFormatted: format(new Date(renewal.endDate), "MMM d, yyyy"),
      daysLeft,
      statusText,
      statusClass
    };
  });

  // Filter renewables based on search query and status filter
  const filteredRenewables = enhancedRenewables.filter(renewal => {
    const matchesSearch = 
      renewal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      renewal.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      renewal.typeName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'expired' && renewal.daysLeft <= 0) ||
      (statusFilter === 'upcoming' && renewal.daysLeft > 0 && renewal.daysLeft <= 30) ||
      (statusFilter === 'active' && renewal.status === 'active');
    
    return matchesSearch && matchesStatus;
  });

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
              <h1 className="text-2xl font-semibold text-gray-900">Renewals</h1>
              <p className="text-gray-600">Manage client renewable items</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  <span>Add Renewal</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Renewable Item</DialogTitle>
                  <DialogDescription>
                    Create a new renewable item for a client.
                  </DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. example.com Domain" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(Number(value))}
                              defaultValue={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select client" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clientsLoading ? (
                                  <SelectItem value="loading">Loading...</SelectItem>
                                ) : clients.length === 0 ? (
                                  <SelectItem value="none" disabled>No clients available</SelectItem>
                                ) : (
                                  clients.map((client: any) => (
                                    <SelectItem key={client.id} value={client.id.toString()}>
                                      {client.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="typeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Type</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(Number(value))}
                              defaultValue={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {itemTypesLoading ? (
                                  <SelectItem value="loading">Loading...</SelectItem>
                                ) : itemTypes.length === 0 ? (
                                  <SelectItem value="none" disabled>No item types available</SelectItem>
                                ) : (
                                  itemTypes.map((type: any) => (
                                    <SelectItem key={type.id} value={type.id.toString()}>
                                      {type.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={createForm.control}
                      name="assignedToId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned To</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(Number(value))}
                            defaultValue={field.value ? field.value.toString() : ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select staff member" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">Unassigned</SelectItem>
                              {usersLoading ? (
                                <SelectItem value="loading">Loading...</SelectItem>
                              ) : users.length === 0 ? (
                                <SelectItem value="none" disabled>No users available</SelectItem>
                              ) : (
                                users.map((user: any) => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.fullName}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g. 100.00" 
                              {...field} 
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Start Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={`pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date < new Date("1900-01-01")
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>End Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={`pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date < new Date("1900-01-01")
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={createForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Additional information" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? "Creating..." : "Create Renewal"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filter bar */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search renewals..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Renewals</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="upcoming">Upcoming (30 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Renewals List */}
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle>Renewals</CardTitle>
              <CardDescription>
                {filteredRenewables.length} {filteredRenewables.length === 1 ? "item" : "items"} found
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renewablesLoading ? (
                <div className="p-8 text-center">Loading renewals...</div>
              ) : filteredRenewables.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchQuery || statusFilter !== 'all' ? "No renewals match your search/filter" : "No renewals found. Add your first renewal!"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRenewables.map((renewal) => (
                      <TableRow key={renewal.id}>
                        <TableCell className="font-medium">{renewal.name}</TableCell>
                        <TableCell>{renewal.clientName}</TableCell>
                        <TableCell>{renewal.typeName}</TableCell>
                        <TableCell>{renewal.startDateFormatted}</TableCell>
                        <TableCell>{renewal.endDateFormatted}</TableCell>
                        <TableCell>{renewal.amount ? `$${renewal.amount.toFixed(2)}` : '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={renewal.statusClass}>
                            {renewal.statusText}
                          </Badge>
                        </TableCell>
                        <TableCell>{renewal.assignedToName}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClick(renewal)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteClick(renewal)}>
                                <Trash className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Edit Renewal Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Renewable Item</DialogTitle>
                <DialogDescription>
                  Update information for this renewable item.
                </DialogDescription>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. example.com Domain" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(Number(value))}
                            defaultValue={field.value.toString()}
                            value={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clientsLoading ? (
                                <SelectItem value="loading">Loading...</SelectItem>
                              ) : clients.length === 0 ? (
                                <SelectItem value="none" disabled>No clients available</SelectItem>
                              ) : (
                                clients.map((client: any) => (
                                  <SelectItem key={client.id} value={client.id.toString()}>
                                    {client.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="typeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Type</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(Number(value))}
                            defaultValue={field.value.toString()}
                            value={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {itemTypesLoading ? (
                                <SelectItem value="loading">Loading...</SelectItem>
                              ) : itemTypes.length === 0 ? (
                                <SelectItem value="none" disabled>No item types available</SelectItem>
                              ) : (
                                itemTypes.map((type: any) => (
                                  <SelectItem key={type.id} value={type.id.toString()}>
                                    {type.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={editForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g. 100.00" 
                            {...field} 
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="assignedToId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned To</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(Number(value))}
                          defaultValue={field.value ? field.value.toString() : "0"}
                          value={field.value ? field.value.toString() : "0"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select staff member" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Unassigned</SelectItem>
                            {usersLoading ? (
                              <SelectItem value="loading">Loading...</SelectItem>
                            ) : users.length === 0 ? (
                              <SelectItem value="none" disabled>No users available</SelectItem>
                            ) : (
                              users.map((user: any) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.fullName}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={editForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="renewed">Renewed</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional information" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Updating..." : "Update Renewal"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the renewal item "{selectedRenewal?.name}". This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  );
}
