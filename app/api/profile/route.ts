import { sanitizeProfile } from "@/lib/startupProfile";
import { getProfile, isSupabaseConfigured, saveProfile } from "@/lib/supabase";

/** The founder's startup profile, stored in Supabase so it follows them across devices. */
export async function GET() {
  const { profile, saved, updatedAt } = await getProfile();
  return Response.json({ profile, saved, updatedAt, storage: isSupabaseConfigured() ? "supabase" : "none" });
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase isn't configured, so the profile can only be kept in this browser." }, { status: 503 });
  }
  const profile = sanitizeProfile(await request.json().catch(() => null));
  const ok = await saveProfile(profile);
  if (!ok) return Response.json({ error: "Couldn't save the profile. Try again." }, { status: 502 });
  return Response.json({ profile, saved: true });
}
