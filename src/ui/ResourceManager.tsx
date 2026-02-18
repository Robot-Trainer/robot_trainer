import React, { useEffect, useMemo, useState } from "react";
import { getTableColumns } from "drizzle-orm";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import { useToast } from "./ToastContext";
import { Button } from "./Button";
import useUIStore from "../lib/uiStore";
import { tableResource } from "../db/tableResource";

type Field = { name: string; label: string; type?: "text" | "number" | "select"; required?: boolean; options?: string[]; defaultValue?: any };

export type GridCol = {
  field: string;
  headerName: string;
  render?: (row: any) => React.ReactNode;
};

type ResourceAPI = {
  list: () => Promise<any[]>;
  create: (item: any) => Promise<any>;
  update: (id: string, item: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
};

type Props = {
  title: string;
  // either supply a resource API directly
  resource?: ResourceAPI;
  // or supply a drizzle `table` to reflect fields and build a resource
  table?: any;
  fields?: Field[];
  gridCols?: GridCol[];
  renderForm?: (opts: {
    onCancel: () => void;
    onSaved: (item: any) => void;
    initialData?: any;
  }) => React.ReactNode;
};

import { Input } from './Input';
import { Select } from './Select';

const emptyFromFields = (fields?: Field[]) => {
  const o: any = {};
  for (const f of (fields || [])) o[f.name] = f.defaultValue !== undefined ? f.defaultValue : "";
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
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);

  // build a resource from table when provided (memoized)
  const fullTableResource = useMemo(() => {
    if (!table) return null;
    try {
      // lazy require to avoid circular deps at module load
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return tableResource(table);
    } catch (e) {
      return null;
    }
  }, [table]);

  const activeResource: ResourceAPI = (resource as any) || (fullTableResource as any);

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
              const isEnum = (col as any).enumValues && Array.isArray((col as any).enumValues);
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
                options: isEnum ? (col as any).enumValues : undefined,
                defaultValue: (col as any).default,
              };
            });
          } catch (e) { /* ignore */ }
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
            const isEnum = (col as any).enumValues && Array.isArray((col as any).enumValues);
            return {
              name: k,
              label: k
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (s) => s.toUpperCase()),
              type: isEnum ? "select" : (isNumber ? "number" : "text"),
              required: col.notNull && !col.hasDefault,
              options: isEnum ? (col as any).enumValues : undefined,
              defaultValue: (col as any).default,
            };
          });
      } catch (e) {
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

  const [form, setForm] = useState<any>(emptyFromFields(inferredFields));
  const showForm = useUIStore((s: any) => s.resourceManagerShowForm);
  const setShowForm = useUIStore((s: any) => s.setResourceManagerShowForm);
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

  const onEdit = (item: any) => {
    setForm({ ...item });
    setEditing(item);
    setErrors({});
    setSaveError(null);
    setShowForm(true);
  };

  const validate = (data: any) => {
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
    }
    return newErrors;
  };

  const onSave = async (overrideData?: any) => {
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
      const msg = "Failed to save. Please check your data and try again.";
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
    } catch (e: any) {
      console.error(e);
      if (toast && toast.error) {
        toast.error(`Could not delete item: ${e.message}`);
      } else {
        alert(`Could not delete item: ${e.message}`);
      }
      // Reload to ensure consistency
      await load();
    }
  };

  // Helper to prevent row click when clicking actions
  const stopProp = (e: any) => e.stopPropagation();

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
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {(gridCols || [{ field: "name", headerName: "Name" }]).map(
                      (c) => (
                        <TableCell
                          key={c.field}
                          sx={{
                            fontWeight: "bold",
                            color: "text.secondary",
                            pl: 2,
                            borderBottom: "none",
                          }}
                        >
                          {c.headerName}
                        </TableCell>
                      ),
                    )}
                    <TableCell
                      align="right"
                      sx={{ borderBottom: "none" }}
                    ></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((it) => (
                    <TableRow
                      key={it.id}
                      hover
                      sx={{
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.04) !important",
                        },
                        "&:hover .actions-cell": { opacity: 1 },
                        "&:focus-within .actions-cell": { opacity: 1 },
                      }}
                      onClick={() => onEdit(it)}
                    >
                      {(
                        gridCols || [{ field: "name", headerName: "Name" }]
                      ).map((c: any, idx) => (
                        <TableCell
                          key={c.field}
                          sx={{ pl: 2, borderBottom: "none" }}
                        >
                          {c.render
                            ? c.render(it)
                            : it[c.field] ||
                              (c.field === "name" && "(unnamed)")}
                        </TableCell>
                      ))}
                      <TableCell align="right" onClick={stopProp} sx={{ borderBottom: "none" }}>
                        <Stack
                          className="actions-cell"
                          direction="row"
                          spacing={0}
                          justifyContent="flex-end"
                          sx={{
                            opacity: 0,
                            transition: "opacity 0.2s",
                          }}
                        >
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => onEdit(it)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => requestDelete(it)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
                onSaved: async (item: any) => {
                  return await onSave(item);
                },
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
                      <Grid item xs={12} md={6} key={f.name}>
                        {f.type === "select" ? (
                          <Select
                            label={`${f.label}${f.required ? " *" : ""}`}
                            value={form[f.name] ?? ""}
                            onChange={(e) =>
                              setForm((prev) => ({
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
                              setForm((prev) => ({
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
