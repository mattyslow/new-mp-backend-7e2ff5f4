import { useState, useMemo } from "react";
import { useDeleteRegistration, useIssueSinglePlayerCredit } from "@/hooks/useRegistrations";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface DeleteRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: {
    id: string;
    programId: string | null;
    programName?: string;
    programPrice?: number;
    packageId: string | null;
    packageName?: string;
    packagePrice?: number;
  } | null;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    credit: number;
  };
}

export function DeleteRegistrationDialog({
  open,
  onOpenChange,
  registration,
  player,
}: DeleteRegistrationDialogProps) {
  const deleteRegistration = useDeleteRegistration();
  const issueCredit = useIssueSinglePlayerCredit();

  const [issueCredits, setIssueCredits] = useState(false);
  const [creditType, setCreditType] = useState<"program" | "package" | "custom">("program");
  const [customAmount, setCustomAmount] = useState("");

  const isProcessing = deleteRegistration.isPending || issueCredit.isPending;

  const creditAmount = useMemo(() => {
    if (creditType === "program") return registration?.programPrice ?? 0;
    if (creditType === "package") return registration?.packagePrice ?? 0;
    return parseFloat(customAmount) || 0;
  }, [creditType, customAmount, registration]);

  const newBalance = player.credit + (issueCredits ? creditAmount : 0);

  const handleDelete = async () => {
    if (!registration) return;

    try {
      if (issueCredits && creditAmount > 0) {
        await issueCredit.mutateAsync({ playerId: player.id, amount: creditAmount });
        toast.success(`Issued $${creditAmount.toFixed(2)} credit to ${player.firstName} ${player.lastName}`);
      }
      
      await deleteRegistration.mutateAsync(registration.id);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hooks
    }
  };

  const hasPackage = registration?.packageId && registration?.packagePrice;
  const hasProgram = registration?.programId && registration?.programPrice;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Remove Registration
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Remove <strong>{player.firstName} {player.lastName}</strong> from{" "}
                <strong>"{registration?.programName}"</strong>?
              </p>

              <div className="rounded-md border border-border bg-muted/50 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">Current credit balance:</span>
                  <span className="font-medium text-foreground">${player.credit.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="issue-credit"
                    checked={issueCredits}
                    onCheckedChange={(checked) => setIssueCredits(checked === true)}
                  />
                  <Label htmlFor="issue-credit" className="text-sm font-medium text-foreground cursor-pointer">
                    Issue credit for this removal
                  </Label>
                </div>

                {issueCredits && (
                  <div className="ml-6 space-y-3">
                    <RadioGroup value={creditType} onValueChange={(v) => setCreditType(v as typeof creditType)}>
                      {hasProgram && (
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="program" id="program-price" />
                          <Label htmlFor="program-price" className="text-sm text-foreground cursor-pointer">
                            Program price (${registration.programPrice?.toFixed(2)})
                          </Label>
                        </div>
                      )}
                      {hasPackage && (
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="package" id="package-price" />
                          <Label htmlFor="package-price" className="text-sm text-foreground cursor-pointer">
                            Package price (${registration.packagePrice?.toFixed(2)})
                          </Label>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="custom-amount" />
                        <Label htmlFor="custom-amount" className="text-sm text-foreground cursor-pointer">
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
                          New balance after credit: <strong>${newBalance.toFixed(2)}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : issueCredits && creditAmount > 0 ? "Remove & Issue Credit" : "Remove"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
