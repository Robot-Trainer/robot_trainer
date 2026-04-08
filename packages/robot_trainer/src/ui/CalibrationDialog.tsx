import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from "@mui/material";
import { calibrate, type CalibrationProcess } from "@robot-trainer/lerobot";

export interface CalibrationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (results: unknown) => void;
  robotType: string;
  /** Pre-selected WebSerial port from the parent form — skips manual port selection */
  port?: SerialPort;
  /** Serial number of the robot for identification */
  serialNumber?: string;
  /** Display name for the robot */
  robotName?: string;
}

export const CalibrationDialog: React.FC<CalibrationDialogProps> = ({
  open,
  onClose,
  onSave,
  robotType,
  port: externalPort,
  serialNumber,
  robotName,
}) => {
  const [step, setStep] = useState<"initial" | "calibrating" | "done" | "error">("initial");
  const [progressMsg, setProgressMsg] = useState("");
  const [liveData, setLiveData] = useState<Record<string, Record<string, number>>>({});
  const [errorObj, setErrorObj] = useState<unknown>(null);
  const [results, setResults] = useState<unknown>(null);
  const [calProcess, setCalProcess] = useState<CalibrationProcess | null>(null);
  const autoStarted = useRef(false);

  // Auto-start calibration when opened with a pre-selected port
  useEffect(() => {
    if (open && externalPort && step === "initial" && !autoStarted.current) {
      autoStarted.current = true;
      startCalibration(externalPort);
    }
  }, [open, externalPort]);

  const requestPort = async () => {
    try {
      const p = await navigator.serial.requestPort();
      startCalibration(p);
    } catch (err) {
      console.error(err);
      setErrorObj(err);
      setStep("error");
    }
  };

  const startCalibration = async (p: SerialPort) => {
    setStep("calibrating");
    try {
      const process = await calibrate({
        robot: {
          port: p,
          robotType: robotType as "so100_follower" | "so100_leader",
          name: robotName || robotType,
          isConnected: true,
          serialNumber: serialNumber || "",
        },
        onLiveUpdate: (data) => setLiveData(data),
        onProgress: (msg) => setProgressMsg(msg),
      });
      setCalProcess(process);
      const res = await process.result;
      setResults(res);
      setStep("done");
    } catch (err) {
      console.error(err);
      setErrorObj(err);
      setStep("error");
    }
  };

  const handleStop = () => {
    if (calProcess) {
      calProcess.stop();
    }
  };

  const handleClose = () => {
    handleStop();
    setStep("initial");
    setResults(null);
    setErrorObj(null);
    autoStarted.current = false;
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Calibrate Robot</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {step === "initial" && (
            <Box textAlign="center">
              <Typography variant="body1" paragraph>
                To calibrate your robot ({robotName || robotType}), make sure it is connected via USB.
              </Typography>
              <Button variant="contained" onClick={requestPort}>
                Select Port & Start Calibration
              </Button>
            </Box>
          )}

          {step === "calibrating" && (
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
                {progressMsg || "Calibrating..."}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {Object.entries(liveData).map(([motor, data]) => (
                  <Box key={motor} sx={{ p: 1, border: '1px solid #ccc', borderRadius: 1, minWidth: 120 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{motor}</Typography>
                    <Typography variant="body2">Current: {data.current}</Typography>
                    <Typography variant="body2">Min: {data.min}</Typography>
                    <Typography variant="body2">Max: {data.max}</Typography>
                  </Box>
                ))}
              </Box>
              <Box textAlign="center" mt={3}>
                 <Button variant="outlined" onClick={handleStop}>Finish Motion Capture</Button>
                 <Typography variant="caption" display="block" mt={1}>Click to finish moving specific motors.</Typography>
              </Box>
            </Box>
          )}

          {step === "done" && (
            <Alert severity="success">
              <Typography variant="body1">Calibration completed successfully!</Typography>
            </Alert>
          )}

          {step === "error" && (
            <Alert severity="error">
              {errorObj ? ((errorObj as Error).message || String(errorObj)) : "Unknown error occurred"}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {step === "done" ? "Close" : "Cancel"}
        </Button>
        {step === "done" && (
          <Button variant="contained" onClick={() => onSave(results)}>
            Save Calibration Results
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
