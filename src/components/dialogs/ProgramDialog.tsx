import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProgram, useUpdateProgram, Program } from "@/hooks/usePrograms";
import { useReferenceData } from "@/hooks/useReferenceData";

interface ProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: Program | null;
}

export function ProgramDialog({ open, onOpenChange, program }: ProgramDialogProps) {
  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const { data: levels } = useReferenceData("levels");
  const { data: categories } = useReferenceData("categories");
  const { data: locations } = useReferenceData("locations");
  const { data: seasons } = useReferenceData("seasons");

  const [formData, setFormData] = useState({ name: "", date: "", start_time: "", end_time: "", price: 0, max_registrations: 0, level_id: null as string | null, category_id: null as string | null, location_id: null as string | null, season_id: null as string | null });

  useEffect(() => {
    if (program) {
      setFormData({ name: program.name, date: program.date, start_time: program.start_time, end_time: program.end_time, price: Number(program.price), max_registrations: program.max_registrations, level_id: program.level_id, category_id: program.category_id, location_id: program.location_id, season_id: program.season_id });
    } else {
      setFormData({ name: "", date: "", start_time: "", end_time: "", price: 0, max_registrations: 0, level_id: null, category_id: null, location_id: null, season_id: null });
    }
  }, [program, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (program) {
      updateProgram.mutate({ id: program.id, ...formData }, { onSuccess: () => onOpenChange(false) });
    } else {
      createProgram.mutate(formData, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{program ? "Edit Program" : "Add Program"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Date</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required /></div>
            <div><Label>Start</Label><Input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} required /></div>
            <div><Label>End</Label><Input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Price</Label><Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Max Registrations</Label><Input type="number" value={formData.max_registrations} onChange={(e) => setFormData({ ...formData, max_registrations: parseInt(e.target.value) || 0 })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Location</Label><Select value={formData.location_id ?? ""} onValueChange={(v) => setFormData({ ...formData, location_id: v || null })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{locations?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Category</Label><Select value={formData.category_id ?? ""} onValueChange={(v) => setFormData({ ...formData, category_id: v || null })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Level</Label><Select value={formData.level_id ?? ""} onValueChange={(v) => setFormData({ ...formData, level_id: v || null })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{levels?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Season</Label><Select value={formData.season_id ?? ""} onValueChange={(v) => setFormData({ ...formData, season_id: v || null })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{seasons?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Save</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
