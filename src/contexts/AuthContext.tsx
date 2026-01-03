import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  storePrivateKey,
} from "@/lib/crypto";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const hasHandledLoginRef = useRef<boolean>(false);

  // Handle fresh login - set up keys for user
  const handleFreshLogin = async (userId: string) => {
    if (hasHandledLoginRef.current) return;
    hasHandledLoginRef.current = true;

    // Clear OAuth flag
    sessionStorage.removeItem('oauth_in_progress');
    
    // Wait a moment for the trigger to create the profile if it's a new user
    let profile = null;
    let retries = 0;
    while (retries < 5) {
      const { data } = await supabase
        .from("profiles")
        .select("public_key, encrypted_private_key")
        .eq("id", userId)
        .maybeSingle();
      
      if (data) {
        profile = data;
        break;
      }
      
      // Wait 500ms before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
      retries++;
    }

    if (profile && !profile.public_key) {
      // Generate keys for new user
      const keyPair = await generateKeyPair();
      const publicKey = await exportPublicKey(keyPair.publicKey);
      const privateKey = await exportPrivateKey(keyPair.privateKey);

      await storePrivateKey(userId, privateKey);

      await supabase
        .from("profiles")
        .update({
          public_key: publicKey,
          encrypted_private_key: privateKey,
        })
        .eq("id", userId);
    } else if (profile?.encrypted_private_key) {
      await storePrivateKey(userId, profile.encrypted_private_key);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (!existingSession?.user) {
        setLoading(false);
        return;
      }

      setSession(existingSession);
      setUser(existingSession.user);
      setLoading(false);
      
      // Handle key setup in background - don't block UI
      if (!hasHandledLoginRef.current) {
        handleFreshLogin(existingSession.user.id);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setSession(session);
          setUser(session.user);
          setLoading(false);
          
          // Handle key setup in background - don't block UI
          if (!hasHandledLoginRef.current) {
            handleFreshLogin(session.user.id);
          }
        } else if (event === "SIGNED_OUT") {
          hasHandledLoginRef.current = false;
          setSession(null);
          setUser(null);
          setLoading(false);
        } else if (event === "TOKEN_REFRESHED" && session) {
          setSession(session);
          setUser(session.user ?? null);
        }
      }
    );

    initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      hasHandledLoginRef.current = false;
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
      }
      
      setUser(null);
      setSession(null);
      navigate("/");
    } catch (err) {
      console.error("Sign out exception:", err);
      setUser(null);
      setSession(null);
      navigate("/");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
