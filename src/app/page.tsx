import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ScenarioApp } from "@/components/ScenarioApp";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/logg-inn");
  }

  return <ScenarioApp />;
}
