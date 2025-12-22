import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [players, programs, registrations, packages] = await Promise.all([
        supabase.from("players").select("id", { count: "exact", head: true }),
        supabase.from("programs").select("id", { count: "exact", head: true }),
        supabase.from("registrations").select("id", { count: "exact", head: true }),
        supabase.from("packages").select("id", { count: "exact", head: true }),
      ]);

      return {
        players: players.count ?? 0,
        programs: programs.count ?? 0,
        registrations: registrations.count ?? 0,
        packages: packages.count ?? 0,
      };
    },
  });
}

export function useUpcomingPrograms() {
  return useQuery({
    queryKey: ["upcoming-programs"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("programs")
        .select(`
          *,
          locations(name),
          categories(name)
        `)
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });
}

export function useRecentRegistrations() {
  return useQuery({
    queryKey: ["recent-registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select(`
          *,
          players(first_name, last_name),
          programs(name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });
}
