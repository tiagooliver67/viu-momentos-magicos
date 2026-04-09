import { useEffect, useState } from "react";
import { Search, Loader2, Shield, Ban, CheckCircle, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppRole = "user" | "photographer" | "organizer" | "super_admin";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  interest: string | null;
  created_at: string;
  roles: AppRole[];
}

const roleBadge: Record<string, string> = {
  user: "bg-secondary text-muted-foreground",
  photographer: "bg-primary/15 text-primary",
  organizer: "bg-accent/15 text-accent",
  super_admin: "bg-destructive/15 text-destructive",
};

const roleLabel: Record<string, string> = {
  user: "Usuário",
  photographer: "Fotógrafo",
  organizer: "Organizador",
  super_admin: "Super Admin",
};

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, user_id, full_name, phone, interest, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (profiles) {
      const mapped: UserProfile[] = profiles.map(p => ({
        ...p,
        roles: (roles?.filter(r => r.user_id === p.user_id).map(r => r.role as AppRole)) || [],
      }));
      setUsers(mapped);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleRole = async (userId: string, role: AppRole, hasIt: boolean) => {
    if (role === "user") return; // can't remove base role
    if (hasIt) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) { toast.error("Erro ao remover role"); return; }
      toast.success(`Role "${roleLabel[role]}" removida`);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) { toast.error("Erro ao adicionar role"); return; }
      toast.success(`Role "${roleLabel[role]}" adicionada`);
    }
    fetchUsers();
  };

  const filtered = users.filter((u) => {
    const matchSearch = (u.full_name || "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.roles.includes(roleFilter as AppRole);
    return matchSearch && matchRole;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
        <p className="text-sm text-muted-foreground">{users.length} usuários cadastrados</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[{ key: "all", label: "Todos" }, { key: "user", label: "Usuários" }, { key: "photographer", label: "Fotógrafos" }, { key: "organizer", label: "Organizadores" }, { key: "super_admin", label: "Admins" }].map(t => (
          <button key={t.key} onClick={() => setRoleFilter(t.key)} className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${roleFilter === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome..." className="bg-transparent text-sm outline-none w-full" />
        </div>
      </div>

      {/* Users list */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((user) => (
            <div key={user.id} className="glass-card overflow-hidden">
              <button
                onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {(user.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{user.full_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{user.phone || "Sem telefone"} • {new Date(user.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.map(r => (
                      <span key={r} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleBadge[r]}`}>
                        {roleLabel[r]}
                      </span>
                    ))}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedUser === user.id ? "rotate-180" : ""}`} />
                </div>
              </button>

              {expandedUser === user.id && (
                <div className="border-t border-border p-4 bg-secondary/20">
                  <p className="text-xs text-muted-foreground mb-3">Gerenciar Roles:</p>
                  <div className="flex flex-wrap gap-2">
                    {(["photographer", "organizer", "super_admin"] as AppRole[]).map(role => {
                      const has = user.roles.includes(role);
                      return (
                        <button
                          key={role}
                          onClick={() => toggleRole(user.user_id, role, has)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${has ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                        >
                          {has ? <CheckCircle className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                          {roleLabel[role]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-8 text-center text-muted-foreground">
          <p className="text-sm">Nenhum usuário encontrado</p>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
