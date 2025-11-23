import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Lock,
  Unlock,
  Users,
  Send,
  Inbox,
  Clock,
  LogOut,
  Shield,
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut, user } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: "/", icon: Shield, label: "Dashboard" },
    { path: "/encrypt", icon: Lock, label: "Encrypt" },
    { path: "/decrypt", icon: Unlock, label: "Decrypt" },
    { path: "/confides", icon: Users, label: "Confides" },
    { path: "/send-request", icon: Send, label: "Send Request" },
    { path: "/pending-requests", icon: Clock, label: "Pending" },
    { path: "/incoming-requests", icon: Inbox, label: "Incoming" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">Zinger</span>
            </Link>

            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden md:inline">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground hidden md:inline">
                {user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
