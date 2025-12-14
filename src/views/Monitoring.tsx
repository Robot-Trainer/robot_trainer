import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-lg text-gray-500">Loading monitoring data...</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Manufacturing Monitoring</h1>
        <p className="text-gray-500">Real-time status of all assembly lines</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lines.map(line => (
          <Card key={line.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{line.name}</h2>
              <div className="flex items-center">
                {getStatusIcon(line.status)}
                <span className="ml-2 capitalize">{line.status}</span>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Robots</h3>
              <div className="space-y-2">
                {line.robots.map((robot: any) => (
                  <div key={robot.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{robot.name}</span>
                    <div className="flex items-center">
                      {getStatusIcon(robot.status)}
                      <span className="ml-1 text-xs capitalize">{robot.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Notifications</h3>
              <div className="space-y-2">
                {line.notifications.length === 0 ? (
                  <p className="text-sm text-gray-500">No notifications</p>
                ) : (
                  line.notifications.map((notification: any) => (
                    <div key={notification.id} className="flex items-start p-2 bg-gray-50 rounded">
                      {getNotificationIcon(notification.type)}
                      <div className="ml-2">
                        <p className="text-sm">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.timestamp}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MonitoringView;
