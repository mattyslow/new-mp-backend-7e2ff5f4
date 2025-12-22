import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateRegistration } from "@/hooks/useRegistrations";
import { usePlayers } from "@/hooks/usePlayers";
import { usePrograms } from "@/hooks/usePrograms";
import { usePackages } from "@/hooks/usePackages";

interface RegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegistrationDialog({ open, onOpenChange }: RegistrationDialogProps) {
  const createRegistration = useCreateRegistration();
  const { data: players } = usePlayers();
  const { data: programs } = usePrograms();
  const { data: packages } = usePackages();
  const [formData, setFormData] = useState({ player_id: "", program_id: null as string | null, package_id: null as string | null });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRegistration.mutate(formData, { onSuccess: () => { onOpenChange(false); setFormData({ player_id: "", program_id: null, package_id: null }); } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Registration</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Player</Label><Select value={formData.player_id} onValueChange={(v) => setFormData({ ...formData, player_id: v })}><SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger><SelectContent>{players?.map((p) => <SelectItem key={p.id} value={p.id}>{p.last_name}, {p.first_name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Program (optional)</Label><Select value={formData.program_id ?? ""} onValueChange={(v) => setFormData({ ...formData, program_id: v || null })}><SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger><SelectContent>{programs?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Package (optional)</Label><Select value={formData.package_id ?? ""} onValueChange={(v) => setFormData({ ...formData, package_id: v || null })}><SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger><SelectContent>{packages?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={!formData.player_id}>Save</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
