import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Program {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  price: number;
  max_registrations: number;
  level_id: string | null;
  category_id: string | null;
  location_id: string | null;
  season_id: string | null;
  created_at: string;
  levels?: { name: string } | null;
  categories?: { name: string } | null;
  locations?: { name: string } | null;
  seasons?: { name: string } | null;
}

export function usePrograms() {
  return useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select(`
          *,
          levels(name),
          categories(name),
          locations(name),
          seasons(name)
        `)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Program[];
    },
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: ["programs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select(`
          *,
          levels(name),
          categories(name),
          locations(name),
          seasons(name)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Program | null;
    },
    enabled: !!id,
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (program: Omit<Program, "id" | "created_at" | "levels" | "categories" | "locations" | "seasons">) => {
      const { data, error } = await supabase
        .from("programs")
        .insert(program)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create program: " + error.message);
    },
  });
}

export function useUpdateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...program }: Partial<Program> & { id: string }) => {
      const { data, error } = await supabase
        .from("programs")
        .update(program)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update program: " + error.message);
    },
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete program: " + error.message);
    },
  });
}
