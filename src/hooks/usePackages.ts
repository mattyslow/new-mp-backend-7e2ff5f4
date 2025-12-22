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
