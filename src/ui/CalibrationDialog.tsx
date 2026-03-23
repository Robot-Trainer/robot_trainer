import React, { useState,  } from "react";
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
import { calibrate } from "@robot-trainer/lerobotjs-web";

interface CalibrationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (results: unknown) => void;
  robotType: string;
}

export const CalibrationDialog: React.FC<CalibrationDialogProps> = ({
  open,
  onClose,
  onSave,
  robotType,
}) => {
  const [step, setStep] = useState<"initial" | "calibrating" | "done" | "error">("initial");
  const [_, setPort] = useState<unknown>(null);
  const [progressMsg, setProgressMsg] = useState("");
  const [liveData, setLiveData] = useState<Record<string, Record<string, number>>>({});
  const [errorObj, setErrorObj] = useState<unknown>(null);
  const [results, setResults] = useState<unknown>(null);
  const [calProcess, setCalProcess] = useState<unknown>(null);

  const requestPort = async () => {
    try {
      const p = await navigator.serial.requestPort();
      setPort(p);
      startCalibration(p);
    } catch (err) {
      console.error(err);
      setErrorObj(err);
      setStep("error");
    }
  };

  const startCalibration = async (p: unknown) => {
    setStep("calibrating");
    try {
      const process = await calibrate({
        robot: { robotType, port: p },
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
    setPort(null);
    setResults(null);
    setErrorObj(null);
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
                To calibrate your robot ({robotType}), make sure it is connected via USB.
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
              {errorObj ? (errorObj.message || String(errorObj)) : "Unknown error occurred"}
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
