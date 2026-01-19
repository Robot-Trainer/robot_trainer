import React from "react";
import ResourceManager from "../ui/ResourceManager";
import { robotConfigurationsTable } from "../db/schema";
import RobotConfigurationWizard from "./RobotConfigurationWizard";

const RobotConfigurationFields = [
  { name: "serialNumber", label: "Serial Number" },
  { name: "name", label: "Name" },
  { name: "notes", label: "Notes" },
];

const RobotsView: React.FC = () => {
  return (
    <div className="p-6">
      <ResourceManager
        title="Robot Configurations"
        table={robotConfigurationsTable}
        renderForm={(props) => <RobotConfigurationWizard {...props} />}
      />
    </div>
  );
};

export default RobotsView;
