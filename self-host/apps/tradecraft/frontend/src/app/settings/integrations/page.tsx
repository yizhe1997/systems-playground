import { unstable_rethrow } from "next/navigation";
import { cookies } from "next/headers";
import { getAgentAccess, getSettings } from "@/lib/data";
import { readSession } from "@/lib/session";
import { AgentAccessCard } from "@/components/AgentAccessCard";
import { CouldNotLoad } from "@/components/Notice";

export const dynamic = "force-dynamic";

/** Settings, Integrations: what outside programs may read the journal (today, agent access). */
export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const stepUpFailed = sp.stepup === "failed";
  const session = await readSession(await cookies());
  let settings;
  let agent;
  try {
    [settings, agent] = await Promise.all([getSettings(), getAgentAccess()]);
  } catch (err) {
    unstable_rethrow(err);
    return <CouldNotLoad />;
  }
  // where an agent connects: the API's own address, as the owner's computer reaches it (docker-compose.yml)
  const mcpUrl = process.env.AGENT_MCP_URL || "http://127.0.0.1:8081/mcp";
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="title">Settings</h1>
          <p className="subtitle">Integrations. What may read your journal.</p>
        </div>
      </div>
      <div className="stack-md">
        <AgentAccessCard agent={agent} zone={settings.timeZone} stepUpAt={session?.stepUpAt ?? 0} stepUpFailed={stepUpFailed} mcpUrl={mcpUrl} />
      </div>
    </>
  );
}
