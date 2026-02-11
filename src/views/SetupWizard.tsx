import React, { useEffect, useState, useRef } from 'react';
import Button from '../ui/Button';
import { ChevronRight, CheckCircle, Loader } from '../icons';
import useUIStore from '../lib/uiStore';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Box } from '@mui/material';

// Local icon components
const XCircle = (props: any) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const OutputLog = ({ output, status }: { output: string | null, status: string }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  if (!output && status !== 'loading') return null;

  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <div className="bg-gray-900 rounded-md p-3 shadow-inner max-h-64 overflow-y-auto" ref={scrollRef}>
        <pre className="font-mono text-xs text-green-400 whitespace-pre-wrap break-all">
          {output}
          {status === 'loading' && <span className="animate-pulse">_</span>}
        </pre>
      </div>
    </div>
  );
};

const SetupAccordionItem = ({ title, expanded, onChange, status, children, output }: any) => {
  return (
    <Accordion expanded={expanded} onChange={onChange} disableGutters elevation={0} sx={{ border: '1px solid #e5e7eb', mb: 1, borderRadius: '8px !important', '&:before': { display: 'none' } }}>
      <AccordionSummary
        expandIcon={<ChevronRight className="w-5 h-5 text-gray-400 rotate-90" />}
        aria-controls={`${title}-content`}
        id={`${title}-header`}
        sx={{
          backgroundColor: expanded ? '#eff6ff' : 'white', // blue-50
          borderRadius: '8px',
          '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 2 }
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          {status === 'complete' ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : status === 'error' ? (
            <XCircle className="w-6 h-6 text-red-500" />
          ) : status === 'loading' ? (
            <Loader className="w-6 h-6 text-blue-500 animate-spin" />
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-gray-200" />
          )}
          <Typography variant="h6" className={status === 'pending' ? 'text-gray-500' : 'text-gray-900'} sx={{ fontSize: '1.125rem', fontWeight: 500 }}>
            {title}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ borderTop: '1px solid #dbeafe', p: 2 }}>
        <div className="text-gray-600 leading-relaxed">
          {children}
        </div>
        <OutputLog output={output} status={status} />
      </AccordionDetails>
    </Accordion>
  );
};

export const SetupWizard: React.FC = () => {
  // Accordion state
  const [expandedItem, setExpandedItem] = useState<number | null>(1);

  const handleAccordionChange = (panel: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedItem(isExpanded ? panel : null);
  };

  // Step 1: Miniconda
  const [condaStatus, setCondaStatus] = useState<'pending' | 'loading' | 'complete' | 'error'>('pending');
  const [condaResult, setCondaResult] = useState<any>(null);
  const [condaError, setCondaError] = useState<string | null>(null);
  const [condaOutput, setCondaOutput] = useState<string | null>(null);

  // Step 2: Env
  const [envStatus, setEnvStatus] = useState<'pending' | 'loading' | 'complete' | 'error'>('pending');
  const [envError, setEnvError] = useState<string | null>(null);
  const [envOutput, setEnvOutput] = useState<string | null>(null);

  // Step 3: LeRobot
  const [lerobotStatus, setLerobotStatus] = useState<'pending' | 'loading' | 'complete' | 'error'>('pending');
  const [lerobotError, setLerobotError] = useState<string | null>(null);
  const [lerobotOutput, setLerobotOutput] = useState<string | null>(null);

  // Store actions
  const setCurrentPage = useUIStore((s: any) => s.setCurrentPage);
  const setResourceManagerShowForm = useUIStore((s: any) => s.setResourceManagerShowForm);
  const setShowSetupWizard = useUIStore((s: any) => s.setShowSetupWizard);
  const showSetupWizardForced = useUIStore((s: any) => s.showSetupWizardForced);
  const setShowSetupWizardForced = useUIStore((s: any) => s.setShowSetupWizardForced);

  // Initial check on mount
  useEffect(() => {
    checkConda();
  }, []);

  // Listen for logs
  useEffect(() => {
    const off1 = (window as any).electronAPI.onInstallMinicondaOutput((data: any) => setCondaOutput(p => (p || '') + data));
    const off2 = (window as any).electronAPI.onCreateAnacondaEnvOutput((data: any) => setEnvOutput(p => (p || '') + data));
    const off3 = (window as any).electronAPI.onInstallLerobotOutput((data: any) => setLerobotOutput(p => (p || '') + data));
    return () => { off1(); off2(); off3(); };
  }, []);

  // Auto-close on success
  useEffect(() => {
    if (condaStatus === 'complete' && envStatus === 'complete' && lerobotStatus === 'complete') {
      const timer = setTimeout(() => {
        if (!showSetupWizardForced) setShowSetupWizard(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [condaStatus, envStatus, lerobotStatus, setShowSetupWizard, showSetupWizardForced]);

  const checkConda = async () => {
    setCondaStatus('loading');
    try {
      const res = await (window as any).electronAPI.checkAnaconda();
      setCondaResult(res);
      if (res.found) {
        setCondaStatus('complete');
        // Check env
        const hasEnv = res.envs.some((e: any) => e.name === 'robot_trainer');
        if (hasEnv) {
          setEnvStatus('complete');
          // Save valid config
          const env = res.envs.find((e: any) => e.name === 'robot_trainer');
          if (env && env.pythonPath) {
            await (window as any).electronAPI.saveSystemSettings({ pythonPath: env.pythonPath, condaRoot: res.path });
          }
          // Check LeRobot
          setLerobotStatus('loading');
          const lr = await (window as any).electronAPI.checkLerobot();
          if (lr.installed) {
            setLerobotStatus('complete');
            setExpandedItem(null);
          } else {
            setLerobotStatus('pending');
            setExpandedItem(3);
          }
        } else {
          setEnvStatus('pending');
          setExpandedItem(2);
        }
      } else {
        setCondaStatus('pending');
        setExpandedItem(1);
      }
    } catch (e) {
      setCondaError(String(e));
      setCondaStatus('error');
    }
  };

  const handleInstallMiniconda = async (): Promise<boolean> => {
    setCondaStatus('loading'); setCondaError(null); setCondaOutput('');
    try {
      const res = await (window as any).electronAPI.installMiniconda();
      if (res.output) setCondaOutput(res.output);
      if (res.success) {
        await checkConda();
        return true;
      } else {
        setCondaError(res.error || 'Installation failed');
        setCondaStatus('error');
        return false;
      }
    } catch (e) {
      setCondaError(String(e));
      setCondaStatus('error');
      return false;
    }
  };

  const handleCreateEnv = async (): Promise<boolean> => {
    setEnvStatus('loading'); setEnvError(null); setEnvOutput('');
    try {
      const res = await (window as any).electronAPI.createAnacondaEnv('robot_trainer');
      if (res.output) setEnvOutput(res.output);
      if (res.success) {
        setEnvStatus('complete');
        // Refresh conda info
        const condaRes = await (window as any).electronAPI.checkAnaconda();
        setCondaResult(condaRes);
        const env = condaRes.envs.find((e: any) => e.name === 'robot_trainer');
        if (env && env.pythonPath) {
          await (window as any).electronAPI.saveSystemSettings({ pythonPath: env.pythonPath, condaRoot: condaRes.path });
        }
        return true;
      } else {
        setEnvError(res.output || 'Creation failed');
        setEnvStatus('error');
        return false;
      }
    } catch (e) {
      setEnvError(String(e));
      setEnvStatus('error');
      return false;
    }
  };

  const handleInstallLerobot = async (): Promise<boolean> => {
    setLerobotStatus('loading'); setLerobotError(null); setLerobotOutput('');
    try {
      const res = await (window as any).electronAPI.installLerobot();
      if (res.output) setLerobotOutput(res.output);
      if (res.success) {
        setLerobotStatus('complete');
        return true;
      } else {
        setLerobotError(res.error || res.output || 'Installation failed');
        setLerobotStatus('error');
        return false;
      }
    } catch (e) {
      setLerobotError(String(e));
      setLerobotStatus('error');
      return false;
    }
  };

  const runAutoSetup = async () => {
    // 1. Conda
    let step1Success = condaStatus === 'complete';
    if (!step1Success) {
      setExpandedItem(1);
      step1Success = await handleInstallMiniconda();
    }
    if (!step1Success) return;

    // 2. Env
    const condaRes = await (window as any).electronAPI.checkAnaconda();
    const hasEnv = condaRes.envs.some((e: any) => e.name === 'robot_trainer');

    if (!hasEnv) {
      setExpandedItem(2);
      const step2Success = await handleCreateEnv();
      if (!step2Success) return;
    }

    // 3. LeRobot
    const lr = await (window as any).electronAPI.checkLerobot();
    if (!lr.installed) {
      setExpandedItem(3);
      const step3Success = await handleInstallLerobot();
      if (!step3Success) return;
    }

    setExpandedItem(null);
  };

  const isRunning = condaStatus === 'loading' || envStatus === 'loading' || lerobotStatus === 'loading';
  const allComplete = condaStatus === 'complete' && envStatus === 'complete' && lerobotStatus === 'complete';

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-full py-10 px-6">
      <div className="text-center mb-10">
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Environment Setup
        </Typography>
        <p className="text-gray-500">
          We'll get everything ready for you.
        </p>
      </div>

      <div className="flex-1 space-y-4">
        {/* Step 1 */}
        <SetupAccordionItem
          title="Miniconda Installation"
          expanded={expandedItem === 1}
          onChange={handleAccordionChange(1)}
          status={condaStatus}
          output={condaOutput}
        >
          {condaStatus === 'complete' ? (
            <span>Found existing installation at <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{condaResult?.path}</code>.</span>
          ) : (
            <>
              Checks for <strong>Miniconda</strong>. If missing, it will be downloaded and installed to manage Python packages.
              {condaError && <div className="mt-2 text-red-600 bg-red-50 p-2 rounded text-sm">{condaError}</div>}
            </>
          )}
        </SetupAccordionItem>

        {/* Step 2 */}
        <SetupAccordionItem
          title="Python Environment Setup"
          expanded={expandedItem === 2}
          onChange={handleAccordionChange(2)}
          status={envStatus}
          output={envOutput}
        >
          {envStatus === 'complete' ? (
            <span>Environment <code className="text-blue-600 font-medium">robot_trainer</code> is ready.</span>
          ) : (
            <>
              Creates a dedicated Python environment (<code className="text-blue-600">robot_trainer</code>) to keep dependencies isolated and organized.
              {envError && <div className="mt-2 text-red-600 bg-red-50 p-2 rounded text-sm">{envError}</div>}
            </>
          )}
        </SetupAccordionItem>

        {/* Step 3 */}
        <SetupAccordionItem
          title="LeRobot Library Installation"
          expanded={expandedItem === 3}
          onChange={handleAccordionChange(3)}
          status={lerobotStatus}
          output={lerobotOutput}
        >
          {lerobotStatus === 'complete' ? (
            <span>All required libraries are installed.</span>
          ) : (
            <>
              Installs the <strong>LeRobot</strong> library and other necessary tools into the environment.
              {lerobotError && <div className="mt-2 text-red-600 bg-red-50 p-2 rounded text-sm">{lerobotError}</div>}
            </>
          )}
        </SetupAccordionItem>
      </div>

      <div className="mt-8 flex justify-center">
        {!allComplete && (
          <Button
            onClick={runAutoSetup}
            disabled={isRunning}
            className="w-full max-w-sm py-3 text-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            {isRunning ? 'Setting up...' : 'Start Setup'}
          </Button>
        )}
        {allComplete && (
          <Button
            variant="ghost"
            onClick={() => {
              setResourceManagerShowForm(false);
              setCurrentPage('robots');
              setShowSetupWizard(false);
              try { setShowSetupWizardForced(false); } catch (e) { }
            }}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            Setup Complete. Close Wizard →
          </Button>
        )}
      </div>

      {/* Optional fallback close/back if stuck */}
      {(!isRunning && !allComplete) && (
        <div className="text-center mt-4">
          <button
            onClick={() => {
              setShowSetupWizard(false);
              try { setShowSetupWizardForced(false); } catch (e) { }
            }}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Skip / Close
          </button>
        </div>
      )}
    </div>
  );
};
