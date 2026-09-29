import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: string;
  create_by?: string;
  create_at?: string;
  update_by?: string;
  update_at?: string;
}

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  message: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initAuthListener: () => () => void;
}

// Guard against duplicate concurrent profile syncs for the same user
let syncingUserId: string | null = null;

export const useAuthStore = create<AuthState>((set) => {
  /**
   * Fetch the tb_users profile for the session user, auto-provisioning a
   * 'support' profile on first login. Shared by all auth events so there is
   * a single source of truth for profile state.
   */
  const syncProfile = async (session: Session) => {
    const authUser = session.user;
    if (syncingUserId === authUser.id) return;
    syncingUserId = authUser.id;

    try {
      const { data: profile, error } = await supabase
        .from("tb_users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error?.code === "PGRST116") {
        // No profile exists yet — auto-provision one with the default role.
        // username is NOT NULL in the schema; derive it from the email the
        // same way the migration backfill does (part before '@').
        const { data: newProfile, error: insertError } = await supabase
          .from("tb_users")
          .insert({
            id: authUser.id,
            email: authUser.email ?? "",
            username: authUser.email?.split("@")[0] ?? authUser.id,
            role: "support",
            create_by: "system",
          })
          .select("*")
          .single();

        if (insertError) throw insertError;
        set({ user: newProfile, loading: false, initialized: true });
        return;
      }

      if (error) throw error;

      set({ user: profile, loading: false, initialized: true });
    } catch (err) {
      // Keep the current profile on transient failures (e.g. network hiccup
      // during TOKEN_REFRESHED) so a valid session is not kicked back to the
      // login screen. Only clear when we never had a profile for this user.
      const message =
        "Failed to fetch user profile: " +
        (err instanceof Error ? err.message : "unknown error");
      set((state) => ({
        user: state.user?.id === authUser.id ? state.user : null,
        loading: false,
        initialized: true,
        message,
      }));
    } finally {
      if (syncingUserId === authUser.id) syncingUserId = null;
    }
  };

  return {
    user: null,
    loading: true,
    message: null,
    initialized: false,

    // Single auth listener for the whole app (SIGNED_IN / SIGNED_OUT /
    // TOKEN_REFRESHED / INITIAL_SESSION). Replaces the duplicated listeners
    // that previously raced each other in App.tsx.
    initAuthListener: () => {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          set({ user: null, loading: false, initialized: true });
          return;
        }

        // Defer async supabase calls to avoid supabase-js callback deadlocks
        setTimeout(() => {
          void syncProfile(session);
        }, 0);
      });

      return () => {
        subscription.unsubscribe();
      };
    },

    signIn: async (email, password) => {
      set({ loading: true });
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (!data.user) throw new Error("No user data found");

        const id = data.user.id;
        const { data: profile, error: profileError } = await supabase
          .from("tb_users")
          .select("*")
          .eq("id", id)
          .single();

        if (profileError) throw profileError;

        set({
          user: profile,
          loading: false,
        });
      } catch (error) {
        set({ loading: false }); // อย่าลืมปิดโหลดเมื่อล็อกอินพัง
        throw error; // throw ออกไปให้หน้า UI แสดงแจ้งเตือนยูสเซอร์
      }
    },

    signOut: async () => {
      set({ loading: true });
      try {
        await supabase.auth.signOut();
      } finally {
        set({ user: null, loading: false });
      }
    },
  };
});
