import React, { createContext, useContext, useEffect, useState } from "react";
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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === "SIGNED_IN" && session?.user) {
          // Check if user has keys, if not generate them
          setTimeout(async () => {
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

              // Store public key in database (encrypted private key stored as encrypted in DB)
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
