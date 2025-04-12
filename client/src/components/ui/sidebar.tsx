import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ChevronRight, ChevronLeft } from "lucide-react";
import {
  BriefcaseBusiness,
  PanelsTopLeft,
  RefreshCcwDot,
  FileSliders,
  Info,
  Users,
  Settings,
  LogOut,
  PersonStanding,
} from "lucide-react";

interface SidebarProps {
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobile = false, onCloseMobile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  // Don't render if on auth page
  if (location === "/auth") return null;

  // Don't collapse on mobile
  const isCollapsed = isMobile ? false : collapsed;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    {
      name: "PanelsTopLeft",
      path: "/",
      icon: <PanelsTopLeft className="h-5 w-5" />,
      showAlways: true,
    },
    {
      name: "Clients",
      path: "/clients",
      icon: <BriefcaseBusiness className="h-5 w-5" />,
      showAlways: true,
    },
    {
      name: "Renewals",
      path: "/renewals",
      icon: <RefreshCcwDot className="h-5 w-5" />,
      showAlways: true,
    },
    {
      name: "Item Types",
      path: "/item-types",
      icon: <FileSliders className="h-5 w-5" />,
      showAlways: true,
    },
    {
      name: "Reminders",
      path: "/reminders",
      icon: <Info className="h-5 w-5" />,
      showAlways: true,
    },
    {
      name: "Users",
      path: "/users",
      icon: <Users className="h-5 w-5" />,
      showAlways: user?.role === "admin",
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <Settings className="h-5 w-5" />,
      showAlways: true,
    },
  ];

  const sidebarBaseClass = "bg-gray-800 text-white flex-shrink-0 transition-all duration-300 ease-in-out";
  const sidebarWidthClass = isCollapsed ? "w-20" : "w-64";
  const sidebarMobileClass = isMobile
    ? "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out"
    : "hidden md:block";

  return (
    <div className={`${sidebarBaseClass} ${sidebarWidthClass} ${sidebarMobileClass}`}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {!isCollapsed && <h1 className="text-xl font-semibold">Renewal Manager</h1>}
          {isMobile ? (
            <button
              className="text-gray-400 hover:text-white focus:outline-none"
              onClick={onCloseMobile}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : (
            <button
              className="text-gray-400 hover:text-white focus:outline-none"
              onClick={() => setCollapsed(!collapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-6 w-6" />
              ) : (
                <ChevronLeft className="h-6 w-6" />
              )}
            </button>
          )}
        </div>

        <div className={`p-4 border-b border-gray-700 ${isCollapsed ? "flex justify-center" : ""}`}>
          <div className={`flex ${isCollapsed ? "flex-col" : "items-center"} space-x-3`}>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <PersonStanding className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div>
                <p className="font-medium">{user?.fullName}</p>
                <p className="text-xs text-gray-400">{user?.role === "admin" ? "Administrator" : "Staff"}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="mt-4 px-2 flex-1">
          {navItems
            .filter((item) => item.showAlways)
            .map((item) => {
              const isActive = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center ${
                    isCollapsed ? "justify-center" : "space-x-3"
                  } p-3 rounded-md mb-1 ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {item.icon}
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className={`flex items-center ${
              isCollapsed ? "justify-center w-full" : "space-x-3"
            } text-gray-300 hover:text-white`}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>LogOut</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
