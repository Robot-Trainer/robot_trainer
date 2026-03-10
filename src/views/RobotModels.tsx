import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import ResourceManager, { type GridCol } from '../ui/ResourceManager';
import { robotModelsTable } from '../db/schema';

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

const modalityChipColor = (modality: string): 'success' | 'primary' | 'default' => {
  if (modality === 'real') return 'success';
  if (modality === 'simulated') return 'primary';
  return 'default';
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
        <Stack direction="row" spacing={0.5}>
          {modalities.map((modality: string) => (
            <Chip
              key={modality}
              size="small"
              variant="outlined"
              label={modality}
              color={modalityChipColor(modality)}
            />
          ))}
        </Stack>
      );
    },
  },
  {
    field: 'jointCount',
    headerName: 'Joints',
    render: (row) => {
      const properties = parseProperties(row.properties);
      return <Typography>{getJointCount(properties)}</Typography>;
    },
  },
  {
    field: 'hasGripper',
    headerName: 'Has Gripper',
    render: (row) => {
      const properties = parseProperties(row.properties);
      const hasGripper = properties.hasGripper === true;
      return (
        <Chip
          size="small"
          variant="outlined"
          label={hasGripper ? 'Yes' : 'No'}
          color={hasGripper ? 'success' : 'default'}
        />
      );
    },
  },
  {
    field: 'actuatorCount',
    headerName: 'Actuators',
    render: (row) => {
      const properties = parseProperties(row.properties);
      return <Typography>{getActuatorCount(properties)}</Typography>;
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
