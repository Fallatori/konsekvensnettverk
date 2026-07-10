import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listScenariosForUser } from "@/lib/scenarios";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  }

  const scenarios = await listScenariosForUser(session.user.id);
  return NextResponse.json({ scenarios });
}
