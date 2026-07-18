// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Lock,
  Globe,
  Clock,
  TrendingUp
} from 'lucide-react';
import { SecurityAlertsPanel } from './SecurityAlertsPanel';
import { MfaSetupWizard } from './MfaSetupWizard';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';
import { useMfaManagement } from '@/hooks/useMfaManagement';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SecurityMetric {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

interface ActiveSession {
  id: string;
  user_id: string;
  created_at: string;
  last_activity: string;
  user_agent: string;
  ip_address: string;
  device_fingerprint: string;
  is_active: boolean;
}

export const EnhancedSecurityDashboard: React.FC = () => {
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  
  const { securityMetrics } = useEnhancedSecurity();
  const { mfaSettings, checkMfaStatus } = useMfaManagement();
  const { userRole } = useAuth();

  const loadActiveSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) throw error;
      setActiveSessions((data || []) as ActiveSession[]);
    } catch (error) {
      console.error('Failed to load active sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    checkMfaStatus();
    loadActiveSessions();
  }, [checkMfaStatus]);

  const securityMetricsData: SecurityMetric[] = [
    {
      title: 'Risk Level',
      value: securityMetrics.riskLevel.charAt(0).toUpperCase() + securityMetrics.riskLevel.slice(1),
      icon: <Shield className="h-5 w-5" />,
      color: getRiskLevelColor(securityMetrics.riskLevel)
    },
    {
      title: 'Failed Logins (24h)',
      value: securityMetrics.failedLogins,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: securityMetrics.failedLogins > 5 ? 'text-red-600' : 'text-green-600'
    },
    {
      title: 'Active Sessions',
      value: securityMetrics.activeSessions,
      icon: <Users className="h-5 w-5" />,
      color: 'text-blue-600'
    },
    {
      title: 'MFA Status',
      value: securityMetrics.mfaEnabled ? 'Enabled' : 'Disabled',
      icon: <Lock className="h-5 w-5" />,
      color: securityMetrics.mfaEnabled ? 'text-green-600' : 'text-red-600'
    }
  ];

  function getRiskLevelColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  const isMfaRequired = userRole === 'admin' || userRole === 'accountant';
  const shouldShowMfaSetup = isMfaRequired && !mfaSettings?.mfa_enabled;

  return (
    <div className="space-y-6">
      {/* MFA Required Alert */}
      {shouldShowMfaSetup && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800">Two-Factor Authentication Required</h3>
                <p className="text-sm text-orange-700">
                  Your role requires MFA to be enabled for enhanced security. Please set it up now.
                </p>
              </div>
              <Button 
                onClick={() => setShowMfaSetup(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Setup MFA
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {securityMetricsData.map((metric, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className={`text-2xl font-bold ${metric.color}`}>
                    {metric.value}
                  </p>
                </div>
                <div className={metric.color}>
                  {metric.icon}
                </div>
              </div>
              {metric.trend && (
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-xs text-green-600">{metric.trend}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Dashboard Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="mfa">MFA Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <SecurityAlertsPanel />
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Active Sessions
                  </CardTitle>
                  <CardDescription>
                    Monitor active user sessions and security status
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={loadActiveSessions}
                  disabled={isLoadingSessions}
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No active sessions</p>
                  </div>
                ) : (
                  activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Session {session.id.slice(0, 8)}</span>
                          <Badge variant="secondary">Active</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Last activity: {new Date(session.last_activity).toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="font-medium">IP Address:</span>
                          <span className="ml-2">{session.ip_address || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="font-medium">User Agent:</span>
                          <span className="ml-2 truncate">{session.user_agent || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="font-medium">Started:</span>
                          <span className="ml-2">{new Date(session.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mfa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Multi-Factor Authentication
              </CardTitle>
              <CardDescription>
                Manage your two-factor authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mfaSettings?.mfa_enabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-800">MFA Enabled</h3>
                      <p className="text-sm text-green-700">
                        Your account is protected with two-factor authentication.
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Method</h4>
                      <Badge variant="outline">{mfaSettings.mfa_method || 'TOTP'}</Badge>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Status</h4>
                      <Badge variant="secondary">
                        {mfaSettings.is_setup_complete ? 'Complete' : 'Pending'}
                      </Badge>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setShowMfaSetup(true)}
                  >
                    Reconfigure MFA
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                    <div>
                      <h3 className="font-semibold text-orange-800">MFA Not Enabled</h3>
                      <p className="text-sm text-orange-700">
                        {isMfaRequired 
                          ? "Two-factor authentication is required for your role."
                          : "Enhance your account security with two-factor authentication."
                        }
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowMfaSetup(true)}
                    className={isMfaRequired ? "bg-orange-600 hover:bg-orange-700" : ""}
                  >
                    {isMfaRequired ? "Setup Required MFA" : "Enable MFA"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MFA Setup Dialog */}
      {showMfaSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <MfaSetupWizard
              onComplete={() => {
                setShowMfaSetup(false);
                checkMfaStatus();
              }}
              onCancel={!isMfaRequired ? () => setShowMfaSetup(false) : undefined}
              isRequired={isMfaRequired}
            />
          </div>
        </div>
      )}
    </div>
  );
};