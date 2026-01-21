import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "superadmin" | "admin" | "user";

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase
        .rpc("get_user_role", { _user_id: user.id });

      if (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
      } else {
        setRole(data as AppRole | null);
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const isSuperAdmin = role === "superadmin";
  const isAdmin = role === "admin" || role === "superadmin";

  return { role, loading, isSuperAdmin, isAdmin };
}
