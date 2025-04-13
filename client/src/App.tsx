import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ClientsPage from "@/pages/clients-page";
import RenewalsPage from "@/pages/renewals-page";
import ItemTypesPage from "@/pages/item-types-page";
import RemindersPage from "@/pages/reminders-page";
import UsersPage from "@/pages/users-page";
// import SettingsPage from "@/pages/settings-page"; // Removed import
import { ProtectedRoute, AdminRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/clients" component={ClientsPage} />
      <ProtectedRoute path="/renewals" component={RenewalsPage} />
      <ProtectedRoute path="/item-types" component={ItemTypesPage} />
      <ProtectedRoute path="/reminders" component={RemindersPage} />
      <AdminRoute path="/users" component={UsersPage} />
      {/* Removed settings route */}
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;