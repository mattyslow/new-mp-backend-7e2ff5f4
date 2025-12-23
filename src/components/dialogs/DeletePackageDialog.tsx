import { useState, useMemo } from "react";
import { Package, useDeletePackage, useDeletePackageWithPrograms, usePackagePrograms, usePackageRegistrationsWithPlayers } from "@/hooks/usePackages";
import { useIssueProgramCredits } from "@/hooks/usePrograms";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Calendar, CreditCard, User } from "lucide-react";

interface DeletePackageDialogProps {
  pkg: Package | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeletePackageDialog({ pkg, open, onOpenChange }: DeletePackageDialogProps) {
  const deletePackage = useDeletePackage();
  const deletePackageWithPrograms = useDeletePackageWithPrograms();
  const issueCredits = useIssueProgramCredits();
  const { data: programLinks, isLoading: programsLoading } = usePackagePrograms(pkg?.id ?? "");
  const { data: registeredPlayers, isLoading: playersLoading } = usePackageRegistrationsWithPlayers(pkg?.id ?? "");

  const [issueCreditEnabled, setIssueCreditEnabled] = useState(false);
  const [creditType, setCreditType] = useState<"package" | "custom">("package");
  const [customAmount, setCustomAmount] = useState("");

  const hasPrograms = programLinks && programLinks.length > 0;
  const hasPlayers = registeredPlayers && registeredPlayers.length > 0;
  const isLoading = programsLoading || playersLoading;
  const isProcessing = deletePackage.isPending || deletePackageWithPrograms.isPending || issueCredits.isPending;

  const creditAmount = useMemo(() => {
    if (creditType === "package") return pkg?.price ?? 0;
    return parseFloat(customAmount) || 0;
  }, [creditType, customAmount, pkg?.price]);

  const handleDelete = async (deletePrograms: boolean) => {
    if (!pkg) return;

    try {
      // Issue credits first if enabled
      if (issueCreditEnabled && hasPlayers && creditAmount > 0) {
        const credits = registeredPlayers.map((player) => ({
          playerId: player.id,
          amount: creditAmount,
        }));
        await issueCredits.mutateAsync(credits);
      }

      // Then delete the package
      if (deletePrograms) {
        await deletePackageWithPrograms.mutateAsync(pkg.id);
      } else {
        await deletePackage.mutateAsync(pkg.id);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hooks
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
              ) : (
                <>
                  {hasPrograms && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                        This package contains {programLinks.length} program{programLinks.length > 1 ? "s" : ""}:
                      </p>
                      <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {programLinks.map((link) => (
                          <li key={link.id} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{link.programs?.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasPlayers && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                        {registeredPlayers.length} player{registeredPlayers.length > 1 ? "s" : ""} registered via this package:
                      </p>
                      <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {registeredPlayers.map((player) => (
                          <li key={player.id} className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {player.first_name} {player.last_name}
                            </span>
                            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 ml-auto">
                              <CreditCard className="h-3 w-3" />
                              ${Number(player.credit).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!hasPrograms && !hasPlayers && (
                    <p className="text-sm text-muted-foreground">
                      This package has no programs or registrations.
                    </p>
                  )}

                  {hasPlayers && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="issue-credit-pkg"
                          checked={issueCreditEnabled}
                          onCheckedChange={(checked) => setIssueCreditEnabled(checked === true)}
                        />
                        <Label htmlFor="issue-credit-pkg" className="text-sm font-medium text-foreground cursor-pointer">
                          Issue credit to registered players
                        </Label>
                      </div>

                      {issueCreditEnabled && (
                        <div className="ml-6 space-y-3">
                          <RadioGroup value={creditType} onValueChange={(v) => setCreditType(v as typeof creditType)}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="package" id="pkg-price" />
                              <Label htmlFor="pkg-price" className="text-sm text-foreground cursor-pointer">
                                Package price (${(pkg?.price ?? 0).toFixed(2)})
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="custom" id="pkg-custom" />
                              <Label htmlFor="pkg-custom" className="text-sm text-foreground cursor-pointer">
                                Custom amount
                              </Label>
                            </div>
                          </RadioGroup>

                          {creditType === "custom" && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-32"
                              />
                            </div>
                          )}

                          {creditAmount > 0 && (
                            <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-2">
                              <p className="text-sm text-green-800 dark:text-green-200">
                                Each player will receive <strong>${creditAmount.toFixed(2)}</strong> credit
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
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
                onClick={() => handleDelete(false)}
                disabled={isProcessing}
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
                onClick={() => handleDelete(true)}
                disabled={isProcessing}
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
                onClick={() => handleDelete(false)}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? "Processing..." : issueCreditEnabled && creditAmount > 0 ? "Delete & Issue Credit" : "Delete Package"}
              </Button>
            )}
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}