import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Registration {
  id: string;
  player_id: string;
  program_id: string | null;
  package_id: string | null;
  created_at: string;
  players?: { first_name: string; last_name: string; email: string | null } | null;
  programs?: { name: string; date: string } | null;
  packages?: { name: string } | null;
}

export function useRegistrations() {
  return useQuery({
    queryKey: ["registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select(`
          *,
          players(first_name, last_name, email),
          programs(name, date),
          packages(name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Registration[];
    },
  });
}

export function useCreateRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (registration: Omit<Registration, "id" | "created_at" | "players" | "programs" | "packages">) => {
      const { data, error } = await supabase
        .from("registrations")
        .insert(registration)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      toast.success("Registration created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create registration: " + error.message);
    },
  });
}

export function useBatchCreateRegistrations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (registrations: Omit<Registration, "id" | "created_at" | "players" | "programs" | "packages">[]) => {
      const { data, error } = await supabase
        .from("registrations")
        .insert(registrations)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      toast.success(`${data.length} registration${data.length > 1 ? 's' : ''} created successfully`);
    },
    onError: (error) => {
      toast.error("Failed to create registrations: " + error.message);
    },
  });
}

export function useDeleteRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("registrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      toast.success("Registration deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete registration: " + error.message);
    },
  });
}

export function usePlayerRegistrations(playerId: string) {
  return useQuery({
    queryKey: ["registrations", "player", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select(`
          *,
          programs(name, date),
          packages(name)
        `)
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });
}
