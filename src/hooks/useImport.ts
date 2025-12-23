import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseCSV, parsePrice, parseMultipleValues, parseDateTimeFromItem, normalizeForMatching } from '@/lib/csvParser';
import { toast } from '@/hooks/use-toast';

export interface RawDataRow {
  id: string;
  name: string;
  price: number;
  programIds: string[];
  level: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  isPackage: boolean;
}

export interface ColumnMapping {
  programId: string;   // ProgramID column - single or comma-separated
  name: string;        // Item column - program/package name
  price: string;       // Price column
  category: string;    // Category column
  dayTime: string;     // Day/Time column
  level: string;       // Level column
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
    const programIdRaw = row[mapping.programId] || '';
    // Split by comma to detect if it's a package (multiple IDs)
    const ids = programIdRaw.split(',').map(id => id.trim()).filter(id => id);
    const isPackage = ids.length > 1;
    
    const itemName = row[mapping.name] || '';
    const category = row[mapping.category] || '';
    const level = row[mapping.level] || '';
    const price = parsePrice(row[mapping.price]);
    
    // For programs, parse date/time from the Item column
    // For packages, we don't need date/time
    let date = '';
    let startTime = '00:00:00';
    let endTime = '00:00:00';
    
    if (!isPackage) {
      // Parse date and time from Item column format like "Wednesday 1/28 | 9:00am - 10:30am"
      const parsed = parseDateTimeFromItem(itemName);
      date = parsed.date;
      startTime = parsed.startTime;
      endTime = parsed.endTime;
    }
    
    return {
      id: ids[0] || '', // First ID is the main identifier
      name: itemName,
      price,
      programIds: isPackage ? ids : [], // For packages, store all IDs to link later
      level,
      category,
      date,
      startTime,
      endTime,
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
      categoryMap,
      seasonId 
    }: { 
      data: RawDataRow[]; 
      locationId: string;
      levelMap: Record<string, string>;
      categoryMap: Record<string, string>;
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
        category_id: categoryMap[p.category] || null,
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
      const batchSize = 10;
      let updated = 0;
      
      // Process in parallel batches of 10 to avoid overwhelming the API
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        const results = await Promise.all(
          batch.map(row =>
            supabase
              .from('programs')
              .update({ max_registrations: row.maxRegistrations })
              .eq('original_id', row.originalId)
          )
        );
        
        updated += results.filter(r => !r.error).length;
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
      const batchSize = 10;
      
      // Pre-fetch all reference data in parallel
      const [programsResult, packagesResult, programPackagesResult, existingPlayersResult] = await Promise.all([
        supabase.from('programs').select('id, name, original_id'),
        supabase.from('packages').select('id, name, original_id'),
        supabase.from('programs_packages').select('package_id, program_id'),
        supabase.from('players').select('id, email'),
      ]);
      
      const programs = programsResult.data || [];
      const packages = packagesResult.data || [];
      const programPackages = programPackagesResult.data || [];
      const existingPlayers = existingPlayersResult.data || [];
      
      // Create lookup maps using normalized keys for robust matching
      const programByName: Record<string, string> = {};
      const programByOriginalId: Record<string, string> = {};
      programs.forEach(p => {
        programByName[normalizeForMatching(p.name)] = p.id;
        if (p.original_id) programByOriginalId[p.original_id.toLowerCase()] = p.id;
      });
      
      const packageByName: Record<string, { id: string; programIds: string[] }> = {};
      const packageByOriginalId: Record<string, { id: string; programIds: string[] }> = {};
      packages.forEach(pkg => {
        const linkedPrograms = programPackages
          .filter(pp => pp.package_id === pkg.id)
          .map(pp => pp.program_id);
        const pkgData = { id: pkg.id, programIds: linkedPrograms };
        packageByName[normalizeForMatching(pkg.name)] = pkgData;
        if (pkg.original_id) packageByOriginalId[pkg.original_id.toLowerCase()] = pkgData;
      });
      
      // Create player email lookup
      const playerByEmail: Map<string, string> = new Map();
      existingPlayers.forEach(p => {
        if (p.email) playerByEmail.set(p.email.toLowerCase(), p.id);
      });
      
      // Step 1: Identify new players to create (unique emails only)
      const newPlayersToCreate: Array<{ firstName: string; lastName: string; email: string | null; phone: string | null; rowIndex: number }> = [];
      const seenEmails = new Set<string>();
      
      data.forEach((row, index) => {
        if (row.email) {
          const emailLower = row.email.toLowerCase();
          if (!playerByEmail.has(emailLower) && !seenEmails.has(emailLower)) {
            seenEmails.add(emailLower);
            newPlayersToCreate.push({
              firstName: row.firstName,
              lastName: row.lastName,
              email: row.email,
              phone: row.phone || null,
              rowIndex: index,
            });
          }
        } else {
          // No email - always create new player
          newPlayersToCreate.push({
            firstName: row.firstName,
            lastName: row.lastName,
            email: null,
            phone: row.phone || null,
            rowIndex: index,
          });
        }
      });
      
      // Step 2: Batch create new players
      let playersCreated = 0;
      const errors: string[] = [];
      
      for (let i = 0; i < newPlayersToCreate.length; i += batchSize) {
        const batch = newPlayersToCreate.slice(i, i + batchSize);
        
        const results = await Promise.all(
          batch.map(async (p) => {
            const { data: newPlayer, error } = await supabase
              .from('players')
              .insert({
                first_name: p.firstName,
                last_name: p.lastName,
                email: p.email,
                phone: p.phone,
              })
              .select('id, email')
              .single();
            
            if (error) {
              return { success: false, error: `Failed to create player ${p.firstName} ${p.lastName}: ${error.message}` };
            }
            return { success: true, player: newPlayer };
          })
        );
        
        results.forEach(r => {
          if (r.success && r.player) {
            playersCreated++;
            if (r.player.email) {
              playerByEmail.set(r.player.email.toLowerCase(), r.player.id);
            }
          } else if (!r.success && r.error) {
            errors.push(r.error);
          }
        });
      }
      
      // Step 3: Build all registrations
      const registrationsToCreate: Array<{ player_id: string; program_id: string | null; package_id: string | null }> = [];
      
      for (const row of data) {
        let playerId: string | undefined;
        
        if (row.email) {
          playerId = playerByEmail.get(row.email.toLowerCase());
        }
        
        if (!playerId) {
          // Skip if we couldn't find/create the player
          continue;
        }
        
        for (const regString of row.registrations) {
          const regNormalized = normalizeForMatching(regString);
          const regLower = regString.toLowerCase().trim();
          
          // Check if it's a package (try normalized name first, then original_id)
          let pkg = packageByName[regNormalized] || packageByOriginalId[regLower];
          if (pkg) {
            for (const programId of pkg.programIds) {
              registrationsToCreate.push({
                player_id: playerId,
                program_id: programId,
                package_id: pkg.id,
              });
            }
            continue;
          }
          
          // Check if it's a program (try normalized name first, then original_id)
          let programId = programByName[regNormalized] || programByOriginalId[regLower];
          if (programId) {
            registrationsToCreate.push({
              player_id: playerId,
              program_id: programId,
              package_id: null,
            });
            continue;
          }
          
          errors.push(`Unmatched registration: "${regString}" for ${row.firstName} ${row.lastName}`);
        }
      }
      
      // Step 4: Batch create registrations
      let registrationsCreated = 0;
      
      for (let i = 0; i < registrationsToCreate.length; i += batchSize) {
        const batch = registrationsToCreate.slice(i, i + batchSize);
        
        const results = await Promise.all(
          batch.map(reg => supabase.from('registrations').insert(reg))
        );
        
        registrationsCreated += results.filter(r => !r.error).length;
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
