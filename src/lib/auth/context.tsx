"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Stabilize the supabase client in a ref so it never changes between renders
  const supabaseRef = useRef(createClient());

  const refreshUser = async () => {
    const supabase = supabaseRef.current;
    const { data: { session }, error } = await supabase.auth.getSession()
    if (!error && session) {
      console.log('Auth Context - Refreshed user data:', {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name,
        user_metadata: session.user.user_metadata
      })
      setUser(session.user)
    } else {
      setUser(null)
    }
  }

  useEffect(() => {
    const supabase = supabaseRef.current;

    // Get initial session immediately
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (!error && session) {
        console.log('Auth Context - Initial user data:', {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name,
          user_metadata: session.user.user_metadata
        })
        setUser(session.user)
      } else {
        setUser(null)
      }
      setIsLoading(false)
    }

    // Get initial session first
    getInitialSession()

    // Then listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth Context - Auth state change:', event, {
          user_id: session?.user?.id,
          email: session?.user?.email,
          full_name: session?.user?.user_metadata?.full_name
        })
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}