import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getScenarioForUser, scenarioToRecomputeInput } from "@/lib/scenarios";
import { recompute } from "@/lib/calc/recompute";
import { recomputeRequestSchema } from "@/lib/validation";

/**
 * Stateless what-if recompute: merges the request body's overrides onto the
 * scenario's base data IN MEMORY and returns the fully computed result.
 * Nothing is written to the database - every user's exploration is just a
 * different request against the same immutable base data + fixed catalog.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  }

  const { id } = await params;
  const scenario = await getScenarioForUser(id, session.user.id);
  if (!scenario) {
    return NextResponse.json({ error: "Scenario ikke funnet." }, { status: 404 });
  }

  const parsed = recomputeRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ugyldig forespørsel.", issues: parsed.error.issues }, { status: 400 });
  }

  const result = recompute(
    scenarioToRecomputeInput(scenario, {
      indirectEnabled: parsed.data.indirectEnabled,
      timeframeDays: parsed.data.timeframeDays,
      overrides: parsed.data.overrides,
    }),
  );

  return NextResponse.json(result);
}
