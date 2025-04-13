import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Profile update schema
const profileFormSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
});

// Password change schema
const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Email notifications schema
const notificationsFormSchema = z.object({
  reminderEmails: z.boolean().default(true),
  expiryWarnings: z.boolean().default(true),
  systemUpdates: z.boolean().default(false),
  defaultCurrency: z.string().default("USD"), // Added default currency
});

export default function SettingsPage() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useToast();
  const { user } = useAuth();

  // Profile form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
    },
  });

  // Password form
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Notifications form
  const notificationsForm = useForm<z.infer<typeof notificationsFormSchema>>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      reminderEmails: true,
      expiryWarnings: true,
      systemUpdates: false,
      defaultCurrency: "USD", // Added default currency
    },
  });

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileFormSchema>) => {
      const res = await apiRequest("PUT", `/api/users/profile`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Password change mutation
  const passwordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordFormSchema>) => {
      const res = await apiRequest("PUT", `/api/users/password`, data);
      return await res.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Notifications update mutation
  const notificationsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof notificationsFormSchema>) => {
      const res = await apiRequest("PUT", `/api/users/notifications`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Notification preferences saved",
        description: "Your notification settings have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update notification settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onProfileSubmit(data: z.infer<typeof profileFormSchema>) {
    profileMutation.mutate(data);
  }

  function onPasswordSubmit(data: z.infer<typeof passwordFormSchema>) {
    passwordMutation.mutate(data);
  }

  function onNotificationsSubmit(data: z.infer<typeof notificationsFormSchema>) {
    notificationsMutation.mutate(data);
  }

  // Set initial form values
  React.useEffect(() => {
    if (user?.settings?.defaultCurrency) {
      notificationsForm.setValue('defaultCurrency', user.settings.defaultCurrency);
    } else {
      notificationsForm.setValue('defaultCurrency', 'INR');
    }
  }, [user]);

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
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account settings and preferences</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Tabs 
              defaultValue="profile" 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="grid w-full md:w-auto grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your personal information and email address
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form 
                        onSubmit={profileForm.handleSubmit(onProfileSubmit)} 
                        className="space-y-6"
                      >
                        <FormField
                          control={profileForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="Your email address" {...field} />
                              </FormControl>
                              <FormDescription>
                                This email will be used for notifications and reminders.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="pt-4">
                          <Button 
                            type="submit" 
                            disabled={profileMutation.isPending}
                          >
                            {profileMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Password Tab */}
              <TabsContent value="password">
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                      Update your password to maintain account security
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...passwordForm}>
                      <form 
                        onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} 
                        className="space-y-6"
                      >
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Your current password" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Create a new password" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Password must be at least 8 characters long.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Confirm your new password" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="pt-4">
                          <Button 
                            type="submit" 
                            disabled={passwordMutation.isPending}
                          >
                            {passwordMutation.isPending ? "Updating..." : "Update Password"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Configure which notifications you want to receive
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...notificationsForm}>
                      <form 
                        onSubmit={notificationsForm.handleSubmit(onNotificationsSubmit)} 
                        className="space-y-6"
                      >
                        <div className="space-y-4">
                          <FormField
                            control={notificationsForm.control}
                            name="reminderEmails"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-3 rounded-lg border">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Reminder Emails</FormLabel>
                                  <FormDescription>
                                    Receive email notifications for upcoming renewals.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={notificationsForm.control}
                            name="expiryWarnings"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-3 rounded-lg border">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Expiry Warnings</FormLabel>
                                  <FormDescription>
                                    Receive urgent notifications when items are about to expire.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={notificationsForm.control}
                            name="systemUpdates"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-3 rounded-lg border">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">System Updates</FormLabel>
                                  <FormDescription>
                                    Receive notifications about system changes and updates.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="pt-4">
                          <Button 
                            type="submit" 
                            disabled={notificationsMutation.isPending}
                          >
                            {notificationsMutation.isPending ? "Saving..." : "Save Preferences"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Currency Settings</CardTitle>
                    <CardDescription>Choose your default currency for the application</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={notificationsForm.control}
                      name="defaultCurrency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INR">INR (₹)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-gray-200">
                  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">Username</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.username || '-'}</dd>
                  </div>
                  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">Role</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 capitalize">{user?.role || '-'}</dd>
                  </div>
                  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">Account created</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </dd>
                  </div>
                </dl>
              </CardContent>
              <CardFooter className="bg-gray-50 border-t rounded-b-lg">
                <p className="text-xs text-gray-500">
                  For security reasons, some account details can only be changed by an administrator.
                </p>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}