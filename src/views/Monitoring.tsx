import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Stack,
  Box,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  AccessTime as AccessTimeIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { MOCK_LINES } from '../constants/mockData';

const MonitoringView: React.FC = () => {
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setLines(MOCK_LINES);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'active':
        return <Chip icon={<CheckCircleIcon />} label="Active" color="success" size="small" />;
      case 'warning':
        return <Chip icon={<WarningIcon />} label="Warning" color="warning" size="small" />;
      case 'error':
        return <Chip icon={<ErrorIcon />} label="Error" color="error" size="small" />;
      default:
        return <Chip icon={<AccessTimeIcon />} label={status} size="small" />;
    }
  };

  const getRobotStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon color="success" fontSize="small" />;
      case 'warning': return <WarningIcon color="warning" fontSize="small" />;
      case 'error': return <ErrorIcon color="error" fontSize="small" />;
      default: return <AccessTimeIcon color="action" fontSize="small" />;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error': return <ErrorIcon color="error" fontSize="small" />;
      case 'warning': return <WarningIcon color="warning" fontSize="small" />;
      case 'info': return <InfoIcon color="info" fontSize="small" />;
      default: return <AccessTimeIcon color="action" fontSize="small" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={24} />
          <Typography color="textSecondary">Loading monitoring data...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3, height: '100%', overflowY: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Manufacturing Monitoring
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Real-time status of all assembly lines
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {lines.map(line => (
          <Grid item xs={12} md={6} lg={4} key={line.id}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" component="h2">{line.name}</Typography>
                  {getStatusChip(line.status)}
                </Stack>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Robots
                  </Typography>
                  <Stack spacing={1}>
                    {line.robots.map((robot: any) => (
                      <Paper key={robot.id} variant="outlined" sx={{ p: 1, bgcolor: 'background.default' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">{robot.name}</Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {getRobotStatusIcon(robot.status)}
                            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                              {robot.status}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Notifications
                  </Typography>
                  <Stack spacing={1}>
                    {line.notifications.length === 0 ? (
                      <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                        No notifications
                      </Typography>
                    ) : (
                      line.notifications.map((notification: any) => (
                        <Paper key={notification.id} variant="outlined" sx={{ p: 1, bgcolor: 'background.default' }}>
                          <Stack direction="row" spacing={1} alignItems="flex-start">
                            <Box sx={{ mt: 0.5 }}>
                              {getNotificationIcon(notification.type)}
                            </Box>
                            <Box>
                              <Typography variant="body2" sx={{ lineHeight: 1.3 }}>
                                {notification.message}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {notification.timestamp}
                              </Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      ))
                    )}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default MonitoringView;
