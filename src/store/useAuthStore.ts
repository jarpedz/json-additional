import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// interface userLogin {
//   email: string;
//   password: string;
// }

interface AuthState {
  user: any | null;
  // role: string | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setInitialized: (initialized: boolean) => void;
  signIn: (email: string , password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setInitialized: (initialized) => set({ initialized }),
  signIn: async (email, password) => {
    set({
      loading : true
    })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error
      
      const id = data.user.id
      const { data : profile , error : profileError} = await supabase.from("tb_users").select("*").eq("id",id).single();

      if (profileError) throw profileError;

      set({
        user: profile,
        loading: false
      })
    } catch (error) {
      console.log(error);
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null});
  },
}));
