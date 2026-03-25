import React from "react";
import ResourceManagerView, { GridCol } from "../ui/ResourceManager";
import { scenesTable } from "../db/schema";
import { scenesResource } from "../db/resources";
import SceneFormView from "./SceneForm";
import { Typography } from "@mui/material";
import Badge from "../ui/Badge";
import type { SceneListItem } from "../types/shared";

const gridCols: GridCol[] = [
  {
    field: "name",
    headerName: "Name",
    render: (row) => (row as SceneListItem).name
  },
  {
    field: "robotName",
    headerName: "Robot",
    render: (row) => (row as SceneListItem).robotName || "No Robot"
  },
  {
    field: "robotModality",
    headerName: "Modality",
    render: (row) => {
      const scene = row as SceneListItem;
      if (!scene.robotModality) return <Typography variant="body2" color="text.disabled">-</Typography>;
      return (
        <Badge
          label={scene.robotModality}
          variant="outlined"
          color={scene.robotModality === 'simulated' ? 'blue' : 'green'}
          sx={{ height: 24 }}
        />
      );
    }
  },
  {
    field: "cameraCount",
    headerName: "Cameras",
    render: (row) => (row as SceneListItem).cameraCount || 0
  },
];

const ScenesView: React.FC = () => {
  return (
    <div className="p-6">
      <ResourceManagerView
        title="Scenes"
        table={scenesTable}
        resource={scenesResource}
        gridCols={gridCols}
        renderForm={(props) => <SceneFormView {...props} />}
      />
    </div>
  );
};

export default ScenesView;
