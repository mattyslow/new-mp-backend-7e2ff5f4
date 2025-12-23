import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseCSV, parsePrice, parseMultipleValues, parseTime, parseDate } from '@/lib/csvParser';
import { toast } from '@/hooks/use-toast';

export interface RawDataRow {
  id: string;
  name: string;
  price: number;
  programIds: string[];
  level: string;
  date: string;
  startTime: string;
  endTime: string;
  isPackage: boolean;
}

export interface ColumnMapping {
  id: string;
  name: string;
  price: string;
  programIds: string;
  level: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface FormResponseRow {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  registrations: string[];
}

export interface FormResponseMapping {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  registrations: string;
}

export interface ProgramsCapacityRow {
  originalId: string;
  maxRegistrations: number;
}

export interface ProgramsCapacityMapping {
  id: string;
  maxRegistrations: string;
}

export function parseRawData(csvText: string, mapping: ColumnMapping): RawDataRow[] {
  const { rows } = parseCSV(csvText);
  
  return rows.map(row => {
    const programIdsRaw = row[mapping.programIds] || '';
    const programIds = parseMultipleValues(programIdsRaw);
    const isPackage = programIds.length > 1;
    
    return {
      id: row[mapping.id] || '',
      name: row[mapping.name] || '',
      price: parsePrice(row[mapping.price]),
      programIds: isPackage ? programIds : [],
      level: row[mapping.level] || '',
      date: parseDate(row[mapping.date]),
      startTime: parseTime(row[mapping.startTime]),
      endTime: parseTime(row[mapping.endTime]),
      isPackage,
    };
  }).filter(row => row.id && row.name);
}

export function parseFormResponses(csvText: string, mapping: FormResponseMapping): FormResponseRow[] {
  const { rows } = parseCSV(csvText);
  
  return rows.map(row => ({
    firstName: row[mapping.firstName] || '',
    lastName: row[mapping.lastName] || '',
    email: row[mapping.email] || '',
    phone: row[mapping.phone] || '',
    registrations: parseMultipleValues(row[mapping.registrations]),
  })).filter(row => row.firstName && row.lastName);
}

export function parseProgramsCapacity(csvText: string, mapping: ProgramsCapacityMapping): ProgramsCapacityRow[] {
  const { rows } = parseCSV(csvText);
  
  return rows.map(row => ({
    originalId: row[mapping.id] || '',
    maxRegistrations: parseInt(row[mapping.maxRegistrations]) || 0,
  })).filter(row => row.originalId);
}

export function useImportRawData() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      data, 
      locationId, 
      levelMap, 
      seasonId 
    }: { 
      data: RawDataRow[]; 
      locationId: string;
      levelMap: Record<string, string>;
      seasonId: string | null;
    }) => {
      const programs = data.filter(d => !d.isPackage);
      const packages = data.filter(d => d.isPackage);
      
      // Insert programs
      const programInserts = programs.map(p => ({
        original_id: p.id,
        name: p.name,
        price: p.price,
        date: p.date,
        start_time: p.startTime,
        end_time: p.endTime,
        location_id: locationId,
        level_id: levelMap[p.level] || null,
        season_id: seasonId,
        max_registrations: 0,
      }));
      
      const { data: insertedPrograms, error: programError } = await supabase
        .from('programs')
        .insert(programInserts)
        .select('id, original_id');
      
      if (programError) throw programError;
      
      // Create map of original_id to new id
      const programIdMap: Record<string, string> = {};
      insertedPrograms?.forEach(p => {
        if (p.original_id) programIdMap[p.original_id] = p.id;
      });
      
      // Insert packages
      const packageInserts = packages.map(p => ({
        original_id: p.id,
        name: p.name,
        price: p.price,
        location_id: locationId,
      }));
      
      const { data: insertedPackages, error: packageError } = await supabase
        .from('packages')
        .insert(packageInserts)
        .select('id, original_id');
      
      if (packageError) throw packageError;
      
      // Create package to programs links
      const packageIdMap: Record<string, string> = {};
      insertedPackages?.forEach(p => {
        if (p.original_id) packageIdMap[p.original_id] = p.id;
      });
      
      // Link packages to programs
      const programPackageLinks: { package_id: string; program_id: string }[] = [];
      packages.forEach(pkg => {
        const packageId = packageIdMap[pkg.id];
        if (packageId) {
          pkg.programIds.forEach(progOrigId => {
            const programId = programIdMap[progOrigId];
            if (programId) {
              programPackageLinks.push({
                package_id: packageId,
                program_id: programId,
              });
            }
          });
        }
      });
      
      if (programPackageLinks.length > 0) {
        const { error: linkError } = await supabase
          .from('programs_packages')
          .insert(programPackageLinks);
        
        if (linkError) throw linkError;
      }
      
      return {
        programsCreated: programs.length,
        packagesCreated: packages.length,
        linksCreated: programPackageLinks.length,
        programIdMap,
        packageIdMap,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast({
        title: 'Raw Data Imported',
        description: `Created ${result.programsCreated} programs, ${result.packagesCreated} packages`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useImportProgramsCapacity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ProgramsCapacityRow[]) => {
      let updated = 0;
      
      for (const row of data) {
        const { error } = await supabase
          .from('programs')
          .update({ max_registrations: row.maxRegistrations })
          .eq('original_id', row.originalId);
        
        if (!error) updated++;
      }
      
      return { updated };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast({
        title: 'Capacity Updated',
        description: `Updated ${result.updated} programs`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useImportFormResponses() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: FormResponseRow[]) => {
      // Get all programs and packages for matching
      const { data: programs } = await supabase
        .from('programs')
        .select('id, name, original_id');
      
      const { data: packages } = await supabase
        .from('packages')
        .select('id, name, original_id');
      
      const { data: programPackages } = await supabase
        .from('programs_packages')
        .select('package_id, program_id');
      
      // Create lookup maps
      const programByName: Record<string, string> = {};
      programs?.forEach(p => {
        programByName[p.name.toLowerCase()] = p.id;
      });
      
      const packageByName: Record<string, { id: string; programIds: string[] }> = {};
      packages?.forEach(pkg => {
        const linkedPrograms = programPackages
          ?.filter(pp => pp.package_id === pkg.id)
          .map(pp => pp.program_id) || [];
        packageByName[pkg.name.toLowerCase()] = {
          id: pkg.id,
          programIds: linkedPrograms,
        };
      });
      
      let playersCreated = 0;
      let registrationsCreated = 0;
      const errors: string[] = [];
      
      for (const row of data) {
        // Check if player exists by email
        let playerId: string;
        
        if (row.email) {
          const { data: existingPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('email', row.email)
            .maybeSingle();
          
          if (existingPlayer) {
            playerId = existingPlayer.id;
          } else {
            const { data: newPlayer, error: playerError } = await supabase
              .from('players')
              .insert({
                first_name: row.firstName,
                last_name: row.lastName,
                email: row.email,
                phone: row.phone,
              })
              .select('id')
              .single();
            
            if (playerError) {
              errors.push(`Failed to create player ${row.firstName} ${row.lastName}: ${playerError.message}`);
              continue;
            }
            playerId = newPlayer.id;
            playersCreated++;
          }
        } else {
          // No email, create new player
          const { data: newPlayer, error: playerError } = await supabase
            .from('players')
            .insert({
              first_name: row.firstName,
              last_name: row.lastName,
              email: row.email || null,
              phone: row.phone || null,
            })
            .select('id')
            .single();
          
          if (playerError) {
            errors.push(`Failed to create player ${row.firstName} ${row.lastName}: ${playerError.message}`);
            continue;
          }
          playerId = newPlayer.id;
          playersCreated++;
        }
        
        // Process registrations
        for (const regString of row.registrations) {
          const regLower = regString.toLowerCase();
          
          // Check if it's a package
          const pkg = packageByName[regLower];
          if (pkg) {
            // Create registrations for each program in the package
            for (const programId of pkg.programIds) {
              const { error: regError } = await supabase
                .from('registrations')
                .insert({
                  player_id: playerId,
                  program_id: programId,
                  package_id: pkg.id,
                });
              
              if (!regError) registrationsCreated++;
            }
            continue;
          }
          
          // Check if it's a program
          const programId = programByName[regLower];
          if (programId) {
            const { error: regError } = await supabase
              .from('registrations')
              .insert({
                player_id: playerId,
                program_id: programId,
                package_id: null,
              });
            
            if (!regError) registrationsCreated++;
            continue;
          }
          
          errors.push(`Unmatched registration: "${regString}" for ${row.firstName} ${row.lastName}`);
        }
      }
      
      return { playersCreated, registrationsCreated, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast({
        title: 'Form Responses Imported',
        description: `Created ${result.playersCreated} players, ${result.registrationsCreated} registrations`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
