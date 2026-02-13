import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

import {
  Lock,
  Unlock,
  Users,
  Send,
  LogOut,
  Shield,
  Settings,
  MessageSquare,
} from "lucide-react";
import logo from "@/assets/logo.png";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut, user } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const location = useLocation();


  const navItems = [
    { path: "/fast-dashboard", icon: Shield, label: "Dashboard" },
    { path: "/encrypt", icon: Lock, label: "Encrypt" },
    { path: "/decrypt", icon: Unlock, label: "Decrypt" },
    { path: "/fast-encrypt", icon: Users, label: "Confides" },
    { path: "/fast-encrypt", icon: Send, label: "Add Confide" },
    { path: "/feedback", icon: MessageSquare, label: "Feedback" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
            <Link to="/" className="flex items-center space-x-2 shrink-0">
              <img src={logo} alt="ZingerFi Logo" className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 object-contain" />
              <span className="text-lg sm:text-xl font-bold text-foreground">ZingerFi</span>
            </Link>

            <div className="flex items-center flex-wrap justify-center gap-0.5 sm:gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className="gap-1 sm:gap-2 relative px-2 sm:px-3 h-8 sm:h-9"
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden lg:inline">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {isSuperAdmin && (
                <Link to="/admin">
                  <Button
                    variant={location.pathname.startsWith("/admin") ? "default" : "outline"}
                    size="sm"
                    className="gap-1 sm:gap-2 text-xs sm:text-sm"
                  >
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                </Link>
              )}
              <span className="text-xs sm:text-sm text-muted-foreground hidden md:inline truncate max-w-32 lg:max-w-none">
                {user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={signOut} className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 flex-1">{children}</main>

      <footer className="border-t border-border bg-card mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-muted-foreground space-y-1">
          <p className="text-sm">&copy; 2025 ZingerFi. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/privacy-policy" className="text-sm hover:text-primary transition-colors underline">
              Privacy Policy
            </Link>
            <span className="text-muted-foreground/50">|</span>
            <Link to="/terms-of-service" className="text-sm hover:text-primary transition-colors underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
