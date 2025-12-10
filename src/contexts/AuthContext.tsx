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
    let isInitialized = false;
    let isFreshLogin = false;
    
    // Check if this is an OAuth callback (fresh login)
    const isOAuthCallback = window.location.hash.includes('access_token') || 
                            window.location.search.includes('code=') ||
                            sessionStorage.getItem('oauth_in_progress') === 'true';
    
    const initializeAuth = async () => {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (existingSession?.user) {
        // If this is a fresh OAuth callback, treat it as a new login
        if (isOAuthCallback) {
          sessionStorage.removeItem('oauth_in_progress');
          isFreshLogin = true;
          setSession(existingSession);
          setUser(existingSession.user ?? null);
          
          // Generate new session ID for this fresh login
          const newSessionId = generateSessionId();
          sessionIdRef.current = newSessionId;
          localStorage.setItem(`session_id_${existingSession.user.id}`, newSessionId);
          
          // Update session ID in database (invalidates other sessions)
          await updateSessionInDb(existingSession.user.id, newSessionId);
          
          // Handle key generation/retrieval
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("public_key, encrypted_private_key")
              .eq("id", existingSession.user.id)
              .single();

            if (profile && !profile.public_key) {
              // Generate keys for new user
              const keyPair = await generateKeyPair();
              const publicKey = await exportPublicKey(keyPair.publicKey);
              const privateKey = await exportPrivateKey(keyPair.privateKey);

              // Store private key in IndexedDB
              await storePrivateKey(existingSession.user.id, privateKey);

              // Store public key in database
              await supabase
                .from("profiles")
                .update({
                  public_key: publicKey,
                  encrypted_private_key: privateKey,
                })
                .eq("id", existingSession.user.id);
            } else if (profile?.encrypted_private_key) {
              await storePrivateKey(existingSession.user.id, profile.encrypted_private_key);
            }
          }, 0);
          
          isInitialized = true;
          setLoading(false);
          return;
        }
        
        setSession(existingSession);
        setUser(existingSession.user ?? null);
        
        // Retrieve stored session ID
        const storedSessionId = localStorage.getItem(`session_id_${existingSession.user.id}`);
        
        if (storedSessionId) {
          // We have a local session ID - validate it against DB
          sessionIdRef.current = storedSessionId;
          
          const isValid = await validateSession(existingSession.user.id, storedSessionId);
          if (!isValid) {
            // Session is invalid - another device has logged in
            localStorage.removeItem(`session_id_${existingSession.user.id}`);
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
        } else {
          // No local session ID but we have a Supabase session
          // This is a stale session without local tracking - logout
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
        }
      }
      
      isInitialized = true;
      setLoading(false);
    };

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip if we haven't initialized yet (will be handled by initializeAuth)
        if (!isInitialized && event !== "SIGNED_IN") return;
        
        // Handle fresh sign-ins
        if (event === "SIGNED_IN" && session?.user) {
          // Check if this user already has a local session ID (page refresh vs fresh login)
          const existingLocalSessionId = localStorage.getItem(`session_id_${session.user.id}`);
          
          if (existingLocalSessionId && !isFreshLogin) {
            // This is likely a page refresh or token refresh, not a fresh login
            // The session was already handled by initializeAuth
            return;
          }
          
          // This is a fresh login
          isFreshLogin = true;
          setSession(session);
          setUser(session.user ?? null);
          
          // Generate new session ID
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
          
          setLoading(false);
        } else if (event === "SIGNED_OUT") {
          isFreshLogin = false;
          setSession(null);
          setUser(null);
          setLoading(false);
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
