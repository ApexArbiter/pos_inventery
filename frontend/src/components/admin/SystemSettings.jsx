import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Database,
  Bell,
  Globe,
  Key,
  Users,
  Server,
  Save,
  Edit,
  X,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

const SystemSettings = () => {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [systemData, setSystemData] = useState({
    general: {
      systemName: 'SuperMarket POS',
      version: '1.0.0',
      timezone: 'Asia/Kolkata',
      language: 'en',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
    },
    security: {
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      passwordMinLength: 8,
      requireTwoFactor: false,
      autoLogout: true,
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      lowStockAlerts: true,
      salesAlerts: true,
      systemAlerts: true,
    },
    backup: {
      autoBackup: true,
      backupFrequency: 'daily',
      backupRetention: 30,
      cloudBackup: false,
    },
    maintenance: {
      maintenanceMode: false,
      scheduledMaintenance: false,
      maintenanceStart: '',
      maintenanceEnd: '',
    },
  });

  const [systemStatus, setSystemStatus] = useState({
    database: 'connected',
    api: 'running',
    storage: 'healthy',
    memory: 'normal',
    cpu: 'normal',
  });

  useEffect(() => {
    loadSystemSettings();
    checkSystemStatus();
  }, []);

  const loadSystemSettings = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/system-settings');
      if (response.data.success) {
        setSystemData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load system settings:', error);
      // Use default settings if API fails
    } finally {
      setLoading(false);
    }
  };

  const checkSystemStatus = async () => {
    try {
      const response = await axiosInstance.get('/admin/system-status');
      if (response.data.success) {
        setSystemStatus(response.data.data);
      }
    } catch (error) {
      console.error('Failed to check system status:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.put('/admin/system-settings', systemData);
      if (response.data.success) {
        toast.success('System settings updated successfully');
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to update system settings:', error);
      toast.error('Failed to update system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    loadSystemSettings();
    setEditing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
      case 'running':
      case 'healthy':
      case 'normal':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'error':
      case 'disconnected':
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
      case 'running':
      case 'healthy':
      case 'normal':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'error':
      case 'disconnected':
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Settings className="w-8 h-8 mr-3 text-blue-600" />
              System Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Configure system-wide settings and monitor system health
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={checkSystemStatus}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </button>
            {editing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Settings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Database className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Database</p>
              <div className="flex items-center">
                <span className={`text-sm font-medium ${getStatusColor(systemStatus.database)}`}>
                  {systemStatus.database}
                </span>
                <span className="ml-2">{getStatusIcon(systemStatus.database)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <Server className="w-6 h-6 text-green-600 dark:text-green-300" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">API Server</p>
              <div className="flex items-center">
                <span className={`text-sm font-medium ${getStatusColor(systemStatus.api)}`}>
                  {systemStatus.api}
                </span>
                <span className="ml-2">{getStatusIcon(systemStatus.api)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Database className="w-6 h-6 text-purple-600 dark:text-purple-300" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Storage</p>
              <div className="flex items-center">
                <span className={`text-sm font-medium ${getStatusColor(systemStatus.storage)}`}>
                  {systemStatus.storage}
                </span>
                <span className="ml-2">{getStatusIcon(systemStatus.storage)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Server className="w-6 h-6 text-orange-600 dark:text-orange-300" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Performance</p>
              <div className="flex items-center">
                <span className={`text-sm font-medium ${getStatusColor(systemStatus.memory)}`}>
                  {systemStatus.memory}
                </span>
                <span className="ml-2">{getStatusIcon(systemStatus.memory)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            General Settings
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                System Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={systemData.general.systemName}
                onChange={(e) => setSystemData({
                  ...systemData,
                  general: {...systemData.general, systemName: e.target.value}
                })}
                disabled={!editing}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={systemData.general.timezone}
                onChange={(e) => setSystemData({
                  ...systemData,
                  general: {...systemData.general, timezone: e.target.value}
                })}
                disabled={!editing}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={systemData.general.language}
                onChange={(e) => setSystemData({
                  ...systemData,
                  general: {...systemData.general, language: e.target.value}
                })}
                disabled={!editing}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Format
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={systemData.general.dateFormat}
                  onChange={(e) => setSystemData({
                    ...systemData,
                    general: {...systemData.general, dateFormat: e.target.value}
                  })}
                  disabled={!editing}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time Format
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={systemData.general.timeFormat}
                  onChange={(e) => setSystemData({
                    ...systemData,
                    general: {...systemData.general, timeFormat: e.target.value}
                  })}
                  disabled={!editing}
                >
                  <option value="24h">24 Hour</option>
                  <option value="12h">12 Hour</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Security Settings
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={systemData.security.sessionTimeout}
                onChange={(e) => setSystemData({
                  ...systemData,
                  security: {...systemData.security, sessionTimeout: parseInt(e.target.value)}
                })}
                disabled={!editing}
                min="5"
                max="480"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Login Attempts
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={systemData.security.maxLoginAttempts}
                onChange={(e) => setSystemData({
                  ...systemData,
                  security: {...systemData.security, maxLoginAttempts: parseInt(e.target.value)}
                })}
                disabled={!editing}
                min="3"
                max="10"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Password Length
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={systemData.security.passwordMinLength}
                onChange={(e) => setSystemData({
                  ...systemData,
                  security: {...systemData.security, passwordMinLength: parseInt(e.target.value)}
                })}
                disabled={!editing}
                min="6"
                max="20"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto Logout
                </span>
                <input
                  type="checkbox"
                  checked={systemData.security.autoLogout}
                  onChange={(e) => setSystemData({
                    ...systemData,
                    security: {...systemData.security, autoLogout: e.target.checked}
                  })}
                  disabled={!editing}
                  className="rounded border-gray-300"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Require Two-Factor Authentication
                </span>
                <input
                  type="checkbox"
                  checked={systemData.security.requireTwoFactor}
                  onChange={(e) => setSystemData({
                    ...systemData,
                    security: {...systemData.security, requireTwoFactor: e.target.checked}
                  })}
                  disabled={!editing}
                  className="rounded border-gray-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notification Settings
          </h3>
          
          <div className="space-y-3">
            {Object.entries(systemData.notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setSystemData({
                    ...systemData,
                    notifications: {...systemData.notifications, [key]: e.target.checked}
                  })}
                  disabled={!editing}
                  className="rounded border-gray-300"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Backup Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Backup Settings
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto Backup
              </span>
              <input
                type="checkbox"
                checked={systemData.backup.autoBackup}
                onChange={(e) => setSystemData({
                  ...systemData,
                  backup: {...systemData.backup, autoBackup: e.target.checked}
                })}
                disabled={!editing}
                className="rounded border-gray-300"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Backup Frequency
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={systemData.backup.backupFrequency}
                onChange={(e) => setSystemData({
                  ...systemData,
                  backup: {...systemData.backup, backupFrequency: e.target.value}
                })}
                disabled={!editing}
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Backup Retention (days)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={systemData.backup.backupRetention}
                onChange={(e) => setSystemData({
                  ...systemData,
                  backup: {...systemData.backup, backupRetention: parseInt(e.target.value)}
                })}
                disabled={!editing}
                min="7"
                max="365"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cloud Backup
              </span>
              <input
                type="checkbox"
                checked={systemData.backup.cloudBackup}
                onChange={(e) => setSystemData({
                  ...systemData,
                  backup: {...systemData.backup, cloudBackup: e.target.checked}
                })}
                disabled={!editing}
                className="rounded border-gray-300"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;


