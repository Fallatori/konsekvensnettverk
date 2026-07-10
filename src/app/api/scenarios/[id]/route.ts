import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getScenarioForUser, scenarioToRecomputeInput } from "@/lib/scenarios";
import { recompute } from "@/lib/calc/recompute";

/**
 * Returns the BASE scenario: hendelse + directly-hit nodes/edges only, at
 * day 1 with indirect off - read-only, no auth-write path since there's
 * nothing to mutate. The client renders its first draw straight from this.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  }

  const { id } = await params;
  const scenario = await getScenarioForUser(id, session.user.id);
  if (!scenario) {
    return NextResponse.json({ error: "Scenario ikke funnet." }, { status: 404 });
  }

  const result = recompute(
    scenarioToRecomputeInput(scenario, { indirectEnabled: false, timeframeDays: 1 }),
  );

  return NextResponse.json({ scenario: { id: scenario.id, name: scenario.name }, ...result });
}
