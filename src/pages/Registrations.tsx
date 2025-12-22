import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useRegistrations, useDeleteRegistration, Registration } from "@/hooks/useRegistrations";
import { RegistrationDialog } from "@/components/dialogs/RegistrationDialog";
import { format } from "date-fns";
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

export default function Registrations() {
  const { data: registrations, isLoading } = useRegistrations();
  const deleteRegistration = useDeleteRegistration();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns = [
    {
      key: "player",
      label: "Player",
      render: (reg: Registration) =>
        reg.players ? `${reg.players.last_name}, ${reg.players.first_name}` : "-",
    },
    {
      key: "program",
      label: "Program",
      render: (reg: Registration) => reg.programs?.name ?? "-",
    },
    {
      key: "package",
      label: "Package",
      render: (reg: Registration) => reg.packages?.name ?? "-",
    },
    {
      key: "date",
      label: "Registered",
      render: (reg: Registration) => format(new Date(reg.created_at), "MMM d, yyyy"),
    },
    {
      key: "actions",
      label: "",
      render: (reg: Registration) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(reg.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="Registrations"
        description="Manage player registrations for programs and packages"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Registration
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <DataTable
          data={registrations ?? []}
          columns={columns}
          emptyMessage="No registrations found. Create your first registration to get started."
        />
      )}

      <RegistrationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this registration? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteRegistration.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
