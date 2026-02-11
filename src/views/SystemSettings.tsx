import React, { useEffect, useState } from 'react';
import { Card, CardContent, Container, Typography, Stack, TextField, IconButton, Alert, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { configResource } from '../db/resources';

interface SystemSettingsShape {
  pythonPath?: string;
  venvPath?: string;
  extraPath?: string; // newline separated
  envVars?: { key: string; value: string }[];
}

const defaultSettings: SystemSettingsShape = {
  pythonPath: '',
  venvPath: '',
  extraPath: '',
  envVars: [],
};

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettingsShape>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const loaded = await configResource.getAll();
        if (loaded && typeof loaded === 'object') setSettings(loaded as SystemSettingsShape);
      } catch (err) {
        // ignore
      }
    };
    load();
    // subscribe to external changes
    const unsub = (window as any).electronAPI?.onSystemSettingsChanged
      ? (window as any).electronAPI.onSystemSettingsChanged((data: any) => {
        if (data && typeof data === 'object') setSettings(data as SystemSettingsShape);
      })
      : null;
    return () => { if (unsub) unsub(); };
  }, []);

  const update = (patch: Partial<SystemSettingsShape>) => {
    setSettings(prev => ({ ...(prev || {}), ...patch }));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await configResource.setAll(settings);
      if ((window as any).electronAPI?.saveSystemSettings) {
        const res = await (window as any).electronAPI.saveSystemSettings(settings);
        if (res && res.success === false) {
          throw new Error(res.error || 'Unknown error');
        }
      }
      setMessage('Settings saved');
    } catch (err) {
      setMessage(`Failed to save settings: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const setEnvVar = (idx: number, field: 'key' | 'value', value: string) => {
    const envVars = (settings.envVars || []).slice();
    envVars[idx] = { ...(envVars[idx] || { key: '', value: '' }), [field]: value };
    update({ envVars });
  };

  const addEnvVar = () => {
    update({ envVars: [...(settings.envVars || []), { key: '', value: '' }] });
  };

  const removeEnvVar = (idx: number) => {
    const envVars = (settings.envVars || []).slice();
    envVars.splice(idx, 1);
    update({ envVars });
  };

  return (
    <Container maxWidth="md" sx={{ pt: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h2" gutterBottom>
          System Settings
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Configure Python interpreter and system-level environment variables
        </Typography>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Input
                label="Python Interpreter Path"
                value={settings.pythonPath || ''}
                onChange={(e: any) => update({ pythonPath: e.target.value })}
                placeholder="/usr/bin/python3 or C:\\Python39\\python.exe"
              />
              <Typography variant="caption" color="textSecondary">
                Full path to the Python interpreter to use for jobs.
              </Typography>
            </Box>

            <Box>
              <Input
                label="Virtual Environment Path"
                value={settings.venvPath || ''}
                onChange={(e: any) => update({ venvPath: e.target.value })}
                placeholder="/home/user/.venv/myenv"
              />
              <Typography variant="caption" color="textSecondary">
                Optional: point to a virtual environment to use.
              </Typography>
            </Box>

            <Box>
              <TextField
                label="Extra PATH entries"
                multiline
                rows={3}
                value={settings.extraPath || ''}
                onChange={(e) => update({ extraPath: e.target.value })}
                placeholder={"/opt/bin\n/other/bin"}
                fullWidth
                variant="outlined"
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                Add extra directories (one per line) to prepend to PATH for subprocesses.
              </Typography>
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Environment Variables</Typography>
                <Button variant="ghost" onClick={addEnvVar}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AddIcon fontSize="small" />
                    <span>Add Variable</span>
                  </Stack>
                </Button>
              </Stack>

              <Stack spacing={2}>
                {(settings.envVars || []).map((env, idx) => (
                  <Stack key={idx} direction="row" spacing={2} alignItems="center">
                    <Box sx={{ flex: 1 }}>
                      <Input
                        label="Key"
                        value={env.key}
                        onChange={(e: any) => setEnvVar(idx, 'key', e.target.value)}
                        placeholder="MY_ENV_VAR"
                        className="mb-0" // override Input's default margin
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Input
                        label="Value"
                        value={env.value}
                        onChange={(e: any) => setEnvVar(idx, 'value', e.target.value)}
                        placeholder="Value..."
                        className="mb-0" // override Input's default margin
                      />
                    </Box>
                    <IconButton onClick={() => removeEnvVar(idx)} color="error" size="small">
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}
                {(settings.envVars || []).length === 0 && (
                  <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                    No environment variables defined.
                  </Typography>
                )}
              </Stack>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>

            {message && (
              <Alert severity={message.includes('Failed') ? 'error' : 'success'}>
                {message}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};

export default SystemSettings;
