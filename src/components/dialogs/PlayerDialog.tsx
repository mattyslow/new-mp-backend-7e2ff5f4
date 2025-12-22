import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePlayer, useUpdatePlayer, Player } from "@/hooks/usePlayers";

interface PlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player | null;
}

export function PlayerDialog({ open, onOpenChange, player }: PlayerDialogProps) {
  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const [formData, setFormData] = useState({ first_name: "", last_name: "", email: "", phone: "", credit: 0 });

  useEffect(() => {
    if (player) {
      setFormData({ first_name: player.first_name, last_name: player.last_name, email: player.email ?? "", phone: player.phone ?? "", credit: Number(player.credit) });
    } else {
      setFormData({ first_name: "", last_name: "", email: "", phone: "", credit: 0 });
    }
  }, [player, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (player) {
      updatePlayer.mutate({ id: player.id, ...formData }, { onSuccess: () => onOpenChange(false) });
    } else {
      createPlayer.mutate(formData, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{player ? "Edit Player" : "Add Player"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First Name</Label><Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required /></div>
            <div><Label>Last Name</Label><Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
          <div><Label>Credit</Label><Input type="number" step="0.01" value={formData.credit} onChange={(e) => setFormData({ ...formData, credit: parseFloat(e.target.value) || 0 })} /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Save</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
