import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { NoteItem } from "../types/types";

interface NoteState {
  noteList: NoteItem[] | [];
  isError: boolean;
  isLoading: boolean;
  isMessage: string;
  loadNote: () => Promise<void>;
  addNote: (formData: NoteItem) => Promise<void>;
  editNote: (formData: NoteItem) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set) => ({
  noteList: [],
  isError: false,
  isLoading: false,
  isMessage: "",

  async loadNote() {
    set({ isLoading: true, noteList: [] });
    try {
      const { data, error } = await supabase
        .from("tb_note")
        .select("*")
        .order("create_at", { ascending: false });

      if (error) {
        console.log(error);
      }

      set({
        noteList: data || [],
        isLoading: false,
      });
    } catch (error: any) {
      console.log(error);
      set({
        isError: true,
        isLoading: false,
        isMessage: "Failed to load note: " + error.message,
      });
    }
  },

  async addNote(formData: NoteItem) {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from("tb_note")
        .insert(formData)
        .select("*")
        .single();

      if (error) {
        set({
          isError: true,
          isLoading: false,
          isMessage: "Failed to add note: " + error.message,
        });
      } else {
        set((state) => ({
          noteList: [data, ...state.noteList],
          isLoading: false,
          isMessage: "Note added successfully.",
        }));
      }
    } catch (error: any) {
      console.log(error);
      set({
        isError: true,
        isLoading: false,
        isMessage: "Failed to add note: " + error.message,
      });
    } finally {
      this.loadNote();
    }
  },

  async editNote(formData: NoteItem) {
    // Implement edit note functionality here
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from("tb_note")
        .update({
          note: formData.note,
          description: formData.description,
          update_by: formData.update_by,
        })
        .eq("id", formData.id);
      console.log("Edit Note Error:", error);
      
      if (error) {
        set({
          isError: true,
          isLoading: false,
          isMessage: "Failed to edit note: " + error.message,
        });
      }

      //   const currentNote = get().noteList
      set({
        isLoading: false,
        isMessage: "Note edited successfully.",
      });
    } catch (error: any) {
      console.log(error);
      set({
        isError: true,
        isLoading: false,
        isMessage: "Failed to edit note: " + error.message,
      });
    } 
  },
}));
