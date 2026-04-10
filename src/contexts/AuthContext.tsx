import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "user" | "photographer" | "organizer" | "super_admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: { full_name: string | null; avatar_url: string | null; asaas_wallet_id: string | null } | null;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  addRole: (role: AppRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  roles: [],
  hasRole: () => false,
  addRole: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null; asaas_wallet_id: string | null } | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);

  const fetchUserData = async (userId: string) => {
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url, asaas_wallet_id").eq("user_id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile(profileRes.data);
    if (rolesRes.data) {
      setRoles(rolesRes.data.map((r: any) => r.role as AppRole));
    }
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  const addRole = async (role: AppRole) => {
    if (!user) return;
    if (roles.includes(role)) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role });
    if (!error) {
      setRoles((prev) => [...prev, role]);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          fetchRoles(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, roles, hasRole, addRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
