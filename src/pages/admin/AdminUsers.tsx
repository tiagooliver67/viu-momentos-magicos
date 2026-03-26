import { useState } from "react";
import { Search, Filter, MoreHorizontal, UserCheck, UserX, Eye, Shield, Download } from "lucide-react";

const mockUsers = [
  { id: 1, name: "Carlos Silva", email: "carlos@email.com", role: "photographer", status: "active", events: 28, revenue: "R$ 45.200", joined: "2024-03-15", lastActive: "2 min atrás" },
  { id: 2, name: "Ana Costa", email: "ana@email.com", role: "photographer", status: "active", events: 22, revenue: "R$ 38.700", joined: "2024-05-20", lastActive: "15 min atrás" },
  { id: 3, name: "João Mendes", email: "joao@email.com", role: "athlete", status: "active", events: 0, revenue: "R$ 890", joined: "2025-01-10", lastActive: "1h atrás" },
  { id: 4, name: "Maria Lima", email: "maria@email.com", role: "organizer", status: "suspended", events: 5, revenue: "R$ 12.500", joined: "2024-08-02", lastActive: "3 dias atrás" },
  { id: 5, name: "Roberto Alves", email: "roberto@email.com", role: "photographer", status: "active", events: 19, revenue: "R$ 32.000", joined: "2024-01-22", lastActive: "30 min atrás" },
  { id: 6, name: "Fernanda Reis", email: "fernanda@email.com", role: "athlete", status: "active", events: 0, revenue: "R$ 450", joined: "2025-02-14", lastActive: "5h atrás" },
  { id: 7, name: "Paulo Oliveira", email: "paulo@email.com", role: "photographer", status: "pending", events: 0, revenue: "R$ 0", joined: "2026-03-25", lastActive: "Agora" },
  { id: 8, name: "Lucia Santos", email: "lucia@email.com", role: "organizer", status: "active", events: 12, revenue: "R$ 28.900", joined: "2024-06-18", lastActive: "2h atrás" },
];

const roleColors: Record<string, string> = {
  photographer: "bg-primary/15 text-primary",
  athlete: "bg-accent/15 text-accent",
  organizer: "bg-lime/15 text-lime",
};

const statusColors: Record<string, string> = {
  active: "bg-lime/15 text-lime",
  suspended: "bg-destructive/15 text-destructive",
  pending: "bg-amber-500/15 text-amber-500",
};

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = mockUsers.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground">{mockUsers.length} usuários cadastrados</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou email..." className="bg-transparent text-sm outline-none w-full" />
        </div>
        <div className="flex gap-2">
          {["all", "photographer", "athlete", "organizer"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${roleFilter === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {r === "all" ? "Todos" : r === "photographer" ? "Fotógrafos" : r === "athlete" ? "Atletas" : "Organizadores"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-4 font-medium">Usuário</th>
              <th className="text-left p-4 font-medium hidden md:table-cell">Role</th>
              <th className="text-left p-4 font-medium hidden md:table-cell">Status</th>
              <th className="text-left p-4 font-medium hidden lg:table-cell">Eventos</th>
              <th className="text-left p-4 font-medium hidden lg:table-cell">Receita</th>
              <th className="text-left p-4 font-medium hidden xl:table-cell">Último acesso</th>
              <th className="text-right p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {user.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 hidden md:table-cell">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleColors[user.role]}`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4 hidden md:table-cell">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[user.status]}`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-4 hidden lg:table-cell">{user.events}</td>
                <td className="p-4 hidden lg:table-cell font-medium">{user.revenue}</td>
                <td className="p-4 hidden xl:table-cell text-muted-foreground">{user.lastActive}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title="Ver perfil">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title="Modo God">
                      <Shield className="w-4 h-4 text-accent" />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title="Mais">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
