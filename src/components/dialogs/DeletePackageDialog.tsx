import { Package, useDeletePackage, useDeletePackageWithPrograms, usePackagePrograms } from "@/hooks/usePackages";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";

interface DeletePackageDialogProps {
  pkg: Package | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function DeletePackageDialog({ pkg, open, onOpenChange }: DeletePackageDialogProps) {
  const deletePackage = useDeletePackage();
  const deletePackageWithPrograms = useDeletePackageWithPrograms();
  const { data: programLinks, isLoading } = usePackagePrograms(pkg?.id ?? "");

  const hasPrograms = programLinks && programLinks.length > 0;
  const isDeleting = deletePackage.isPending || deletePackageWithPrograms.isPending;

  const handleDeletePackageOnly = () => {
    if (pkg) {
      deletePackage.mutate(pkg.id);
      onOpenChange(false);
    }
  };

  const handleDeletePackageAndPrograms = () => {
    if (pkg) {
      deletePackageWithPrograms.mutate(pkg.id);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Package
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete <strong>{pkg?.name}</strong>?
              </p>

              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : hasPrograms ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    This package contains {programLinks.length} program{programLinks.length > 1 ? "s" : ""}:
                  </p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {programLinks.map((link) => (
                      <li key={link.id} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {link.programs?.name} - {link.programs?.date ? format(parseLocalDate(link.programs.date), "MMM d, yyyy") : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This package has no programs.
                </p>
              )}

              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          {hasPrograms && (
            <div className="flex flex-col gap-2 w-full">
              <Button
                variant="outline"
                onClick={handleDeletePackageOnly}
                disabled={isDeleting}
                className="w-full justify-start"
              >
                <span className="flex flex-col items-start">
                  <span>Delete Package Only</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Programs will remain as standalone
                  </span>
                </span>
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePackageAndPrograms}
                disabled={isDeleting}
                className="w-full justify-start"
              >
                <span className="flex flex-col items-start">
                  <span>Delete Package & All Programs</span>
                  <span className="text-xs text-destructive-foreground/80 font-normal">
                    Remove everything ({programLinks?.length} programs)
                  </span>
                </span>
              </Button>
            </div>
          )}
          <div className="flex gap-2 w-full">
            <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
            {!hasPrograms && (
              <Button
                variant="destructive"
                onClick={handleDeletePackageOnly}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? "Deleting..." : "Delete Package"}
              </Button>
            )}
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
