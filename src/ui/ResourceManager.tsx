import React, { useEffect, useMemo, useState } from "react";
import { getTableColumns } from "drizzle-orm";
import { Button } from "./Button";
import Card from "./Card";
import useUIStore from "../lib/uiStore";
import { tableResource } from "../db/tableResource";

type Field = { name: string; label: string; type?: "text" | "number"; required?: boolean };

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
  renderForm?: (opts: {
    onCancel: () => void;
    onSaved: (item: any) => void;
    initialData?: any;
  }) => React.ReactNode;
};

const emptyFromFields = (fields?: Field[]) => {
  const o: any = {};
  for (const f of (fields || [])) o[f.name] = "";
  return o;
};

export const ResourceManager: React.FC<Props> = ({
  title,
  resource,
  table,
  fields,
  renderForm,
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // activeResource: prefer explicit resource prop, otherwise use tableResource
  const activeResource: ResourceAPI = (resource as any) || (fullTableResource as any);

  // infer fields from table columns if not provided
  const inferredFields = useMemo<Field[]>(() => {
    if (fields && fields.length) {
      // If table is present, enrich fields with type/required info
      if (table) {
        try {
          const cols = getTableColumns(table);
          return fields.map((f) => {
            const col = cols[f.name];
            return {
              ...f,
              type:
                f.type ||
                (col && (col.dataType === "integer" || col.dataType === "number")
                  ? "number"
                  : "text"),
              required:
                f.required !== undefined
                  ? f.required
                  : col?.notNull && !col?.hasDefault,
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
          return {
            name: k,
            label: k
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (s) => s.toUpperCase()),
            type: isNumber ? "number" : "text",
            required: col.notNull && !col.hasDefault,
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
  }, [fields, table]);

  const [form, setForm] = useState<any>(emptyFromFields(inferredFields));
  const showForm = useUIStore((s: any) => s.resourceManagerShowForm);
  const setShowForm = useUIStore((s: any) => s.setResourceManagerShowForm);
  const [loading, setLoading] = useState(false);


  const load = async () => {
    setLoading(true);
    try {
      if (!activeResource || typeof activeResource.list !== 'function') {
        setItems([]);
        return;
      }
      const res = await activeResource.list();
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeResource]);

  const saveAll = async (next: any[]) => {
    // upsert items by id
    for (const it of next) {
      if (!activeResource) continue;
      if (it.id) {
        try { await activeResource.update(it.id, it); } catch { await activeResource.create(it); }
      } else {
        await activeResource.create(it);
      }
    }
    await load();
  };

  const onCreate = () => {
    setForm(emptyFromFields(inferredFields));
    setEditing(null);
    setShowForm(true);
    setErrors({});
    setSaveError(null);
  };

  const onEdit = (it: any) => {
    setEditing(it);
    setForm({ ...it });
    setShowForm(true);
    setErrors({});
    setSaveError(null);
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
    // Convert numeric fields from string to number
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
        setEditing(null);
      } else {
        result = await activeResource.create({ ...dataToSave });
      }
      await load();
      setForm(emptyFromFields(fields));
      setShowForm(false);
      return result;
    } catch (e) {
      console.error(e);
      setSaveError("Failed to save. Please check your data and try again.");
      return;
    }
  };

  const onDelete = async (id: string) => {
    try {
      if (activeResource) await activeResource.delete(id);
      await load();
    } catch (e) {
      setItems(items.filter((i) => i.id !== id));
    }
  };

  return (
    <div>
      {!showForm && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Button onClick={onCreate} variant="primary" pulse={items.length === 0}>
              Add {title.replace(/s$/, "")}
            </Button>
          </div>
          {loading ? (
            <div>Loading…</div>
          ) : (
            <div className="space-y-3 ">
              {items.length === 0 && (
                <div className="">
                  <div className="text-sm text-gray-500">
                    No {title.toLowerCase()} defined
                  </div>
                  <Button onClick={() => { setShowForm(true); }} className=" card w-sm h-48 m-auto p-auto my-8 justify-around items-center text-center border rounded-xl border-transparent flex">
                    <span>Add a {title.replace(/s$/, "")}</span>
                  </Button>
                </div>
              )}
              {items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <div className="font-medium">{it.name || "(unnamed)"}</div>
                    <div className="text-sm text-gray-500">
                      {it.serialNumber || ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onEdit(it);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => onDelete(it.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="mt-4">
          {/* custom form overrides default */}
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
              <h3 className="font-medium">
                {editing ? "Edit" : "Create"} {title.replace(/s$/, "")}
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {inferredFields.map((f) => (
                  <label
                    key={f.name}
                    className={`flex flex-col text-sm border hover:border-gray-200 rounded px-2 py-1 transition-colors ${errors[f.name] ? "border-red-500" : "border-transparent"
                      }`}
                  >
                    <span className="text-gray-600 mb-1">
                      {f.label} {f.required && "*"}
                    </span>
                    <input
                      value={form[f.name] ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [f.name]: e.target.value,
                        })
                      }
                      className="w-full outline-none"
                    />
                    {errors[f.name] && (
                      <span className="text-red-500 text-xs mt-1">
                        {errors[f.name]}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              {saveError && (
                <div className="mt-2 text-red-500 text-sm">{saveError}</div>
              )}
              <div className="mt-3 flex gap-2">
                <Button onClick={() => onSave()}>{editing ? "Save" : "Create"}</Button>
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
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ResourceManager;
