import { getCurrentUser } from "@/lib/dal";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }
  return Response.json({ user });
}
