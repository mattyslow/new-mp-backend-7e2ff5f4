import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useRegistrations, useDeleteRegistration, Registration } from "@/hooks/useRegistrations";
import { usePrograms } from "@/hooks/usePrograms";
import { usePackages } from "@/hooks/usePackages";
import { RegistrationDialog } from "@/components/dialogs/RegistrationDialog";
import { TableFilters } from "@/components/TableFilters";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
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

interface RegistrationFilters {
  programId: string | null;
  packageId: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
}

export default function Registrations() {
  const { data: registrations, isLoading } = useRegistrations();
  const { data: programs } = usePrograms();
  const { data: packages } = usePackages();
  const deleteRegistration = useDeleteRegistration();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<RegistrationFilters>({
    programId: null,
    packageId: null,
    dateFrom: null,
    dateTo: null,
  });

  const handleFilterChange = (key: string, value: string | Date | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      programId: null,
      packageId: null,
      dateFrom: null,
      dateTo: null,
    });
  };

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    if (!registrations) return [];
    return registrations.filter((reg) => {
      if (filters.programId && reg.program_id !== filters.programId) return false;
      if (filters.packageId && reg.package_id !== filters.packageId) return false;
      if (filters.dateFrom) {
        const regDate = new Date(reg.created_at);
        if (isBefore(regDate, startOfDay(filters.dateFrom))) return false;
      }
      if (filters.dateTo) {
        const regDate = new Date(reg.created_at);
        if (isAfter(regDate, endOfDay(filters.dateTo))) return false;
      }
      return true;
    });
  }, [registrations, filters]);

  const filterConfig = [
    {
      key: "programId",
      label: "Program",
      type: "select" as const,
      options: programs?.map((p) => ({ id: p.id, name: p.name })) || [],
    },
    {
      key: "packageId",
      label: "Package",
      type: "select" as const,
      options: packages?.map((p) => ({ id: p.id, name: p.name })) || [],
    },
    {
      key: "dateFrom",
      label: "From Date",
      type: "date" as const,
    },
    {
      key: "dateTo",
      label: "To Date",
      type: "date" as const,
    },
  ];

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

      <div className="mb-4">
        <TableFilters
          filters={filterConfig}
          values={filters as unknown as Record<string, string | Date | null>}
          onChange={handleFilterChange}
          onClear={clearFilters}
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <DataTable
          data={filteredRegistrations}
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