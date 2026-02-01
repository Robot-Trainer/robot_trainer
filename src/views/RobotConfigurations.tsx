import React from "react";
import ResourceManager from "../ui/ResourceManager";
import { robotConfigurationsTable } from "../db/schema";
import RobotConfigurationForm from "./RobotConfigurationForm";

const RobotsView: React.FC = () => {
  return (
    <div className="p-6">
      <ResourceManager
        title="Robot Configurations"
        table={robotConfigurationsTable}
        renderForm={(props) => <RobotConfigurationForm {...props} />}
      />
    </div>
  );
};

export default RobotsView;
