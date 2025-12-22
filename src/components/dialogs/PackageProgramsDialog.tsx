import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePackagePrograms, Package } from "@/hooks/usePackages";
import { format } from "date-fns";
import { Calendar, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PackageProgramsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: Package | null;
}

export function PackageProgramsDialog({
  open,
  onOpenChange,
  pkg,
}: PackageProgramsDialogProps) {
  const { data: programLinks, isLoading } = usePackagePrograms(pkg?.id ?? "");

  // Parse YYYY-MM-DD as local date to avoid timezone issues
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{pkg?.name ?? "Package"} Programs</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !programLinks?.length ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No programs attached to this package.
            </p>
          ) : (
            programLinks.map((link) => {
              const program = link.programs;
              if (!program) return null;

              return (
                <div
                  key={link.id}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{program.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(parseLocalDate(program.date), "EEE, MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Programs</span>
            <span className="font-medium">{programLinks?.length ?? 0}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Package Price</span>
            <span className="font-medium">${Number(pkg?.price ?? 0).toFixed(2)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
