import { useState, useEffect } from "react";
import { Program, useDeleteProgram, useProgramPackages, useProgramRegistrationsWithPlayers, useIssueProgramCredits } from "@/hooks/usePrograms";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Package, User, CreditCard } from "lucide-react";

interface DeleteProgramDialogProps {
  program: Program | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteProgramDialog({ program, open, onOpenChange }: DeleteProgramDialogProps) {
  const deleteProgram = useDeleteProgram();
  const issueCredits = useIssueProgramCredits();
  const { data: packageLinks, isLoading: isLoadingPackages } = useProgramPackages(program?.id ?? "");
  const { data: registrations, isLoading: isLoadingRegistrations } = useProgramRegistrationsWithPlayers(program?.id ?? "");

  const [issueCredit, setIssueCredit] = useState(false);
  const [creditType, setCreditType] = useState<"program" | "custom">("program");
  const [customAmount, setCustomAmount] = useState("");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setIssueCredit(false);
      setCreditType("program");
      setCustomAmount("");
    }
  }, [open]);

  const hasPackages = packageLinks && packageLinks.length > 0;
  const hasRegistrations = registrations && registrations.length > 0;
  const programPrice = program?.price ?? 0;

  const getCreditAmount = () => {
    if (creditType === "program") {
      return programPrice;
    }
    return parseFloat(customAmount) || 0;
  };

  const handleDelete = async () => {
    if (!program) return;

    const isPending = deleteProgram.isPending || issueCredits.isPending;
    if (isPending) return;

    try {
      // Issue credits first if selected
      if (issueCredit && hasRegistrations) {
        const creditAmount = getCreditAmount();
        if (creditAmount > 0) {
          const creditsToIssue = registrations
            .filter((r) => r.players)
            .map((r) => ({
              playerId: r.player_id,
              amount: creditAmount,
            }));

          if (creditsToIssue.length > 0) {
            await issueCredits.mutateAsync(creditsToIssue);
          }
        }
      }

      // Then delete the program
      await deleteProgram.mutateAsync(program.id);
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation hooks
    }
  };

  const isProcessing = deleteProgram.isPending || issueCredits.isPending;
  const creditAmount = getCreditAmount();
  const totalCredits = hasRegistrations && issueCredit ? creditAmount * registrations.length : 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
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

              {/* Registered Players Section */}
              {isLoadingRegistrations ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : hasRegistrations ? (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {registrations.length} player{registrations.length > 1 ? "s" : ""} registered:
                  </p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {registrations.map((reg) => (
                      <li key={reg.id} className="flex items-center justify-between text-sm text-blue-700 dark:text-blue-300">
                        <span>{reg.players?.first_name} {reg.players?.last_name}</span>
                        <span className="text-blue-600 dark:text-blue-400">
                          (credit: ${Number(reg.players?.credit ?? 0).toFixed(2)})
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Credit Option */}
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="issue-credit"
                        checked={issueCredit}
                        onCheckedChange={(checked) => setIssueCredit(checked === true)}
                      />
                      <Label
                        htmlFor="issue-credit"
                        className="text-sm font-medium text-blue-800 dark:text-blue-200 cursor-pointer flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        Issue credit to registered players
                      </Label>
                    </div>

                    {issueCredit && (
                      <div className="mt-3 ml-6 space-y-2">
                        <RadioGroup
                          value={creditType}
                          onValueChange={(value) => setCreditType(value as "program" | "custom")}
                          className="space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="program" id="credit-program" />
                            <Label htmlFor="credit-program" className="text-sm text-blue-700 dark:text-blue-300 cursor-pointer">
                              Program price (${programPrice.toFixed(2)})
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom" id="credit-custom" />
                            <Label htmlFor="credit-custom" className="text-sm text-blue-700 dark:text-blue-300 cursor-pointer">
                              Custom amount:
                            </Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                onFocus={() => setCreditType("custom")}
                                className="w-24 h-8 pl-5 text-sm"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </RadioGroup>

                        {creditAmount > 0 && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                            Total credit to issue: ${totalCredits.toFixed(2)} ({registrations.length} × ${creditAmount.toFixed(2)})
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No players are registered for this program.
                </p>
              )}

              {/* Package Links Section */}
              {isLoadingPackages ? (
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
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isProcessing}
          >
            {isProcessing
              ? "Processing..."
              : issueCredit && hasRegistrations && creditAmount > 0
              ? `Delete & Issue $${totalCredits.toFixed(2)} Credit`
              : "Delete Program"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
