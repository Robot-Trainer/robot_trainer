import React, { useState, useRef } from 'react';
import { Button, ButtonGroup, MenuItem, ClickAwayListener, Grow, Paper, Popper, MenuList } from '@mui/material';
import { ArrowDropDown as ArrowDropDownIcon } from '@mui/icons-material';
import { db } from "../db/db";
import { 
  userConfigTable, robotModelsTable, robotsTable, teleoperatorsTable, scenesTable, 
  camerasTable, teleoperatorModelsTable, sceneRobotsTable, sceneCamerasTable, 
  sceneTeleoperatorsTable, skillsTable, sessionsTable, episodesTable 
} from "../db/schema";
import { seedRobotModels } from "../db/seed_robot_models";
import { seedTeleoperators } from "../db/seed_teleoperators";

export const AdminControl = () => {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLDivElement>(null);
    const [isReseeding, setIsReseeding] = useState(false);
  
    const handleToggle = () => {
      setOpen((prevOpen) => !prevOpen);
    };
  
    const handleClose = (event: Event | React.SyntheticEvent) => {
      if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
        return;
      }
      setOpen(false);
    };
  
    const handleAdminClick = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).electronAPI.openAdminWindow('robot-trainer');
      } catch (e) {
        console.error('Failed to open admin window', e);
      }
    };
  
    const handleReseed = async () => {
      if (!confirm("Are you sure you want to clear the entire database and reseed? This action cannot be undone.")) return;
  
      setIsReseeding(true);
      try {
        console.log("Starting database reseed...");
        await db.delete(episodesTable);
        await db.delete(sessionsTable);
        await db.delete(sceneTeleoperatorsTable);
        await db.delete(sceneCamerasTable);
        await db.delete(sceneRobotsTable);
        await db.delete(skillsTable);
        await db.delete(teleoperatorsTable);
        await db.delete(teleoperatorModelsTable);
        await db.delete(camerasTable);
        await db.delete(robotsTable);
        await db.delete(robotModelsTable);
        await db.delete(scenesTable);
        await db.delete(userConfigTable);
  
        console.log("Tables cleared. Seeding...");
        await seedRobotModels();
        await seedTeleoperators();
        console.log("Seed complete.");
        alert("Database reseeded successfully. You may need to reload the app.");
      } catch (e) {
        console.error("Failed to reseed database:", e);
        alert("Failed to reseed database. Check console for details.");
      } finally {
        setIsReseeding(false);
        setOpen(false);
      }
    };
  
    if (!import.meta.env.DEV) {
      return null;
    }
  
    return (
      <div className="fixed bottom-4 right-4 z-50 rounded-md shadow-lg bg-white">
         <ButtonGroup variant="contained" ref={anchorRef} aria-label="split button">
          <Button onClick={handleAdminClick} disabled={isReseeding}>
            {isReseeding ? "Reseeding..." : "Admin"}
          </Button>
          <Button
            size="small"
            aria-controls={open ? 'split-button-menu' : undefined}
            aria-expanded={open ? 'true' : undefined}
            aria-label="select merge strategy"
            aria-haspopup="menu"
            onClick={handleToggle}
            disabled={isReseeding}
          >
            <ArrowDropDownIcon />
          </Button>
        </ButtonGroup>
        <Popper
          sx={{
            zIndex: 1500
          }}
          open={open}
          anchorEl={anchorRef.current}
          role={undefined}
          transition
          disablePortal
        >
          {({ TransitionProps, placement }) => (
            <Grow
              {...TransitionProps}
              style={{
                transformOrigin:
                  placement === 'bottom' ? 'center top' : 'center bottom',
              }}
            >
              <Paper>
                <ClickAwayListener onClickAway={handleClose}>
                  <MenuList id="split-button-menu" autoFocusItem>
                    <MenuItem onClick={handleReseed}>
                      Reseed Database
                    </MenuItem>
                  </MenuList>
                </ClickAwayListener>
              </Paper>
            </Grow>
          )}
        </Popper>
      </div>
    );
  };
