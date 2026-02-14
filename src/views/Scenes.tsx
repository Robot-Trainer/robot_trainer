import React from "react";
import ResourceManager from "../ui/ResourceManager";
import { scenesTable } from "../db/schema";
import SceneForm from "./SceneForm";

const ScenesView: React.FC = () => {
  return (
    <div className="p-6">
      <ResourceManager
        title="Scenes"
        table={scenesTable}
        renderForm={(props) => <SceneForm {...props} />}
      />
    </div>
  );
};

export default ScenesView;
