import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePackage, useUpdatePackage, Package } from "@/hooks/usePackages";
import { useReferenceData } from "@/hooks/useReferenceData";

interface PackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: Package | null;
}

export function PackageDialog({ open, onOpenChange, pkg }: PackageDialogProps) {
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const { data: locations } = useReferenceData("locations");
  const [formData, setFormData] = useState({ name: "", price: 0, location_id: null as string | null });

  useEffect(() => {
    if (pkg) {
      setFormData({ name: pkg.name, price: Number(pkg.price), location_id: pkg.location_id });
    } else {
      setFormData({ name: "", price: 0, location_id: null });
    }
  }, [pkg, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pkg) {
      updatePackage.mutate({ id: pkg.id, ...formData }, { onSuccess: () => onOpenChange(false) });
    } else {
      createPackage.mutate(formData, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{pkg ? "Edit Package" : "Add Package"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
          <div><Label>Price</Label><Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Location</Label><Select value={formData.location_id ?? ""} onValueChange={(v) => setFormData({ ...formData, location_id: v || null })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{locations?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Save</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
