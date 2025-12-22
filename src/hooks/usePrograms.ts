import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  formatProgramName,
  formatPackageName,
  generateProgramDates,
  splitWeeksIntoPackages,
} from "@/lib/programUtils";
import { addWeeks } from "date-fns";

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

export interface PackageCreationData {
  startDate: Date;
  numberOfWeeks: number;
  numberOfPackages: number;
  individualDayPrice: number;
  packagePerDayPrice: number;
  packagePriceOverride: number | null;
  maxRegistrations: number;
  startTime: string;
  endTime: string;
  levelId: string | null;
  categoryId: string | null;
  locationId: string | null;
  seasonId: string | null;
  levelName: string | null;
  categoryName: string | null;
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

export function useCreateProgramsWithPackages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PackageCreationData) => {
      const {
        startDate,
        numberOfWeeks,
        numberOfPackages,
        individualDayPrice,
        packagePerDayPrice,
        packagePriceOverride,
        maxRegistrations,
        startTime,
        endTime,
        levelId,
        categoryId,
        locationId,
        seasonId,
        levelName,
        categoryName,
      } = data;

      // Generate all program dates
      const allDates = generateProgramDates(startDate, numberOfWeeks);

      // Split weeks into packages
      const packageSplits = splitWeeksIntoPackages(numberOfWeeks, numberOfPackages);

      const createdPackages: string[] = [];
      const createdPrograms: string[] = [];

      for (const split of packageSplits) {
        const packageDates = allDates.slice(split.startWeekIndex, split.endWeekIndex + 1);
        const packageStartDate = packageDates[0];
        const packageEndDate = packageDates[packageDates.length - 1];

        // Calculate package price
        const calculatedPackagePrice = packagePerDayPrice * split.weeksCount;
        const finalPackagePrice = packagePriceOverride ?? calculatedPackagePrice;

        // Create package name
        const packageName = formatPackageName(
          packageStartDate,
          packageEndDate,
          split.weeksCount,
          startTime,
          endTime,
          levelName,
          categoryName
        );

        // Insert package
        const { data: pkg, error: pkgError } = await supabase
          .from("packages")
          .insert({
            name: packageName,
            price: finalPackagePrice,
            location_id: locationId,
          })
          .select()
          .single();

        if (pkgError) throw pkgError;
        createdPackages.push(pkg.id);

        // Create programs for this package
        for (const programDate of packageDates) {
          const programName = formatProgramName(
            programDate,
            startTime,
            endTime,
            levelName
          );

          const dateStr = programDate.toISOString().split("T")[0];

          // Insert program
          const { data: program, error: programError } = await supabase
            .from("programs")
            .insert({
              name: programName,
              date: dateStr,
              start_time: startTime,
              end_time: endTime,
              price: individualDayPrice,
              max_registrations: maxRegistrations,
              level_id: levelId,
              category_id: categoryId,
              location_id: locationId,
              season_id: seasonId,
            })
            .select()
            .single();

          if (programError) throw programError;
          createdPrograms.push(program.id);

          // Link program to package
          const { error: linkError } = await supabase
            .from("programs_packages")
            .insert({
              program_id: program.id,
              package_id: pkg.id,
            });

          if (linkError) throw linkError;
        }
      }

      return { packages: createdPackages, programs: createdPrograms };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success(
        `Created ${result.packages.length} package(s) with ${result.programs.length} programs`
      );
    },
    onError: (error) => {
      toast.error("Failed to create packages: " + error.message);
    },
  });
}
