import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
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
  const sessionIdRef = useRef<string | null>(null);
  const hasHandledLoginRef = useRef<boolean>(false);

  // Generate a unique session identifier
  const generateSessionId = () => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  };

  // Store session ID and update in database
  const updateSessionInDb = async (userId: string, sessionId: string) => {
    await supabase
      .from("profiles")
      .update({ current_session_id: sessionId })
      .eq("id", userId);
  };

  // Validate current session against stored session
  const validateSession = async (userId: string, currentSessionId: string): Promise<boolean> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_session_id")
      .eq("id", userId)
      .single();

    return profile?.current_session_id === currentSessionId;
  };

  // Handle fresh login - generate new session and update DB
  const handleFreshLogin = async (userId: string) => {
    if (hasHandledLoginRef.current) return;
    hasHandledLoginRef.current = true;

    const newSessionId = generateSessionId();
    sessionIdRef.current = newSessionId;
    localStorage.setItem(`session_id_${userId}`, newSessionId);
    
    // Update DB - this invalidates all other sessions
    await updateSessionInDb(userId, newSessionId);
    
    // Clear OAuth flag
    sessionStorage.removeItem('oauth_in_progress');
    
    // Handle key generation/retrieval
    const { data: profile } = await supabase
      .from("profiles")
      .select("public_key, encrypted_private_key")
      .eq("id", userId)
      .single();

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
    let isInitialized = false;
    
    // Check if this looks like an OAuth callback
    const isOAuthCallback = sessionStorage.getItem('oauth_in_progress') === 'true';
    
    const initializeAuth = async () => {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (!existingSession?.user) {
        isInitialized = true;
        setLoading(false);
        return;
      }

      const userId = existingSession.user.id;
      const storedSessionId = localStorage.getItem(`session_id_${userId}`);
      
      // Case 1: We have a local session ID - this is a page refresh or returning user
      if (storedSessionId) {
        sessionIdRef.current = storedSessionId;
        
        const isValid = await validateSession(userId, storedSessionId);
        if (isValid) {
          // Session is valid, restore state
          setSession(existingSession);
          setUser(existingSession.user);
        } else {
          // Session was invalidated by login from another device
          localStorage.removeItem(`session_id_${userId}`);
          sessionIdRef.current = null;
          toast({
            title: "Session Expired",
            description: "You have been logged out because you logged in from another device or browser.",
            variant: "destructive",
            duration: 10000,
          });
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
        }
      }
      // Case 2: No local session ID but OAuth in progress - this is a fresh login callback
      else if (isOAuthCallback) {
        setSession(existingSession);
        setUser(existingSession.user);
        await handleFreshLogin(userId);
      }
      // Case 3: No local session ID and no OAuth flag - stale session, logout
      else {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
      }
      
      isInitialized = true;
      setLoading(false);
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const userId = session.user.id;
          const existingLocalSessionId = localStorage.getItem(`session_id_${userId}`);
          
          // Only handle as fresh login if no local session exists and login wasn't already handled
          if (!existingLocalSessionId && !hasHandledLoginRef.current) {
            setSession(session);
            setUser(session.user);
            await handleFreshLogin(userId);
            setLoading(false);
          } else if (existingLocalSessionId && isInitialized) {
            // Token refresh - just update state
            setSession(session);
            setUser(session.user);
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

  // Periodic session validation
  useEffect(() => {
    if (!user || !sessionIdRef.current) return;

    const intervalId = setInterval(async () => {
      if (user && sessionIdRef.current) {
        const isValid = await validateSession(user.id, sessionIdRef.current);
        if (!isValid) {
          toast({
            title: "Session Expired",
            description: "You have been logged out because you logged in from another device or browser.",
            variant: "destructive",
            duration: 10000,
          });
          await supabase.auth.signOut();
          navigate("/");
        }
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [user, navigate]);

  const signOut = async () => {
    try {
      const userId = user?.id;
      const localSessionId = userId ? localStorage.getItem(`session_id_${userId}`) : null;
      
      if (userId) {
        localStorage.removeItem(`session_id_${userId}`);
        sessionIdRef.current = null;
        hasHandledLoginRef.current = false;
        
        // Only clear DB session if this browser owns it
        if (localSessionId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("current_session_id")
            .eq("id", userId)
            .single();
          
          if (profile?.current_session_id === localSessionId) {
            await supabase
              .from("profiles")
              .update({ current_session_id: null })
              .eq("id", userId);
          }
        }
      }
      
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