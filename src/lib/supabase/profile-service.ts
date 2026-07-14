import type { SupabaseClient, User } from "@supabase/supabase-js";

export class NoverisProfileService {
  constructor(private readonly client: SupabaseClient | null) {}

  async ensureProfile(user: User) {
    if (!this.client) return null;
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("player_profiles")
      .upsert({
        user_id: user.id,
        updated_at: now
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
