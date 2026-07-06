import { create } from "zustand";
import { supabase } from "../lib/supabase";

// new feature is query quick actione copy a query
interface QueryState {
  id: string;
  title: string;
  query: string;
  hos_use: string;
  query_type: string;
  create_by: string;
  create_at: string;
}
interface QueryList {
  queryList: QueryState[] | [];
  isError: boolean;
  isLoading: boolean;
  loadQuery: () => Promise<void>;
  addQuery: () => void;
  editQuery: (id: string) => void;
}

export const useQueryStore = create<QueryList>((set) => ({
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
        queryList: data || [],
        isLoading: false,
      });
    } catch (error: any) {
      console.log(error);
      set({
        isError: true,
        isLoading: false,
      });
    }
  },
  async addQuery() {

  },
  editQuery() {

  },
}));
