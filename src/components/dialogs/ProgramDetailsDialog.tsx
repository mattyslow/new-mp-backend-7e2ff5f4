import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Program } from "@/hooks/usePrograms";
import { useProgramRegistrations } from "@/hooks/useRegistrations";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Package, Calendar, Clock, MapPin, X } from "lucide-react";
import { DeleteRegistrationDialog } from "./DeleteRegistrationDialog";

interface ProgramDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: Program | null;
}

interface RegistrationToDelete {
  id: string;
  programId: string;
  programName: string;
  programPrice: number;
  packageId: string | null;
  packageName: string | null;
  packagePrice: number | null;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    credit: number;
  };
}

export function ProgramDetailsDialog({
  open,
  onOpenChange,
  program,
}: ProgramDetailsDialogProps) {
  const navigate = useNavigate();
  const [registrationToDelete, setRegistrationToDelete] = useState<RegistrationToDelete | null>(null);

  const { data: registrations, isLoading: registrationsLoading } = useProgramRegistrations(
    program?.id ?? ""
  );

  // Fetch packages that contain this program
  const { data: programPackages, isLoading: packagesLoading } = useQuery({
    queryKey: ["program-packages", program?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs_packages")
        .select(`
          package_id,
          packages(id, name, price)
        `)
        .eq("program_id", program!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!program?.id,
  });

  if (!program) return null;

  const registeredCount = registrations?.length ?? 0;
  const maxRegistrations = program.max_registrations || 0;
  const capacityPercent = maxRegistrations > 0 ? (registeredCount / maxRegistrations) * 100 : 0;

  const handlePlayerClick = (playerId: string) => {
    onOpenChange(false);
    navigate(`/players/${playerId}`);
  };

  const handleRemoveClick = (reg: any) => {
    setRegistrationToDelete({
      id: reg.id,
      programId: program.id,
      programName: program.name,
      programPrice: program.price,
      packageId: reg.package_id,
      packageName: reg.packages?.name ?? null,
      packagePrice: reg.packages?.price ?? null,
      player: {
        id: reg.players?.id ?? "",
        firstName: reg.players?.first_name ?? "",
        lastName: reg.players?.last_name ?? "",
        credit: reg.players?.credit ?? 0,
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">{program.name}</DialogTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground pt-1">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(program.date), "MMM d, yyyy")}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {program.start_time} - {program.end_time}
              </div>
              {program.locations?.name && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {program.locations.name}
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-5">
            {/* Capacity Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Capacity
                </span>
                <span className="text-muted-foreground">
                  {registeredCount} / {maxRegistrations || "∞"} spots
                </span>
              </div>
              {maxRegistrations > 0 && (
                <Progress value={capacityPercent} className="h-2" />
              )}
            </div>

            {/* Registered Players Section */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Registered Players ({registeredCount})
              </h4>
              {registrationsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : registeredCount === 0 ? (
                <p className="text-sm text-muted-foreground">No players registered yet.</p>
              ) : (
                <ScrollArea className="h-[140px] border rounded-md">
                  <div className="p-3 space-y-1">
                    {registrations?.map((reg) => (
                      <div
                        key={reg.id}
                        className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                      >
                        <button
                          onClick={() => reg.players?.id && handlePlayerClick(reg.players.id)}
                          className="font-medium hover:underline text-left cursor-pointer text-foreground"
                        >
                          {reg.players?.first_name} {reg.players?.last_name}
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            {reg.players?.email || "No email"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveClick(reg)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Packages Section */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Part of Packages ({programPackages?.length ?? 0})
              </h4>
              {packagesLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : !programPackages?.length ? (
                <p className="text-sm text-muted-foreground">Not part of any package.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {programPackages.map((pp) => (
                    <Badge key={pp.package_id} variant="secondary">
                      {pp.packages?.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteRegistrationDialog
        open={!!registrationToDelete}
        onOpenChange={(open) => !open && setRegistrationToDelete(null)}
        registration={registrationToDelete ? {
          id: registrationToDelete.id,
          programId: registrationToDelete.programId,
          programName: registrationToDelete.programName,
          programPrice: registrationToDelete.programPrice,
          packageId: registrationToDelete.packageId,
          packageName: registrationToDelete.packageName,
          packagePrice: registrationToDelete.packagePrice,
        } : null}
        player={registrationToDelete ? {
          id: registrationToDelete.player.id,
          firstName: registrationToDelete.player.firstName,
          lastName: registrationToDelete.player.lastName,
          credit: registrationToDelete.player.credit,
        } : null}
      />
    </>
  );
}
