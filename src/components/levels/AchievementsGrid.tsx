import type { Achievement } from "@/hooks/usePhotographerLevel";

export default function AchievementsGrid({ achievements }: { achievements: Achievement[] }) {
  if (!achievements.length) {
    return <p className="text-sm text-muted-foreground">Nenhuma conquista cadastrada.</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {achievements.map((a) => (
        <div
          key={a.id}
          className={`rounded-xl border p-4 text-center transition-all ${
            a.unlocked
              ? "border-primary/30 bg-primary/5"
              : "border-border bg-secondary/30 opacity-60 grayscale"
          }`}
        >
          <div className="text-3xl mb-2">{a.icon || "🏅"}</div>
          <p className="text-sm font-semibold leading-tight">{a.title}</p>
          {a.description && <p className="text-[11px] text-muted-foreground mt-1">{a.description}</p>}
          {a.unlocked && a.unlocked_at && (
            <p className="text-[10px] text-primary mt-2">
              Desbloqueada {new Date(a.unlocked_at).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}