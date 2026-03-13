import React, { useEffect, useMemo, useState } from "react";
import { getTableColumns } from "drizzle-orm";
import { DataGrid } from '@mui/x-data-grid';
import styles from './ResourceManager.module.css';

import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { useToast } from "./ToastContext";
import { Button } from "./Button";
import useUIStore from "../lib/uiStore";
import type { UIState } from "../lib/uiStore";
import { tableResource } from "../db/tableResource";
import type { GridRenderCellParams } from '@mui/x-data-grid';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleTable = Record<string, any>;
type ResourceRecord = Record<string, unknown>;

type Field = { name: string; label: string; type?: "text" | "number" | "select"; required?: boolean; options?: string[]; defaultValue?: unknown; isJson?: boolean };

export type GridCol = {
  field: string;
  headerName: string;
  render?: (row: ResourceRecord) => React.ReactNode;
};

type ResourceAPI = {
  list: () => Promise<ResourceRecord[]>;
  create: (item: ResourceRecord) => Promise<ResourceRecord>;
  update: (id: string, item: ResourceRecord) => Promise<ResourceRecord>;
  delete: (id: string) => Promise<unknown>;
};

type Props = {
  title: string;
  // either supply a resource API directly
  resource?: ResourceAPI;
  // or supply a drizzle `table` to reflect fields and build a resource
  table?: DrizzleTable;
  fields?: Field[];
  gridCols?: GridCol[];
  renderForm?: (opts: {
    onCancel: () => void;
    onSaved: (item: ResourceRecord) => void;
    onRefresh?: () => Promise<void>;

    initialData?: ResourceRecord;
  }) => React.ReactNode;
};

import { Input } from './Input';
import { Select } from './Select';

const formatFieldValueForForm = (field: Field, value: unknown): unknown => {
  if (field.isJson && value !== undefined && value !== null && value !== "") {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return value ?? "";
};

const emptyFromFields = (fields?: Field[]) => {
  const o: ResourceRecord = {};
  for (const f of (fields || [])) {
    const defaultValue = f.defaultValue !== undefined ? f.defaultValue : "";
    o[f.name] = formatFieldValueForForm(f, defaultValue);
  }
  return o;
};

export const ResourceManager: React.FC<Props> = ({
  title,
  resource,
  table,
  fields,
  gridCols,
  renderForm,
}) => {
  const toast = useToast();
  const [items, setItems] = useState<ResourceRecord[]>([]);
  const [editing, setEditing] = useState<ResourceRecord | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ResourceRecord | null>(null);

  // build a resource from table when provided (memoized)
  const fullTableResource = useMemo(() => {
    if (!table) return null;
    try {
      // lazy require to avoid circular deps at module load
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return tableResource(table);
    } catch {
      return null;
    }
  }, [table]);

  const activeResource: ResourceAPI = (resource || fullTableResource) as ResourceAPI;

  // infer fields from table columns if not provided
  const inferredFields = useMemo<Field[]>(() => {
    let computedFields: Field[] = [];
    const runInference = () => {
      if (fields && fields.length) {
        // If table is present, enrich fields with type/required info
        if (table) {
          try {
            const cols = getTableColumns(table);
            return fields.map((f) => {
              const col = cols[f.name];
              const isEnum = !!(col as Record<string, unknown>).enumValues && Array.isArray((col as Record<string, unknown>).enumValues);
              return {
                ...f,
                type:
                  f.type ||
                  (isEnum ? "select" :
                    (col && (col.dataType === "integer" || col.dataType === "number")
                      ? "number"
                      : "text")),
                required:
                  f.required !== undefined
                    ? f.required
                    : col?.notNull && !col?.hasDefault,
                options: isEnum ? (col as Record<string, unknown>).enumValues as string[] : undefined,
                defaultValue: (col as Record<string, unknown>).default,
                isJson: col?.dataType === "json",
              };
            });
          } catch { /* ignore */ }
        }
        return fields;
      }
      if (!table) {
        console.error(`Could not find columns for table ${table?.name}`);
        return [];
      }

      // Try to use getTableColumns
      try {
        const cols = getTableColumns(table);
        return Object.keys(cols)
          .filter((k) => k !== "id")
          .map((k) => {
            const col = cols[k];
            const isNumber =
              col.dataType === "number" || col.dataType === "integer";
            const isEnum = !!(col as Record<string, unknown>).enumValues && Array.isArray((col as Record<string, unknown>).enumValues);
            return {
              name: k,
              label: k
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (s) => s.toUpperCase()),
              type: isEnum ? "select" : (isNumber ? "number" : "text"),
              required: col.notNull && !col.hasDefault,
              options: isEnum ? (col as Record<string, unknown>).enumValues as string[] : undefined,
              defaultValue: (col as Record<string, unknown>).default,
              isJson: col?.dataType === "json",
            };
          });
      } catch {
        // Fallback
        return Object.keys(table)
          .filter((k) => k !== "id" && k !== "enableRLS")
          .map((k) => ({
            name: k,
            label: k
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (s) => s.toUpperCase()),
          }));
      }
    };
    computedFields = runInference();
    return computedFields.filter((f) => !["createdAt", "created_at", "updatedAt", "updated_at"].includes(f.name));
  }, [fields, table]);

  const [form, setForm] = useState<ResourceRecord>(emptyFromFields(inferredFields));
  const showForm = useUIStore((s: UIState) => s.resourceManagerShowForm);
  const setShowForm = useUIStore((s: UIState) => s.setResourceManagerShowForm);
  const [loading, setLoading] = useState(false);


  const load = async () => {
    setLoading(true);
    try {
      if (!activeResource || typeof activeResource.list !== 'function') {
        console.warn("No valid resource API found for", title);
        return;
      }
      const data = await activeResource.list();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeResource]);

  const onCreate = () => {
    setForm(emptyFromFields(inferredFields));
    setEditing(null);
    setErrors({});
    setSaveError(null);
    setShowForm(true);
  };

  const onEdit = (item: ResourceRecord) => {
    const normalizedForm: ResourceRecord = { ...item };
    for (const f of inferredFields) {
      normalizedForm[f.name] = formatFieldValueForForm(f, item?.[f.name]);
    }
    setForm(normalizedForm);
    setEditing(item);
    setErrors({});
    setSaveError(null);
    setShowForm(true);
  };

  const validate = (data: ResourceRecord) => {
    const newErrors: Record<string, string> = {};
    for (const f of inferredFields) {
      const val = data[f.name];
      if (f.required) {
        if (val === undefined || val === null || val === "") {
          newErrors[f.name] = "This field is required";
        }
      }
      if (f.type === "number") {
        if (val !== "" && val !== null && val !== undefined && isNaN(Number(val))) {
          newErrors[f.name] = "Must be a number";
        }
      }
      if (f.isJson && val !== "" && val !== null && val !== undefined && typeof val === "string") {
        try {
          JSON.parse(val);
        } catch {
          newErrors[f.name] = "Must be valid JSON";
        }
      }
    }
    return newErrors;
  };

  const onSave = async (overrideData?: ResourceRecord) => {
    setErrors({});
    setSaveError(null);

    const rawData = overrideData || form;
    const validationErrors = validate(rawData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const dataToSave = { ...rawData };
    for (const f of inferredFields) {
      if (f.type === "number") {
        const val = dataToSave[f.name];
        if (val !== "" && val !== null && val !== undefined) {
          dataToSave[f.name] = Number(val);
        } else if (val === "") {
          // default to 0 for empty strings on number fields to satisfy integer type
          dataToSave[f.name] = 0;
        }
      }
      if (f.isJson) {
        const val = dataToSave[f.name];
        if (val === "" || val === null || val === undefined) {
          dataToSave[f.name] = {};
        } else if (typeof val === "string") {
          dataToSave[f.name] = JSON.parse(val);
        }
      } else {
        const val = dataToSave[f.name];
        if (typeof val === "string") {
          const trimmed = val.trim();
          if (
            (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]"))
          ) {
            try {
              dataToSave[f.name] = JSON.parse(trimmed);
            } catch {
              // leave as-is for non-JSON text fields
            }
          }
        }
      }
    }

    try {
      if (!activeResource) return;
      let result;
      if (editing) {
        result = await activeResource.update(editing.id, { ...editing, ...dataToSave });
        setEditing(result);
      } else {
        result = await activeResource.create({ ...dataToSave });
        setEditing(result);
      }
      toast.success('Saved successfully');
      setForm(result);
      await load();
      return result;
    } catch (e) {
      console.error(e);
      const details = e instanceof Error ? e.message : String(e);
      const msg = `Failed to save. ${details || 'Please check your data and try again.'}`;
      setSaveError(msg);
      toast.error(msg);
      return;
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (activeResource) await activeResource.delete(itemToDelete.id);
      await load();
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (e: unknown) {
      console.error(e);
      if (toast && toast.error) {
        toast.error(`Could not delete item: ${e instanceof Error ? e.message : String(e)}`);
      } else {
        alert(`Could not delete item: ${e instanceof Error ? e.message : String(e)}`);
      }
      // Reload to ensure consistency
      await load();
    }
  };

  const requestDelete = (item: ResourceRecord) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const columns = useMemo(() => {
    const cols = (gridCols || [{ field: "name", headerName: "Name" }]).map((c) => ({
      field: c.field,
      headerName: c.headerName,
      flex: 1,
      minWidth: 150,
      renderCell: c.render ? (params: GridRenderCellParams) => c.render!(params.row as ResourceRecord) : (params: GridRenderCellParams) => {
        return (params.row as ResourceRecord)[c.field] || (c.field === "name" && "(unnamed)");
      },
    }));

    cols.push({
      field: "actions",
      headerName: "",
      width: 60,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => (
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              
              onClick={(e) => { e.stopPropagation(); requestDelete(params.row as ResourceRecord); }}
            >
              <Delete fontSize="small"/>
            </IconButton>
          </Tooltip>
      ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    return cols;
  }, [gridCols, onEdit]);

  // Helper to prevent row click when clicking actions — currently unused
  // const _stopProp = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Box>
      {!showForm && (
        <>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={3}
            px={2}
          >
            <Typography variant="h5" fontWeight="600">
              {title}
            </Typography>
            <Button
              onClick={onCreate}
              variant="primary"
              pulse={items.length === 0}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <span>Add {title.replace(/s$/, "")}</span>
              </Box>
            </Button>
          </Box>

          {loading ? (
            <Typography color="text.secondary" px={2}>
              Loading...
            </Typography>
          ) : items.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Typography color="text.secondary" mb={2}>
                No {title.toLowerCase()} defined
              </Typography>
              <Button onClick={onCreate}>
                Add a {title.replace(/s$/, "")}
              </Button>
            </Box>
          ) : (
            <Box sx={{ width: '100%' }}>
              <DataGrid
                rows={items}
                className={styles.grid}
                columns={columns}
                onRowClick={(params) => onEdit(params.row)}
                disableRowSelectionOnClick
                autoHeight
              />
            </Box>
          )}
        </>
      )}

      {showForm && (
        <Card elevation={0}>
          <CardContent>
            {typeof renderForm === "function" ? (
              renderForm({
                onCancel: () => {
                  setShowForm(false);
                  setEditing(null);
                },
                onSaved: async (item: ResourceRecord) => {
                  return await onSave(item);
                },
                onRefresh: async () => await load(),
                initialData: editing || undefined,
              })
            ) : (
              <>
                <Typography variant="h6" mb={3}>
                  {editing ? "Edit" : "Create"} {title.replace(/s$/, "")}
                </Typography>

                {editing && (
                  <Box mb={3} display="flex" flexWrap="wrap" gap={2}>
                    {["createdAt", "created_at"].map(
                      (k) =>
                        editing[k] && (
                          <Typography
                            key={k}
                            variant="caption"
                            color="text.secondary"
                          >
                            Created: {new Date(editing[k]).toLocaleString()}
                          </Typography>
                        ),
                    )}
                    {["updatedAt", "updated_at"].map(
                      (k) =>
                        editing[k] && (
                          <Typography
                            key={k}
                            variant="caption"
                            color="text.secondary"
                          >
                            Updated: {new Date(editing[k]).toLocaleString()}
                          </Typography>
                        ),
                    )}
                  </Box>
                )}

                <Grid container spacing={2} mb={3}>
                  {inferredFields.map((f) => {
                    const options = (f.options || []).map((o) => ({
                      label: o,
                      value: o,
                    }));
                    if (!f.required && f.type === "select") {
                      options.unshift({ label: "Select...", value: "" });
                    }

                    return (
                      <Grid size={{ xs: 12, md: 6 }} key={f.name}>
                        {f.type === "select" ? (
                          <Select
                            label={`${f.label}${f.required ? " *" : ""}`}
                            value={form[f.name] ?? ""}
                            onChange={(e) =>
                              setForm((prev: ResourceRecord) => ({
                                ...prev,
                                [f.name]: e.target.value,
                              }))
                            }
                            options={options}
                          />
                        ) : (
                          <Input
                            label={`${f.label}${f.required ? " *" : ""}`}
                            value={form[f.name] ?? ""}
                            onChange={(e) =>
                              setForm((prev: ResourceRecord) => ({
                                ...prev,
                                [f.name]: e.target.value,
                              }))
                            }
                            type={f.type || "text"}
                          />
                        )}
                        {errors[f.name] && (
                          <Typography
                            color="error"
                            variant="caption"
                            sx={{ mt: 0.5, display: "block" }}
                          >
                            {errors[f.name]}
                          </Typography>
                        )}
                      </Grid>
                    );
                  })}
                </Grid>

                {saveError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {saveError}
                  </Alert>
                )}

                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setForm(emptyFromFields(inferredFields));
                      setEditing(null);
                      setShowForm(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => onSave()}>
                    {editing ? "Save" : "Create"}
                  </Button>
                </Stack>
              </>
            )}
          </CardContent>
        </Card>
      )}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this{" "}
            {title.replace(/s$/, "").toLowerCase()}?
            {itemToDelete && (
              <Box fontWeight="bold" mt={1}>
                {itemToDelete.name || "(unnamed)"}
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="secondary"
            onClick={() => setDeleteConfirmOpen(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResourceManager;
