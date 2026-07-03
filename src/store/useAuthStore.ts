import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthState {
  user: any | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: any | null) => void; // ปรับเป็น any เผื่อรองรับ profileData จากตาราง tb_users
  setInitialized: (initialized: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initAuthListener: () => () => void; // 🌟 เพิ่มฟังก์ชันสำหรับเปิดระบบดักฟัง Session
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setInitialized: (initialized) => set({ initialized }),

  // 🌟 ฟังก์ชันดักฟังเหตุการณ์ Auth (จับเคส Session หมดอายุ / Token Expired)
  initAuthListener: () => {
    // ดักฟังทุกลักษณะเหตุการณ์ (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth Event Triggered: ${event}`);

        // เคสที่ 1: ไม่มี Session แล้ว (เช่น หมดอายุ หรือ โดนสั่งเตะออก)
        if (!session) {
          set({ user: null, loading: false, initialized: true });
          return;
        }

        // เคสที่ 2: มีการรีเฟรช Token หรือ ล็อกอินใหม่ ให้คอยดึงข้อมูล Profile ล่าสุด
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          try {
            const { data: profile, error } = await supabase
              .from("tb_users")
              .select("*")
              .eq("id", session.user.id)
              .single();

            if (error) throw error;
            set({ user: profile, loading: false, initialized: true });
          } catch (err) {
            console.error("Error fetching profile on auth change:", err);
            set({ user: null, loading: false, initialized: true });
          }
        }
      }
    );

    // ส่งฟังก์ชัน unsubscribe คืนกลับไปเผื่อใช้เคลียร์หน่วยความจำใน useEffect
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
    } catch (error: any) {
      console.error("Login failed:", error.message);
      set({ loading: false }); // อย่าลืมปิดโหลดเมื่อล็อกอินพัง
      throw error; // throw ออกไปให้หน้า UI แสดงแจ้งเตือนยูสเซอร์
    }
  },

  signOut: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    set({ user: null, loading: false });
  },
}));