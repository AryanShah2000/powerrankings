import { prisma } from "@/lib/prisma";
import { createTeam, restoreTeam } from "@/lib/actions";
import { TeamManager } from "./team-manager";

export default async function TeamsPage() {
  const [activeTeams, archivedTeams] = await Promise.all([
    prisma.team.findMany({ where: { archived: false }, orderBy: { order: "asc" } }),
    prisma.team.findMany({ where: { archived: true }, orderBy: { name: "asc" } }),
  ]);

  async function addTeam(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "");
    const shortName = String(formData.get("shortName") ?? "");
    await createTeam(name, shortName);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Teams</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your league&rsquo;s teams. Drag to set the default display order.
        </p>
      </div>

      <form
        action={addTeam}
        className="mb-6 flex items-end gap-2 rounded-2xl border border-border-hairline bg-bg-surface p-4"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-muted">
            Team name
          </label>
          <input
            name="name"
            required
            placeholder="e.g. Gridiron Gurus"
            className="w-full rounded-lg border border-border-hairline bg-bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-muted">
            Short
          </label>
          <input
            name="shortName"
            maxLength={4}
            placeholder="GG"
            className="w-full rounded-lg border border-border-hairline bg-bg-surface-2 px-3 py-2 text-sm uppercase outline-none placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
        >
          Add
        </button>
      </form>

      {activeTeams.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-hairline p-6 text-center text-sm text-text-secondary">
          No teams yet — add your first one above.
        </p>
      ) : (
        <TeamManager key={activeTeams.map((t) => t.id).join(",")} teams={activeTeams} />
      )}

      {archivedTeams.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Archived
          </h2>
          <ul className="space-y-2">
            {archivedTeams.map((team) => (
              <li
                key={team.id}
                className="flex items-center gap-3 rounded-xl border border-border-hairline bg-bg-surface/50 px-3 py-2 opacity-70"
              >
                <span
                  className="h-7 w-7 shrink-0 rounded-full text-center text-xs font-semibold leading-7 text-white"
                  style={{ backgroundColor: team.color }}
                >
                  {team.shortName.slice(0, 2)}
                </span>
                <span className="flex-1 text-sm text-text-secondary">{team.name}</span>
                <form action={restoreTeam.bind(null, team.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-border-hairline px-2 py-1 text-xs text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary"
                  >
                    Restore
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
