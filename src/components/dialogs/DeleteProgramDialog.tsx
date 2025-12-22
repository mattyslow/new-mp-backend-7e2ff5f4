import { Program, useDeleteProgram, useProgramPackages } from "@/hooks/usePrograms";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Package } from "lucide-react";

interface DeleteProgramDialogProps {
  program: Program | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteProgramDialog({ program, open, onOpenChange }: DeleteProgramDialogProps) {
  const deleteProgram = useDeleteProgram();
  const { data: packageLinks, isLoading } = useProgramPackages(program?.id ?? "");

  const hasPackages = packageLinks && packageLinks.length > 0;

  const handleDelete = () => {
    if (program) {
      deleteProgram.mutate(program.id);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Program
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete <strong>{program?.name}</strong>?
              </p>

              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : hasPackages ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    This program is part of {packageLinks.length} package{packageLinks.length > 1 ? "s" : ""}:
                  </p>
                  <ul className="space-y-1">
                    {packageLinks.map((link) => (
                      <li key={link.id} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                        <Package className="h-3 w-3" />
                        {link.packages?.name} (${Number(link.packages?.price ?? 0).toFixed(2)})
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    Deleting will remove it from these packages.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This program is not part of any packages.
                </p>
              )}

              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteProgram.isPending}
          >
            {deleteProgram.isPending ? "Deleting..." : "Delete Program"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
