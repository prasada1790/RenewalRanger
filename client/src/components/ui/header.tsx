import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Menu, Bell, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  openMobileMenu: () => void;
}

export function Header({ openMobileMenu }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  // Don't render on auth page
  if (location === "/auth") return null;

  // Get current page title based on route
  let pageTitle = "Dashboard";
  if (location === "/clients") pageTitle = "Clients";
  if (location === "/renewals") pageTitle = "Renewals";
  if (location === "/item-types") pageTitle = "Item Types";
  if (location === "/reminders") pageTitle = "Reminders";
  if (location === "/users") pageTitle = "Users";
  if (location === "/settings") pageTitle = "Settings";

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={openMobileMenu}
            className="md:hidden text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-3 md:hidden text-lg font-semibold">{pageTitle}</div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button className="relative text-gray-500 hover:text-gray-700 focus:outline-none">
              <Bell className="h-6 w-6" />
              <Badge variant="destructive" className="absolute -top-1 -right-1 min-w-[1rem] min-h-[1rem] p-0 flex items-center justify-center text-[10px]">
                3
              </Badge>
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center text-sm focus:outline-none" aria-expanded="false">
                <span className="hidden md:block mr-2 text-gray-700">{user?.fullName}</span>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                  <User className="h-4 w-4" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="cursor-pointer" onClick={() => window.location.href = "/settings"}>
                Your Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => window.location.href = "/settings"}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}