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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <img src={logo} alt="ZingerFi Logo" className="h-8 w-8 object-contain" />
              <span className="text-xl font-bold text-foreground">ZingerFi</span>
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
                      className="gap-2 relative"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden md:inline">{item.label}</span>
                      {item.count !== undefined && item.count > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="ml-1 h-5 min-w-5 px-1 text-xs"
                        >
                          {item.count}
                        </Badge>
                      )}
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
