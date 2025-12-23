import { useState, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2 } from 'lucide-react';
import { parseCSV } from '@/lib/csvParser';
import { 
  parseRawData, 
  parseFormResponses, 
  parseProgramsCapacity,
  useImportRawData, 
  useImportProgramsCapacity, 
  useImportFormResponses,
  ColumnMapping,
  FormResponseMapping,
  ProgramsCapacityMapping,
  RawDataRow,
  FormResponseRow,
  ProgramsCapacityRow,
} from '@/hooks/useImport';
import { useReferenceData, useCreateReferenceItem } from '@/hooks/useReferenceData';

type ImportStep = 'raw-data' | 'programs-capacity' | 'form-responses';

export default function Import() {
  const [activeStep, setActiveStep] = useState<ImportStep>('raw-data');
  const [completedSteps, setCompletedSteps] = useState<ImportStep[]>([]);
  
  // Raw Data state
  const [rawDataFile, setRawDataFile] = useState<File | null>(null);
  const [rawDataHeaders, setRawDataHeaders] = useState<string[]>([]);
  const [rawDataParsed, setRawDataParsed] = useState<RawDataRow[]>([]);
  const [rawDataMapping, setRawDataMapping] = useState<ColumnMapping>({
    programId: '', name: '', price: '', category: '', dayTime: '', level: ''
  });
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  
  // Programs Capacity state
  const [capacityFile, setCapacityFile] = useState<File | null>(null);
  const [capacityHeaders, setCapacityHeaders] = useState<string[]>([]);
  const [capacityParsed, setCapacityParsed] = useState<ProgramsCapacityRow[]>([]);
  const [capacityMapping, setCapacityMapping] = useState<ProgramsCapacityMapping>({ id: '', maxRegistrations: '' });
  
  // Form Responses state
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formHeaders, setFormHeaders] = useState<string[]>([]);
  const [formParsed, setFormParsed] = useState<FormResponseRow[]>([]);
  const [formMapping, setFormMapping] = useState<FormResponseMapping>({
    firstName: '', lastName: '', email: '', phone: '', registrations: ''
  });
  
  // Import results
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
  // Hooks
  const { data: locations } = useReferenceData('locations');
  const { data: levels } = useReferenceData('levels');
  const { data: categories } = useReferenceData('categories');
  const { data: seasons } = useReferenceData('seasons');
  const createLevel = useCreateReferenceItem('levels');
  const createCategory = useCreateReferenceItem('categories');
  const importRawData = useImportRawData();
  const importCapacity = useImportProgramsCapacity();
  const importFormResponses = useImportFormResponses();

  const handleFileUpload = useCallback(async (
    file: File,
    setFile: (f: File) => void,
    setHeaders: (h: string[]) => void
  ) => {
    setFile(file);
    const text = await file.text();
    const { headers } = parseCSV(text);
    // Filter out empty headers to prevent Select.Item error
    setHeaders(headers.filter(h => h.trim() !== ''));
  }, []);

  const handleRawDataParse = async () => {
    if (!rawDataFile) return;
    const text = await rawDataFile.text();
    const parsed = parseRawData(text, rawDataMapping);
    setRawDataParsed(parsed);
  };

  const handleCapacityParse = async () => {
    if (!capacityFile) return;
    const text = await capacityFile.text();
    const parsed = parseProgramsCapacity(text, capacityMapping);
    setCapacityParsed(parsed);
  };

  const handleFormParse = async () => {
    if (!formFile) return;
    const text = await formFile.text();
    const parsed = parseFormResponses(text, formMapping);
    setFormParsed(parsed);
  };

  const handleRawDataImport = async () => {
    if (!selectedLocation) return;
    
    // Create level map - create missing levels first
    const uniqueLevels = [...new Set(rawDataParsed.map(r => r.level).filter(l => l))];
    const levelMap: Record<string, string> = {};
    
    for (const levelName of uniqueLevels) {
      const existing = levels?.find(l => l.name.toLowerCase() === levelName.toLowerCase());
      if (existing) {
        levelMap[levelName] = existing.id;
      } else {
        // Create new level
        await createLevel.mutateAsync(levelName);
        const { data: newLevel } = await import('@/integrations/supabase/client').then(m => 
          m.supabase.from('levels').select('id').eq('name', levelName).single()
        );
        if (newLevel) levelMap[levelName] = newLevel.id;
      }
    }
    
    // Create category map - create missing categories first
    const uniqueCategories = [...new Set(rawDataParsed.map(r => r.category).filter(c => c))];
    const categoryMap: Record<string, string> = {};
    
    for (const categoryName of uniqueCategories) {
      const existing = categories?.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      if (existing) {
        categoryMap[categoryName] = existing.id;
      } else {
        // Create new category
        await createCategory.mutateAsync(categoryName);
        const { data: newCategory } = await import('@/integrations/supabase/client').then(m => 
          m.supabase.from('categories').select('id').eq('name', categoryName).single()
        );
        if (newCategory) categoryMap[categoryName] = newCategory.id;
      }
    }
    
    await importRawData.mutateAsync({
      data: rawDataParsed,
      locationId: selectedLocation,
      levelMap,
      categoryMap,
      seasonId: selectedSeason || null,
    });
    
    setCompletedSteps(prev => [...prev, 'raw-data']);
    setActiveStep('programs-capacity');
  };

  const handleCapacityImport = async () => {
    await importCapacity.mutateAsync(capacityParsed);
    setCompletedSteps(prev => [...prev, 'programs-capacity']);
    setActiveStep('form-responses');
  };

  const handleFormImport = async () => {
    const result = await importFormResponses.mutateAsync(formParsed);
    if (result.errors.length > 0) {
      setImportErrors(result.errors);
    }
    setCompletedSteps(prev => [...prev, 'form-responses']);
  };

  const renderStepBadge = (step: ImportStep, label: string) => {
    const isCompleted = completedSteps.includes(step);
    const isActive = activeStep === step;
    
    return (
      <Badge 
        variant={isCompleted ? 'default' : isActive ? 'secondary' : 'outline'}
        className="cursor-pointer"
        onClick={() => setActiveStep(step)}
      >
        {isCompleted && <Check className="w-3 h-3 mr-1" />}
        {label}
      </Badge>
    );
  };

  return (
    <Layout>
      <PageHeader title="Import Data" description="Import programs, packages, and registrations from CSV files" />
      
      <div className="flex gap-2 mb-6">
        {renderStepBadge('raw-data', '1. Raw Data')}
        {renderStepBadge('programs-capacity', '2. Program Capacity')}
        {renderStepBadge('form-responses', '3. Registrations')}
      </div>

      <Tabs value={activeStep} onValueChange={(v) => setActiveStep(v as ImportStep)}>
        <TabsContent value="raw-data">
          <Card>
            <CardHeader>
              <CardTitle>Import Raw Data</CardTitle>
              <CardDescription>
                Upload your Raw Data CSV containing programs and packages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], setRawDataFile, setRawDataHeaders)}
                  className="hidden"
                  id="raw-data-upload"
                />
                <label htmlFor="raw-data-upload" className="cursor-pointer">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {rawDataFile ? rawDataFile.name : 'Click to upload Raw Data CSV'}
                  </p>
                </label>
              </div>

              {/* Column Mapping */}
              {rawDataHeaders.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>ProgramID Column</Label>
                    <Select value={rawDataMapping.programId} onValueChange={(v) => setRawDataMapping(m => ({ ...m, programId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {rawDataHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Item (Name) Column</Label>
                    <Select value={rawDataMapping.name} onValueChange={(v) => setRawDataMapping(m => ({ ...m, name: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {rawDataHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Price Column</Label>
                    <Select value={rawDataMapping.price} onValueChange={(v) => setRawDataMapping(m => ({ ...m, price: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {rawDataHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category Column</Label>
                    <Select value={rawDataMapping.category} onValueChange={(v) => setRawDataMapping(m => ({ ...m, category: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {rawDataHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Day/Time Column</Label>
                    <Select value={rawDataMapping.dayTime} onValueChange={(v) => setRawDataMapping(m => ({ ...m, dayTime: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {rawDataHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Level Column</Label>
                    <Select value={rawDataMapping.level} onValueChange={(v) => setRawDataMapping(m => ({ ...m, level: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {rawDataHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Location & Season Selection */}
              {rawDataHeaders.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Location (applies to all)</Label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                      <SelectContent>
                        {locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Season (optional)</Label>
                    <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                      <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                      <SelectContent>
                        {seasons?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Parse Button */}
              {rawDataHeaders.length > 0 && rawDataMapping.programId && rawDataMapping.name && (
                <Button onClick={handleRawDataParse} variant="outline">
                  Preview Data
                </Button>
              )}

              {/* Preview */}
              {rawDataParsed.length > 0 && (
                <div className="space-y-4">
                  <div className="flex gap-4 text-sm">
                    <span>Programs: <Badge variant="secondary">{rawDataParsed.filter(r => !r.isPackage).length}</Badge></span>
                    <span>Packages: <Badge variant="secondary">{rawDataParsed.filter(r => r.isPackage).length}</Badge></span>
                  </div>
                  
                  <ScrollArea className="h-64 border rounded-lg">
                    <div className="p-4 space-y-2">
                      {rawDataParsed.slice(0, 20).map((row, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge variant={row.isPackage ? 'default' : 'outline'}>
                            {row.isPackage ? 'PKG' : 'PRG'}
                          </Badge>
                          <span className="font-mono text-xs">{row.id}</span>
                          <span>{row.name}</span>
                          <span className="text-muted-foreground">${row.price}</span>
                        </div>
                      ))}
                      {rawDataParsed.length > 20 && (
                        <p className="text-sm text-muted-foreground">... and {rawDataParsed.length - 20} more</p>
                      )}
                    </div>
                  </ScrollArea>

                  <Button 
                    onClick={handleRawDataImport} 
                    disabled={!selectedLocation || importRawData.isPending}
                  >
                    {importRawData.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Import Raw Data
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs-capacity">
          <Card>
            <CardHeader>
              <CardTitle>Update Program Capacity</CardTitle>
              <CardDescription>
                Upload Programs CSV to set max registrations for each program
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], setCapacityFile, setCapacityHeaders)}
                  className="hidden"
                  id="capacity-upload"
                />
                <label htmlFor="capacity-upload" className="cursor-pointer">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {capacityFile ? capacityFile.name : 'Click to upload Programs CSV'}
                  </p>
                </label>
              </div>

              {/* Column Mapping */}
              {capacityHeaders.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>ID Column</Label>
                    <Select value={capacityMapping.id} onValueChange={(v) => setCapacityMapping(m => ({ ...m, id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {capacityHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Max Registrations Column</Label>
                    <Select value={capacityMapping.maxRegistrations} onValueChange={(v) => setCapacityMapping(m => ({ ...m, maxRegistrations: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {capacityHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Parse Button */}
              {capacityHeaders.length > 0 && capacityMapping.id && capacityMapping.maxRegistrations && (
                <Button onClick={handleCapacityParse} variant="outline">
                  Preview Data
                </Button>
              )}

              {/* Preview */}
              {capacityParsed.length > 0 && (
                <div className="space-y-4">
                  <ScrollArea className="h-64 border rounded-lg">
                    <div className="p-4 space-y-2">
                      {capacityParsed.slice(0, 20).map((row, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-xs">{row.originalId}</span>
                          <span>Max: {row.maxRegistrations}</span>
                        </div>
                      ))}
                      {capacityParsed.length > 20 && (
                        <p className="text-sm text-muted-foreground">... and {capacityParsed.length - 20} more</p>
                      )}
                    </div>
                  </ScrollArea>

                  <Button 
                    onClick={handleCapacityImport} 
                    disabled={importCapacity.isPending}
                  >
                    {importCapacity.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Update Capacity
                  </Button>
                </div>
              )}

              <Button variant="ghost" onClick={() => setActiveStep('form-responses')}>
                Skip this step
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="form-responses">
          <Card>
            <CardHeader>
              <CardTitle>Import Registrations</CardTitle>
              <CardDescription>
                Upload Form Responses CSV to create players and registrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], setFormFile, setFormHeaders)}
                  className="hidden"
                  id="form-upload"
                />
                <label htmlFor="form-upload" className="cursor-pointer">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {formFile ? formFile.name : 'Click to upload Form Responses CSV'}
                  </p>
                </label>
              </div>

              {/* Column Mapping */}
              {formHeaders.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name Column</Label>
                    <Select value={formMapping.firstName} onValueChange={(v) => setFormMapping(m => ({ ...m, firstName: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {formHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Last Name Column</Label>
                    <Select value={formMapping.lastName} onValueChange={(v) => setFormMapping(m => ({ ...m, lastName: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {formHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Email Column</Label>
                    <Select value={formMapping.email} onValueChange={(v) => setFormMapping(m => ({ ...m, email: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {formHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Phone Column</Label>
                    <Select value={formMapping.phone} onValueChange={(v) => setFormMapping(m => ({ ...m, phone: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {formHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Registrations Column</Label>
                    <Select value={formMapping.registrations} onValueChange={(v) => setFormMapping(m => ({ ...m, registrations: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        {formHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Parse Button */}
              {formHeaders.length > 0 && formMapping.firstName && formMapping.lastName && formMapping.registrations && (
                <Button onClick={handleFormParse} variant="outline">
                  Preview Data
                </Button>
              )}

              {/* Preview */}
              {formParsed.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">{formParsed.length} players to import</p>
                  
                  <ScrollArea className="h-64 border rounded-lg">
                    <div className="p-4 space-y-2">
                      {formParsed.slice(0, 20).map((row, i) => (
                        <div key={i} className="text-sm border-b pb-2">
                          <div className="font-medium">{row.firstName} {row.lastName}</div>
                          <div className="text-muted-foreground text-xs">{row.email} | {row.phone}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {row.registrations.map((r, j) => (
                              <Badge key={j} variant="outline" className="text-xs">{r}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                      {formParsed.length > 20 && (
                        <p className="text-sm text-muted-foreground">... and {formParsed.length - 20} more</p>
                      )}
                    </div>
                  </ScrollArea>

                  <Button 
                    onClick={handleFormImport} 
                    disabled={importFormResponses.isPending}
                  >
                    {importFormResponses.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Import Registrations
                  </Button>
                </div>
              )}

              {/* Errors */}
              {importErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Some registrations couldn't be matched</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="h-32 mt-2">
                      {importErrors.map((err, i) => (
                        <p key={i} className="text-xs">{err}</p>
                      ))}
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success */}
              {completedSteps.includes('form-responses') && (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertTitle>Import Complete!</AlertTitle>
                  <AlertDescription>
                    All data has been imported successfully.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
