import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { usePrograms, useDeleteProgram, Program } from "@/hooks/usePrograms";
import { ProgramDialog } from "@/components/dialogs/ProgramDialog";
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

export default function Programs() {
  const { data: programs, isLoading } = usePrograms();
  const deleteProgram = useDeleteProgram();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns = [
    { key: "name", label: "Name" },
    {
      key: "date",
      label: "Date",
      render: (program: Program) => format(new Date(program.date), "MMM d, yyyy"),
    },
    {
      key: "time",
      label: "Time",
      render: (program: Program) => `${program.start_time} - ${program.end_time}`,
    },
    {
      key: "price",
      label: "Price",
      render: (program: Program) => `$${Number(program.price).toFixed(2)}`,
    },
    {
      key: "location",
      label: "Location",
      render: (program: Program) => program.locations?.name ?? "-",
    },
    {
      key: "category",
      label: "Category",
      render: (program: Program) => program.categories?.name ?? "-",
    },
    {
      key: "level",
      label: "Level",
      render: (program: Program) => program.levels?.name ?? "-",
    },
    {
      key: "actions",
      label: "",
      render: (program: Program) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setEditingProgram(program);
              setDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(program.id);
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
        title="Programs"
        description="Manage classes, sessions, and events"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Program
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <DataTable
          data={programs ?? []}
          columns={columns}
          searchKey="name"
          emptyMessage="No programs found. Create your first program to get started."
        />
      )}

      <ProgramDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingProgram(null);
        }}
        program={editingProgram}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Program</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this program? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteProgram.mutate(deleteId);
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
