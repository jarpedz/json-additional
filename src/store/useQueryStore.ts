import { create } from "zustand";
import { supabase } from "../lib/supabase";

// new feature is query quick actione copy a query
interface QueryState {
  id: string;
  title: string;
  query: string;
  create_by: string;
}
interface QueryList {
  queryList: QueryState[];
  isError: boolean;
  isLoading: boolean;
  loadQuery: () => Promise<void>;
  addQuery: () => void;
  editQuery: (id: string) => void;
}

export const queryStore = create<QueryList>((set, get) => ({
  queryList: [],
  isError: false,
  isLoading: false,

  async loadQuery() {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from("tb_queries")
        .select("*")
        .order("create_at", { ascending: false });

      if (error) {
        console.log(error);
      }

      set({
        queryList: data as [],
      });
    } catch (error: any) {
      console.log(error);
      set({
        isError: true,
        isLoading: false,
      });
    }
  },
  addQuery() {},
  editQuery(id) {},
}));
