import React, { useState, useEffect } from 'react';
import { SetupWizard } from './views/SetupWizard';
import SystemSettings from './views/SystemSettings';
import Datasets from './views/Datasets';
import Robots from './views/Robots';
import RobotModels from './views/RobotModels';
import Skills from './views/Skills';
import Scenes from './views/Scenes';
import useUIStore from "./lib/uiStore";
import type { UIState } from './lib/uiStore';
import { configResource } from './db/resources';
import type { JsonObject } from './types/json';


import { Robot, Dataset, RobotConfiguration, Settings, Loader, Layout } from './icons';
import { VideoPlayer } from './ui/VideoPlayer';
import { ToastProvider } from './ui/ToastContext';
import { AdminControl } from './ui/AdminControl';

const NavItem: React.FC<{ id: string; icon: React.ComponentType<{ className?: string }>; label: string; active: string; iconClassName?: string; onClick: (id: string) => void }> = ({ id, icon: Icon, label, active, iconClassName, onClick }) => (
  <button
    id={id}
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-1 ${active === id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
    <Icon className={`h-4 w-4 ${iconClassName || ''}`} />
    {label}
  </button>
);

const InnerApp: React.FC<{ externalLoading?: boolean }> = ({ externalLoading = false }) => {
  const [activeTab, setActiveTab] = useState('scenes');

  // Check for popout mode
  const searchParams = new URLSearchParams(window.location.search);
  const popoutUrl = searchParams.get('popoutUrl');
  const popoutMode = searchParams.get('popoutMode');

  if (popoutUrl) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <VideoPlayer url={popoutUrl} className="w-full h-full object-contain" />
      </div>
    );
  }

  if (popoutMode === 'simulation') {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white/50 text-xl font-mono">
        Simulation popout is no longer supported in renderer-only mode.
      </div>
    );
  }

  const [isCheckingEnv, setIsCheckingEnv] = useState(true);
  const currentPage = useUIStore((s: UIState) => s.currentPage);
  const setCurrentPage = useUIStore((s: UIState) => s.setCurrentPage);
  const setResourceManagerShowForm = useUIStore((s: UIState) => s.setResourceManagerShowForm);
  const setConfigLocal = useUIStore((s: UIState) => s.setConfigLocal);
  const showSetupWizard = useUIStore((s: UIState) => s.showSetupWizard);
  const setShowSetupWizard = useUIStore((s: UIState) => s.setShowSetupWizard);
  const setShowSetupWizardForced = useUIStore((s: UIState) => s.setShowSetupWizardForced);

  const checkConda = async () => {
    try {
      const res = await window.electronAPI.checkAnaconda();
      if (!res.found) {
        return false;
      }
      // Check env
      const hasEnv = res.envs.some((env) => env.name === 'robot_trainer');
      if (!hasEnv) {
        return false;
      }
      // Check LeRobot
      const lr = await window.electronAPI.checkLerobot();
      return lr.installed;
    } catch {
      return false;
    }
  };


  React.useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail;
        if (typeof detail === 'string') {
          setActiveTab(detail);
          setCurrentPage(detail);
          setResourceManagerShowForm(false);
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('robottrainer:navigate', handler as EventListener);
    return () => window.removeEventListener('robottrainer:navigate', handler as EventListener);
  }, [setCurrentPage, setResourceManagerShowForm]);

  // load system config into the UI store on app init
  useEffect(() => {
    if (externalLoading) return;
    const load = async () => {
      // mark app as not idle while initial load is in progress
      try {
        window.__appIdle = false;
      } catch (error) {
        console.error(error);
      }
      try {
        const cfg = await configResource.getAll();
        const systemCfg = cfg as SystemSettings;
        window.electronAPI.replyLoadSystemSettings(systemCfg);
        setConfigLocal(cfg);
        // If config missing python/conductor settings, show the setup wizard
        try {
          // Check env while showing "Loading env..." in nav
          setIsCheckingEnv(true);
          let condaOk = false;
          try {
            condaOk = await checkConda();
          } catch (error) {
            console.error(error);
          }

          const condaRoot = typeof cfg.condaRoot === 'string' ? cfg.condaRoot : '';
          const pythonPath = typeof cfg.pythonPath === 'string' ? cfg.pythonPath : '';

          if (!condaRoot || !pythonPath || !condaOk) {
            setShowSetupWizard(true);
          }

          setIsCheckingEnv(false);
          // The main process may request the renderer to load/save settings via
          // the drizzle-backed users table. Register handlers to respond.
          if (window.electronAPI?.onRequestLoadSystemSettings) {
            // listen for main asking to load settings; reply using drizzle
            window.electronAPI.onRequestLoadSystemSettings(async () => {
              try {
                const cfg = await configResource.getAll();
                const systemCfg = cfg as SystemSettings;
                window.electronAPI.replyLoadSystemSettings(systemCfg);
                setConfigLocal(cfg);
                // Check env while showing "Loading env..." in nav
                setIsCheckingEnv(true);
                let condaOk = false;
                try {
                  condaOk = await checkConda();
                } catch (error) {
                  console.error(error);
                }

                const condaRoot = typeof cfg.condaRoot === 'string' ? cfg.condaRoot : '';
                const pythonPath = typeof cfg.pythonPath === 'string' ? cfg.pythonPath : '';

                // If config missing python/conductor settings, show the setup wizard
                if (!condaRoot || !pythonPath || !condaOk) {
                  setShowSetupWizard(true);
                }

                setIsCheckingEnv(false);
              } catch {
                window.electronAPI.replyLoadSystemSettings({} as SystemSettings);
              }
            });
          }
          if (window.electronAPI?.onRequestSaveSystemSettings) {
            window.electronAPI.onRequestSaveSystemSettings(async (settings: SystemSettings) => {
              try {
                const persistableSettings = settings as unknown as JsonObject;
                await configResource.setAll(persistableSettings);
                window.electronAPI.replySaveSystemSettings({ success: true, settings: persistableSettings });
                setConfigLocal(persistableSettings);
              } catch (e) {
                window.electronAPI.replySaveSystemSettings({ success: false, error: String(e) });
              }
            });
          }
        } catch {
          // ignore silently
        }
      } catch {
        window.electronAPI.replyLoadSystemSettings({} as SystemSettings);
      }
      // Indicate that initial app bootstrap is complete and app is idle
      try {
        window.__appIdle = true;
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, [setConfigLocal, externalLoading]);

  // subscribe to runtime updates broadcast from main when settings change externally
  useEffect(() => {
    if (window.electronAPI?.onSystemSettingsChanged) {
      // register listener exposed by preload
      const off = window.electronAPI.onSystemSettingsChanged((data: SystemSettings) => {
        setConfigLocal(data as unknown as JsonObject);
      });
      return () => off && off();
    }
    return undefined;
  }, [setConfigLocal]);

  // listen for main menu -> open setup wizard
  useEffect(() => {
    if (window.electronAPI?.onOpenSetupWizard) {
      const off = window.electronAPI.onOpenSetupWizard(() => {
        // mark as forced-open so background checks won't auto-close
        setShowSetupWizard(true);
        setShowSetupWizardForced(true);
      });
      return () => off && off();
    }
    return undefined;
  }, [setShowSetupWizard, setShowSetupWizardForced]);

  // keep local activeTab in sync with store when other parts set currentPage
  useEffect(() => {
    if (currentPage && currentPage !== activeTab) setActiveTab(currentPage);
  }, [currentPage]);

  const renderContent = () => {
    switch (activeTab) {
      case "datasets":
        return <Datasets />;
      case "scenes":
        return <Scenes />;
      case "robots":
        return <Robots />;
      case "robot-models":
        return <RobotModels />;
      case "skills":
        return <Skills />;
      case "setup":
        return <SetupWizard />;
      case "system-settings":
        return <SystemSettings />;
      default:
        return <Scenes />;
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-900">
      <aside className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="h-14 flex items-center px-6 border-b border-gray-200 bg-white">
          <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-orange-400 rounded-md mr-3 shadow-sm"></div>
          <span className="font-bold text-lg tracking-tight text-gray-800">
            Robot Trainer
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4">
          <div className="mb-8">
            <NavItem
              id="robot-models"
              icon={Robot}
              label="Robot Models"
              active={activeTab}
              onClick={(id) => {
                setActiveTab(id);
                setCurrentPage(id);
                setResourceManagerShowForm(false);
              }}
            />
            <NavItem
              id="robots"
              icon={Robot}
              label="Robots"
              active={activeTab}
              onClick={(id) => {
                setActiveTab(id);
                setCurrentPage(id);
                setResourceManagerShowForm(false);
              }}
            />
            <NavItem
              id="scenes"
              icon={RobotConfiguration}
              label="Scenes"
              active={activeTab}
              onClick={(id) => {
                setActiveTab(id);
                setCurrentPage(id);
                setResourceManagerShowForm(false);
              }}
            />
            <NavItem
              id="skills"
              icon={Layout}
              label="Skills"
              active={activeTab}
              onClick={(id) => {
                setActiveTab(id);
                setCurrentPage(id);
                setResourceManagerShowForm(false);
              }}
            />
            <NavItem
              id="datasets"
              icon={Dataset}
              label="Datasets"
              active={activeTab}
              onClick={(id) => {
                setActiveTab(id);
                setCurrentPage(id);
                setResourceManagerShowForm(false);
              }}
            />
            <NavItem
              id="system-settings"
              icon={Settings}
              label="System Settings"
              active={activeTab}
              onClick={(id) => {
                setActiveTab(id);
                setCurrentPage(id);
                setResourceManagerShowForm(false);
              }}
            />
            {(isCheckingEnv || externalLoading) && (
              <NavItem
                id="loading-env"
                icon={Loader}
                label="Loading env..."
                active=""
                iconClassName="animate-spin"
                onClick={() => {
                  setShowSetupWizard(true);
                  setShowSetupWizardForced(true);
                }}
              />
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Admin</div>
            <Settings className="ml-auto h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600" />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-scroll">
        <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center text-sm text-gray-500"></div>
          <div className="flex items-center gap-3"></div>
        </div>

        <div className="flex-1 relative">
          {renderContent()}
          {showSetupWizard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-md max-w-4xl w-full mx-4 p-4 shadow-xl">
                <SetupWizard />
                <div className="mt-3 text-right">
                  <button
                    className="text-sm text-gray-600"
                    onClick={() => {
                      setShowSetupWizard(false);
                      setShowSetupWizardForced(false);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <AdminControl />
    </div>
  );
};

const App: React.FC<{ externalLoading?: boolean }> = (props) => (
  <ToastProvider>
    <InnerApp {...props} />
  </ToastProvider>
);

export default App;
