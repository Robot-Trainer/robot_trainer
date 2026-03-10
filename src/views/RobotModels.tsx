import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import ResourceManager, { type GridCol } from '../ui/ResourceManager';
import { robotModelsTable } from '../db/schema';
import Badge from '../ui/Badge';

export const robotModelFields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'dirName', label: 'Dir Name', required: true },
  { name: 'className', label: 'Class Name', required: true },
  { name: 'configClassName', label: 'Config Class Name', required: true },
  { name: 'properties', label: 'Properties', defaultValue: '{}' },
  { name: 'modelXml', label: 'Model XML' },
  { name: 'modelPath', label: 'Model Path' },
  { name: 'modelFormat', label: 'Model Format' },
];

function parseProperties(properties: unknown): Record<string, unknown> {
  if (!properties) return {};

  if (typeof properties === 'string') {
    try {
      return JSON.parse(properties) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (typeof properties === 'object') {
    return properties as Record<string, unknown>;
  }

  return {};
}

function getJointCount(properties: Record<string, unknown>): number {
  const jointNames = properties.jointNames;
  if (Array.isArray(jointNames)) {
    return jointNames.length;
  }

  const numJoints = properties.numJoints;
  return typeof numJoints === 'number' ? numJoints : 0;
}

function getActuatorCount(properties: Record<string, unknown>): number {
  const actuatorNames = properties.actuatorNames;
  return Array.isArray(actuatorNames) ? actuatorNames.length : 0;
}

const modalityBadgeColor = (modality: string): 'green' | 'blue' | 'gray' => {
  if (modality === 'real') return 'green';
  if (modality === 'simulated') return 'blue';
  return 'gray';
};

const robotModelGridCols: GridCol[] = [
  { field: 'name', headerName: 'Name' },
  {
    field: 'supportedModalities',
    headerName: 'Modality',
    render: (row) => {
      const modalities = Array.isArray(row.supportedModalities)
        ? row.supportedModalities
        : [];

      if (modalities.length === 0) {
        return <Typography color="text.secondary">-</Typography>;
      }

      return (
          modalities.map((modality: string) => (
            <Badge
              key={modality}
              variant="outlined"
              label={modality}
              color={modalityBadgeColor(modality)}
            />
          ))
      );
    },
  },
  {
    field: 'jointCount',
    headerName: 'Joints',
    render: (row) => {
      const properties = parseProperties(row.properties);
      return getJointCount(properties);
    },
  },
  {
    field: 'hasGripper',
    headerName: 'Has Gripper',
    render: (row) => {
      const properties = parseProperties(row.properties);
      const hasGripper = properties.hasGripper === true;
      return (
        <Badge
          variant="outlined"
          label={hasGripper ? 'Yes' : 'No'}
          color={hasGripper ? 'green' : 'gray'}
        />
      );
    },
  },
  {
    field: 'actuatorCount',
    headerName: 'Actuators',
    render: (row) => {
      const properties = parseProperties(row.properties);
      return getActuatorCount(properties);
    },
  },
];

const RobotModelsView: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <ResourceManager
        title="Robot Models"
        table={robotModelsTable}
        fields={robotModelFields}
        gridCols={robotModelGridCols}
      />
    </Box>
  );
};

export default RobotModelsView;
