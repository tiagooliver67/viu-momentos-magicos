import { useEffect, useState } from "react";
import { Search, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  interest: string | null;
  created_at: string;
}

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, phone, interest, created_at")
        .order("created_at", { ascending: false });

      if (!error && data) setUsers(data);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const filtered = users.filter((u) =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
        <p className="text-sm text-muted-foreground">{users.length} usuários cadastrados</p>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome..." className="bg-transparent text-sm outline-none w-full" />
        </div>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-4 font-medium">Usuário</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Interesse</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Telefone</th>
                <th className="text-left p-4 font-medium hidden lg:table-cell">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {(user.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name || "Sem nome"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{user.interest || "—"}</span>
                  </td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">{user.phone || "—"}</td>
                  <td className="p-4 hidden lg:table-cell text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
