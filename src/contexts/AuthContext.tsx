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

  useEffect(() => {
    let isInitialLoad = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Only generate new session ID for actual new sign-ins, not page refreshes
        if (event === "SIGNED_IN" && session?.user && !isInitialLoad) {
          // This is a fresh login, not a page refresh
          const newSessionId = generateSessionId();
          sessionIdRef.current = newSessionId;
          localStorage.setItem(`session_id_${session.user.id}`, newSessionId);
          
          setTimeout(async () => {
            // Update session ID in database (invalidates other sessions)
            await updateSessionInDb(session.user.id, newSessionId);
            
            const { data: profile } = await supabase
              .from("profiles")
              .select("public_key")
              .eq("id", session.user.id)
              .single();

            if (profile && !profile.public_key) {
              // Generate keys for new user
              const keyPair = await generateKeyPair();
              const publicKey = await exportPublicKey(keyPair.publicKey);
              const privateKey = await exportPrivateKey(keyPair.privateKey);

              // Store private key in IndexedDB
              await storePrivateKey(session.user.id, privateKey);

              // Store public key in database
              await supabase
                .from("profiles")
                .update({
                  public_key: publicKey,
                  encrypted_private_key: privateKey,
                })
                .eq("id", session.user.id);
            } else if (profile && profile.public_key) {
              // User has keys, ensure private key is in IndexedDB
              const { data: profileData } = await supabase
                .from("profiles")
                .select("encrypted_private_key")
                .eq("id", session.user.id)
                .single();

              if (profileData?.encrypted_private_key) {
                await storePrivateKey(session.user.id, profileData.encrypted_private_key);
              }
            }
          }, 0);
        }

        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Retrieve stored session ID
        const storedSessionId = localStorage.getItem(`session_id_${session.user.id}`);
        
        if (storedSessionId) {
          // We have a local session ID - validate it against DB immediately
          sessionIdRef.current = storedSessionId;
          
          const isValid = await validateSession(session.user.id, storedSessionId);
          if (!isValid) {
            // Session is invalid - another device has logged in
            localStorage.removeItem(`session_id_${session.user.id}`);
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
            setLoading(false);
            isInitialLoad = false;
            return;
          }
        } else {
          // No local session ID - this browser was never logged in or was logged out
          // If DB has an active session, this browser shouldn't have access
          const { data: profile } = await supabase
            .from("profiles")
            .select("current_session_id")
            .eq("id", session.user.id)
            .single();
          
          if (profile?.current_session_id) {
            // Another device has an active session - force logout this stale session
            toast({
              title: "Session Invalid",
              description: "This session is no longer valid. Please log in again.",
              variant: "destructive",
              duration: 10000,
            });
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setLoading(false);
            isInitialLoad = false;
            return;
          }
          // No session in DB means user logged out everywhere - force logout
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setLoading(false);
          isInitialLoad = false;
          return;
        }
      }
      
      setLoading(false);
      isInitialLoad = false;
    });

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
    }, 5000); // Check every 5 seconds

    return () => clearInterval(intervalId);
  }, [user, navigate]);

  const signOut = async () => {
    try {
      const userId = user?.id;
      const localSessionId = userId ? localStorage.getItem(`session_id_${userId}`) : null;
      
      // Clear local session ID
      if (userId) {
        localStorage.removeItem(`session_id_${userId}`);
        sessionIdRef.current = null;
        
        // Only clear DB session if this browser owns it
        if (localSessionId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("current_session_id")
            .eq("id", userId)
            .single();
          
          // Only clear if we own the session (prevents clearing newer session from another device)
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
      
      // Force clear state
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
