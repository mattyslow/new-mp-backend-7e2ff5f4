import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2 } from "lucide-react";
import { usePrograms, useDeleteProgram, Program } from "@/hooks/usePrograms";
import { usePackages, useDeletePackage, Package } from "@/hooks/usePackages";
import { ProgramDialog } from "@/components/dialogs/ProgramDialog";
import { PackageDialog } from "@/components/dialogs/PackageDialog";
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

type ViewTab = "programs" | "packages";

export default function Programs() {
  const [activeTab, setActiveTab] = useState<ViewTab>("programs");
  
  // Programs state
  const { data: programs, isLoading: programsLoading } = usePrograms();
  const deleteProgram = useDeleteProgram();
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [deleteProgramId, setDeleteProgramId] = useState<string | null>(null);

  // Packages state
  const { data: packages, isLoading: packagesLoading } = usePackages();
  const deletePackage = useDeletePackage();
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [deletePackageId, setDeletePackageId] = useState<string | null>(null);

  const programColumns = [
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
              setProgramDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteProgramId(program.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const packageColumns = [
    { key: "name", label: "Name" },
    {
      key: "price",
      label: "Price",
      render: (pkg: Package) => `$${Number(pkg.price).toFixed(2)}`,
    },
    {
      key: "location",
      label: "Location",
      render: (pkg: Package) => pkg.locations?.name ?? "-",
    },
    {
      key: "actions",
      label: "",
      render: (pkg: Package) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setEditingPackage(pkg);
              setPackageDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeletePackageId(pkg.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const isLoading = activeTab === "programs" ? programsLoading : packagesLoading;

  return (
    <Layout>
      <PageHeader
        title={activeTab === "programs" ? "Programs" : "Packages"}
        description={
          activeTab === "programs"
            ? "Manage classes, sessions, and events"
            : "Manage program bundles and discounts"
        }
        actions={
          <Button
            onClick={() =>
              activeTab === "programs"
                ? setProgramDialogOpen(true)
                : setPackageDialogOpen(true)
            }
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {activeTab === "programs" ? "Program" : "Package"}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ViewTab)} className="mb-6">
        <TabsList>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : activeTab === "programs" ? (
        <DataTable
          data={programs ?? []}
          columns={programColumns}
          searchKey="name"
          emptyMessage="No programs found. Create your first program to get started."
        />
      ) : (
        <DataTable
          data={packages ?? []}
          columns={packageColumns}
          searchKey="name"
          emptyMessage="No packages found. Create your first package to get started."
        />
      )}

      {/* Program Dialog */}
      <ProgramDialog
        open={programDialogOpen}
        onOpenChange={(open) => {
          setProgramDialogOpen(open);
          if (!open) setEditingProgram(null);
        }}
        program={editingProgram}
      />

      {/* Package Dialog */}
      <PackageDialog
        open={packageDialogOpen}
        onOpenChange={(open) => {
          setPackageDialogOpen(open);
          if (!open) setEditingPackage(null);
        }}
        pkg={editingPackage}
      />

      {/* Delete Program Confirmation */}
      <AlertDialog open={!!deleteProgramId} onOpenChange={() => setDeleteProgramId(null)}>
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
                if (deleteProgramId) {
                  deleteProgram.mutate(deleteProgramId);
                  setDeleteProgramId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Package Confirmation */}
      <AlertDialog open={!!deletePackageId} onOpenChange={() => setDeletePackageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this package? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletePackageId) {
                  deletePackage.mutate(deletePackageId);
                  setDeletePackageId(null);
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
