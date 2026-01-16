import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import logo from "@/assets/logo.png";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [incomingCount, setIncomingCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const loadCounts = async () => {
      // Count incoming requests
      const { count: incoming } = await supabase
        .from("confide_requests")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("status", "pending");

      // Count pending (outgoing) requests
      const { count: pending } = await supabase
        .from("confide_requests")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", user.id)
        .eq("status", "pending");

      setIncomingCount(incoming || 0);
      setPendingCount(pending || 0);
    };

    loadCounts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("confide_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "confide_requests",
        },
        () => {
          loadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const navItems = [
    { path: "/dashboard", icon: Shield, label: "Dashboard" },
    { path: "/encrypt", icon: Lock, label: "Encrypt" },
    { path: "/decrypt", icon: Unlock, label: "Decrypt" },
    { path: "/confides", icon: Users, label: "Confides" },
    { path: "/send-request", icon: Send, label: "Add Confide" },
    { path: "/pending-requests", icon: Clock, label: "Pending", count: pendingCount },
    { path: "/incoming-requests", icon: Inbox, label: "Incoming", count: incomingCount },
  ];

  return (
    <div className="min-h-screen bg-background">
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
                      {item.count !== undefined && item.count > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="ml-0.5 sm:ml-1 h-4 sm:h-5 min-w-4 sm:min-w-5 px-1 text-[10px] sm:text-xs"
                        >
                          {item.count}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
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

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
