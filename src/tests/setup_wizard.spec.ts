import { expect } from '@playwright/test';
import { test } from './fixtures';
import { dismissSetupWizard } from './helpers';

test.describe('Robot Configuration Wizard', () => {
  test.beforeEach(async ({ window }) => {
    await dismissSetupWizard(window);
    // default renderer-side handlers
    await window.evaluate(() => {
      // @ts-ignore
      if (window.electronAPI && window.electronAPI.onRequestSaveSystemSettings) {
        // @ts-ignore
        window.electronAPI.onRequestSaveSystemSettings((settings: any) => {
          // @ts-ignore
          window.electronAPI.replySaveSystemSettings({ success: true, settings });
        });
      }
    });
  });

  test('Robot Configuration Flow', async ({ window, setIpcHandlers }) => {
    await setIpcHandlers({
      'scan-serial-ports': async () => {
        return [
          { path: '/dev/ttyUSB0', manufacturer: 'Acme Robotics', serialNumber: 'ACM1234' },
          { path: '/dev/ttyUSB1', manufacturer: 'RobCo', serialNumber: 'RBX-999' },
        ];
      },
      'save-robot-config': async () => ({ ok: true }),
    });

    // Navigate to Robots -> Add Robot -> Create
    await window.click('text=Robots');
    await window.waitForSelector('text=Robots');
    await window.click('text=Add Robot');
    await window.click('text=Create');
    
    // Expect "Robot Setup" title
    await window.waitForSelector('text=Robot Setup');

    // 1. Follower Configuration
    // Select "Real Robot" (default)
    // Click "Configure"
    await window.click('button:has-text("Configure")'); // First one is for Follower
    
    // Wait for Modal
    await window.waitForSelector('text=Configure Robot Devices');
    
    // Click "Scan Ports" inside modal
    await window.click('text=Scan Ports');
    await window.waitForSelector('text=Port: /dev/ttyUSB0');
    
    // Select Follower
    await window.locator('text=Use as Follower').first().click();
    
    // Confirm
    await window.click('text=Confirm Selection');
    
    // Verify Modal closed and config displayed
    await expect(window.locator('text=Configure Robot Devices')).toHaveCount(0);
    await window.waitForSelector('text=Acme Robotics (/dev/ttyUSB0)');

    // 2. Leader Configuration
    // Select "Real Robot Teleoperation"
    const leaderSection = window.locator('section:has-text("Leader Arm")');
    await leaderSection.locator('select').first().selectOption('real');

    // Click "Configure" for Leader
    await leaderSection.locator('button:has-text("Configure")').click();
    
    // Wait for Modal
    await window.waitForSelector('text=Configure Robot Devices');
    
    // Select Leader
    const cards = window.locator('div.serial-port-card:has-text("Port: /dev/ttyUSB1")');
    await cards.locator('text=Use as Leader').click();
    
    // Confirm
    await window.click('text=Confirm Selection');
    
    // Verify Leader Config
    await window.waitForSelector('text=RobCo (/dev/ttyUSB1)');

    // 3. Camera Configuration
    await window.click('text=Configure Cameras');
    await window.waitForSelector('text=Configure Cameras'); // Modal title
    
    // Add Camera
    await window.fill('input[placeholder="Camera name"]', 'TestCam');
    await window.click('text=Add Camera');
    
    // Save Cameras
    await window.click('text=Save Configuration'); // In modal
    
    // Verify Camera listed
    await window.waitForSelector('text=TestCam (1280x720, 30fps)');

    // 4. Save All
    await window.click('button:has-text("Save Configuration")'); // Main button
    
    // Expect form to close
    await expect(window.locator('text=Robot Setup')).toHaveCount(0);
  });
});
