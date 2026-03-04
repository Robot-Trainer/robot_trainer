import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import ResourceManager, { GridCol } from '../ui/ResourceManager';
import { datasetsTable, scenesTable, skillsTable } from '../db/schema';
import DatasetForm from './DatasetForm';
import { tableResource } from '../db/tableResource';
import { db } from '../db/db';
import { eq, getTableColumns } from 'drizzle-orm';

const DatasetsView: React.FC = () => {
  const resource = useMemo(() => {
    const base = tableResource(datasetsTable);
    return {
      ...base,
      list: async () => {
        const rows = await db.select({
          ...getTableColumns(datasetsTable),
          sceneName: scenesTable.name,
          skillName: skillsTable.name,
        })
          .from(datasetsTable)
          .leftJoin(scenesTable, eq(datasetsTable.sceneId, scenesTable.id))
          .leftJoin(skillsTable, eq(datasetsTable.skillId, skillsTable.id));
        return rows;
      }
    };
  }, []);

  const gridCols: GridCol[] = [
    { field: 'name', headerName: 'Name' },
    { field: 'sceneName', headerName: 'Scene' },
    { field: 'skillName', headerName: 'Skill' },
    {
      field: 'createdAt',
      headerName: 'Created At',
      render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ''
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <ResourceManager
        title="Datasets"
        table={datasetsTable}
        resource={resource}
        gridCols={gridCols}
        renderForm={(props) => <DatasetForm {...props} />}
      />
    </Box>
  );
};

export default DatasetsView;
