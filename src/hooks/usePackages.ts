import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Package {
  id: string;
  name: string;
  price: number;
  location_id: string | null;
  created_at: string;
  locations?: { name: string } | null;
}

export function usePackages() {
  return useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(`
          *,
          locations(name)
        `)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Package[];
    },
  });
}

export function usePackage(id: string) {
  return useQuery({
    queryKey: ["packages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(`
          *,
          locations(name)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Package | null;
    },
    enabled: !!id,
  });
}

export function useCreatePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pkg: Omit<Package, "id" | "created_at" | "locations">) => {
      const { data, error } = await supabase
        .from("packages")
        .insert(pkg)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Package created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create package: " + error.message);
    },
  });
}

export function useUpdatePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...pkg }: Partial<Package> & { id: string }) => {
      const { data, error } = await supabase
        .from("packages")
        .update(pkg)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Package updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update package: " + error.message);
    },
  });
}

export function useDeletePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Package deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete package: " + error.message);
    },
  });
}

export function useDeletePackageWithPrograms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (packageId: string) => {
      // First get all program IDs in this package
      const { data: programLinks, error: fetchError } = await supabase
        .from("programs_packages")
        .select("program_id")
        .eq("package_id", packageId);
      
      if (fetchError) throw fetchError;
      
      const programIds = programLinks?.map(link => link.program_id) ?? [];
      
      // Delete the package (this will cascade delete programs_packages entries)
      const { error: packageError } = await supabase
        .from("packages")
        .delete()
        .eq("id", packageId);
      
      if (packageError) throw packageError;
      
      // Delete all programs that were in this package
      if (programIds.length > 0) {
        const { error: programsError } = await supabase
          .from("programs")
          .delete()
          .in("id", programIds);
        
        if (programsError) throw programsError;
      }
      
      return { deletedProgramCount: programIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success(`Package and ${result.deletedProgramCount} programs deleted successfully`);
    },
    onError: (error) => {
      toast.error("Failed to delete package and programs: " + error.message);
    },
  });
}

export function usePackagePrograms(packageId: string) {
  return useQuery({
    queryKey: ["package-programs", packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs_packages")
        .select(`
          id,
          program_id,
          programs(id, name, date)
        `)
        .eq("package_id", packageId);
      if (error) throw error;
      return data;
    },
    enabled: !!packageId,
  });
}

export function useAddProgramToPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ programId, packageId }: { programId: string; packageId: string }) => {
      const { data, error } = await supabase
        .from("programs_packages")
        .insert({ program_id: programId, package_id: packageId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["package-programs", variables.packageId] });
      toast.success("Program added to package");
    },
    onError: (error) => {
      toast.error("Failed to add program: " + error.message);
    },
  });
}

export function useRemoveProgramFromPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, packageId }: { id: string; packageId: string }) => {
      const { error } = await supabase.from("programs_packages").delete().eq("id", id);
      if (error) throw error;
      return packageId;
    },
    onSuccess: (packageId) => {
      queryClient.invalidateQueries({ queryKey: ["package-programs", packageId] });
      toast.success("Program removed from package");
    },
    onError: (error) => {
      toast.error("Failed to remove program: " + error.message);
    },
  });
}

export function usePackageRegistrationsWithPlayers(packageId: string) {
  return useQuery({
    queryKey: ["package-registrations-players", packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select(`
          id,
          player_id,
          players(id, first_name, last_name, credit)
        `)
        .eq("package_id", packageId);
      if (error) throw error;
      
      // Return unique players (a player might have multiple registrations in the package)
      const uniquePlayers = new Map<string, { id: string; first_name: string; last_name: string; credit: number }>();
      for (const reg of data ?? []) {
        if (reg.players && !uniquePlayers.has(reg.player_id)) {
          uniquePlayers.set(reg.player_id, reg.players as { id: string; first_name: string; last_name: string; credit: number });
        }
      }
      return Array.from(uniquePlayers.values());
    },
    enabled: !!packageId,
  });
}
