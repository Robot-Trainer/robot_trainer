import React from "react";
import ResourceManager from "../ui/ResourceManager";
import { skillsTable } from "../db/schema";

const SkillsView: React.FC = () => {
  return (
    <div className="p-6">
      <ResourceManager
        title="Skills"
        table={skillsTable}
      />
    </div>
  );
};

export default SkillsView;
