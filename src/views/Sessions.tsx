import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import ResourceManager, { GridCol } from '../ui/ResourceManager';
import { sessionsTable, scenesTable, skillsTable } from '../db/schema';
import SessionForm from './SessionForm';
import { tableResource } from '../db/tableResource';
import { db } from '../db/db';
import { eq, getTableColumns } from 'drizzle-orm';

const SessionsView: React.FC = () => {
  const resource = useMemo(() => {
    const base = tableResource(sessionsTable);
    return {
      ...base,
      list: async () => {
        const rows = await db.select({
          ...getTableColumns(sessionsTable),
          sceneName: scenesTable.name,
          skillName: skillsTable.name,
        })
          .from(sessionsTable)
          .leftJoin(scenesTable, eq(sessionsTable.sceneId, scenesTable.id))
          .leftJoin(skillsTable, eq(sessionsTable.skillId, skillsTable.id));
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
        title="Sessions"
        table={sessionsTable}
        resource={resource}
        gridCols={gridCols}
        renderForm={(props) => <SessionForm {...props} />}
      />
    </Box>
  );
};

export default SessionsView;
