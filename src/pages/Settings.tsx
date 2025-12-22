import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  useReferenceData,
  useCreateReferenceItem,
  useUpdateReferenceItem,
  useDeleteReferenceItem,
} from "@/hooks/useReferenceData";
import { ReferenceItemDialog } from "@/components/dialogs/ReferenceItemDialog";
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

interface ReferenceItem {
  id: string;
  name: string;
  created_at: string;
}

interface ReferenceSettingsPageProps {
  title: string;
  description: string;
  table: "levels" | "categories" | "locations" | "seasons";
}

export function ReferenceSettingsPage({ title, description, table }: ReferenceSettingsPageProps) {
  const { data: items, isLoading } = useReferenceData(table);
  const createItem = useCreateReferenceItem(table);
  const updateItem = useUpdateReferenceItem(table);
  const deleteItem = useDeleteReferenceItem(table);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReferenceItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns = [
    { key: "name", label: "Name" },
    {
      key: "actions",
      label: "",
      render: (item: ReferenceItem) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setEditingItem(item);
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
              setDeleteId(item.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const handleSave = (name: string) => {
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, name });
    } else {
      createItem.mutate(name);
    }
    setDialogOpen(false);
    setEditingItem(null);
  };

  return (
    <Layout>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add {title.slice(0, -1)}
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <DataTable
          data={items ?? []}
          columns={columns}
          searchKey="name"
          emptyMessage={`No ${title.toLowerCase()} found. Add your first one to get started.`}
        />
      )}

      <ReferenceItemDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingItem(null);
        }}
        item={editingItem}
        onSave={handleSave}
        title={editingItem ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {title.slice(0, -1)}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteItem.mutate(deleteId);
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

export function LevelsSettings() {
  return (
    <ReferenceSettingsPage
      title="Levels"
      description="Manage skill levels for programs"
      table="levels"
    />
  );
}

export function CategoriesSettings() {
  return (
    <ReferenceSettingsPage
      title="Categories"
      description="Manage program categories"
      table="categories"
    />
  );
}

export function LocationsSettings() {
  return (
    <ReferenceSettingsPage
      title="Locations"
      description="Manage program locations"
      table="locations"
    />
  );
}

export function SeasonsSettings() {
  return (
    <ReferenceSettingsPage
      title="Seasons"
      description="Manage seasons"
      table="seasons"
    />
  );
}
