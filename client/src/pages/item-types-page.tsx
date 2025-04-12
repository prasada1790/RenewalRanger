import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertItemTypeSchema, ItemType } from "@shared/schema";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Edit,
  Trash,
  MoreHorizontal,
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
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Extend the insert schema to handle the reminder intervals as a comma-separated string
const formSchema = insertItemTypeSchema.extend({
  defaultReminderIntervalsString: z.string().optional(),
}).omit({ defaultReminderIntervals: true });

export default function ItemTypesPage() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<ItemType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Query item types
  const {
    data: itemTypes = [],
    isLoading,
    error,
  } = useQuery<ItemType[]>({
    queryKey: ["/api/item-types"],
  });

  // Get count of renewables for each type
  const {
    data: renewables = [],
  } = useQuery({
    queryKey: ["/api/renewables"],
  });

  // Create form
  const createForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      defaultRenewalPeriod: 365,
      defaultReminderIntervalsString: "30,15,7",
    },
  });

  // Edit form
  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      defaultRenewalPeriod: 365,
      defaultReminderIntervalsString: "30,15,7",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Convert the comma-separated string to an array of numbers
      const { defaultReminderIntervalsString, ...rest } = data;
      const defaultReminderIntervals = defaultReminderIntervalsString
        ? defaultReminderIntervalsString.split(",").map(item => parseInt(item.trim()))
        : [30, 15, 7];

      const itemTypeData = {
        ...rest,
        defaultReminderIntervals,
      };
      
      const res = await apiRequest("POST", "/api/item-types", itemTypeData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/item-types"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Item type created",
        description: "New renewable item type has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create item type",
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
      data: z.infer<typeof formSchema>;
    }) => {
      // Convert the comma-separated string to an array of numbers
      const { defaultReminderIntervalsString, ...rest } = data;
      const defaultReminderIntervals = defaultReminderIntervalsString
        ? defaultReminderIntervalsString.split(",").map(item => parseInt(item.trim()))
        : [30, 15, 7];

      const itemTypeData = {
        ...rest,
        defaultReminderIntervals,
      };
      
      const res = await apiRequest("PUT", `/api/item-types/${id}`, itemTypeData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/item-types"] });
      setIsEditDialogOpen(false);
      editForm.reset();
      setSelectedItemType(null);
      toast({
        title: "Item type updated",
        description: "Renewable item type has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update item type",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/item-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/item-types"] });
      setIsDeleteDialogOpen(false);
      setSelectedItemType(null);
      toast({
        title: "Item type deleted",
        description: "Renewable item type has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete item type",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate(values);
  };

  const onEditSubmit = (values: z.infer<typeof formSchema>) => {
    if (selectedItemType) {
      updateMutation.mutate({ id: selectedItemType.id, data: values });
    }
  };

  const handleEditClick = (itemType: ItemType) => {
    setSelectedItemType(itemType);
    editForm.reset({
      name: itemType.name,
      defaultRenewalPeriod: itemType.defaultRenewalPeriod,
      defaultReminderIntervalsString: Array.isArray(itemType.defaultReminderIntervals) 
        ? itemType.defaultReminderIntervals.join(", ")
        : "30, 15, 7",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (itemType: ItemType) => {
    setSelectedItemType(itemType);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedItemType) {
      deleteMutation.mutate(selectedItemType.id);
    }
  };

  // Count the number of renewables for each type
  const typeUsageCounts = itemTypes.map(type => {
    const count = renewables.filter((renewal: any) => renewal.typeId === type.id).length;
    return {
      ...type,
      usageCount: count
    };
  });

  // Filter item types based on search query
  const filteredItemTypes = typeUsageCounts.filter(itemType => 
    itemType.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <h1 className="text-2xl font-semibold text-gray-900">Item Types</h1>
              <p className="text-gray-600">Manage renewable item types and their default settings</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="flex items-center gap-1" 
                  disabled={!isAdmin}
                  title={!isAdmin ? "Only administrators can create item types" : ""}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Item Type</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Item Type</DialogTitle>
                  <DialogDescription>
                    Create a new type of renewable item with default settings.
                  </DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Domain Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="defaultRenewalPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Renewal Period (days)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              placeholder="365" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            The standard number of days before this item needs to be renewed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="defaultReminderIntervalsString"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Reminder Intervals (days)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="30, 15, 7" 
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Comma-separated days before expiry when reminders should be sent
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? "Creating..." : "Create Item Type"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search item types..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Item Types List */}
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle>Item Types</CardTitle>
              <CardDescription>
                Configure the different types of renewable items
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center">Loading item types...</div>
              ) : error ? (
                <div className="p-8 text-center text-red-500">Error loading item types</div>
              ) : filteredItemTypes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchQuery ? "No item types match your search" : "No item types found. Add your first item type!"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Renewal Period</TableHead>
                      <TableHead>Reminder Intervals</TableHead>
                      <TableHead>Items Using</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItemTypes.map((itemType) => (
                      <TableRow key={itemType.id}>
                        <TableCell className="font-medium">{itemType.name}</TableCell>
                        <TableCell>{itemType.defaultRenewalPeriod} days</TableCell>
                        <TableCell>
                          {Array.isArray(itemType.defaultReminderIntervals) 
                            ? itemType.defaultReminderIntervals.map((days, i) => (
                                <Badge key={i} variant="outline" className="mr-1 mb-1">
                                  {days} days
                                </Badge>
                              ))
                            : "Not set"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={itemType.usageCount > 0 ? "secondary" : "outline"}>
                            {itemType.usageCount} {itemType.usageCount === 1 ? "item" : "items"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" disabled={!isAdmin}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClick(itemType)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(itemType)}
                                className={itemType.usageCount > 0 ? "text-gray-400" : "text-red-600"}
                                disabled={itemType.usageCount > 0}
                              >
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

          {/* Edit Item Type Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Item Type</DialogTitle>
                <DialogDescription>
                  Update the item type configuration.
                </DialogDescription>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Domain Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="defaultRenewalPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Renewal Period (days)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            placeholder="365" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          The standard number of days before this item needs to be renewed
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="defaultReminderIntervalsString"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Reminder Intervals (days)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="30, 15, 7" 
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Comma-separated days before expiry when reminders should be sent
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Updating..." : "Update Item Type"}
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
                  This will permanently delete the item type "{selectedItemType?.name}".
                  {selectedItemType && selectedItemType.usageCount > 0 && (
                    <div className="mt-2 text-red-600">
                      This item type is currently in use by {selectedItemType.usageCount} renewable items and cannot be deleted.
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteMutation.isPending || (selectedItemType?.usageCount || 0) > 0}
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
