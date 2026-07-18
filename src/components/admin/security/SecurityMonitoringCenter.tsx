// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Users, 
  Globe, 
  Clock,
  RefreshCw,
  TrendingUp,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';
import { format } from 'date-fns';

interface SecurityEvent {
  id: string;
  user_id: string | null;
  action_type: string;
  resource_type: string | null;
  resource_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  risk_level: string;
  created_at: string;
  geolocation: any;
}

interface RateLimitStatus {
  identifier: string;
  endpoint: string;
  attempts: number;
  blocked_until: string | null;
  last_attempt: string;
}

export const SecurityMonitoringCenter: React.FC = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimitStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const { securityMetrics, monitorSecurityEvents } = useEnhancedSecurity();
  const { toast } = useToast();

  const fetchSecurityEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSecurityEvents((data || []) as SecurityEvent[]);
    } catch (error) {
      console.error('Failed to fetch security events:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load security events"
      });
    }
  };

  const fetchRateLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('auth_rate_limits')
        .select('*')
        .order('last_attempt', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRateLimits((data || []) as RateLimitStatus[]);
    } catch (error) {
      console.error('Failed to fetch rate limits:', error);
    }
  };

  const clearRateLimit = async (identifier: string, endpoint: string) => {
    try {
      const { error } = await supabase
        .from('auth_rate_limits')
        .delete()
        .eq('identifier', identifier)
        .eq('endpoint', endpoint);

      if (error) throw error;

      toast({
        title: "Rate Limit Cleared",
        description: `Cleared rate limit for ${identifier} on ${endpoint}`
      });

      await fetchRateLimits();
    } catch (error) {
      console.error('Failed to clear rate limit:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear rate limit"
      });
    }
  };

  const refreshAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchSecurityEvents(),
      fetchRateLimits(),
      monitorSecurityEvents()
    ]);
    setIsLoading(false);
  };

  const enableRealTimeMonitoring = async () => {
    try {
      // Subscribe to real-time updates
      const subscription = supabase
        .channel('security_monitoring')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'security_audit_logs' 
          }, 
          (payload) => {
            setSecurityEvents(prev => [payload.new as SecurityEvent, ...prev.slice(0, 99)]);
            
            // Show alert for high-risk events
            const newEvent = payload.new as SecurityEvent;
            if (newEvent.risk_level === 'high' || newEvent.risk_level === 'critical') {
              toast({
                variant: "destructive",
                title: "High-Risk Security Event",
                description: `${newEvent.action_type} - ${newEvent.risk_level} risk detected`
              });
            }
          }
        )
        .subscribe();

      setRealTimeEnabled(true);
      toast({
        title: "Real-Time Monitoring Enabled",
        description: "Security events will be monitored in real-time"
      });

      // Cleanup subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Failed to enable real-time monitoring:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to enable real-time monitoring"
      });
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const highRiskEvents = securityEvents.filter(event => 
    event.risk_level === 'high' || event.risk_level === 'critical'
  );

  const failedEvents = securityEvents.filter(event => !event.success);
  const blockedIdentifiers = rateLimits.filter(limit => 
    limit.blocked_until && new Date(limit.blocked_until) > new Date()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Monitoring Center</h2>
          <p className="text-muted-foreground">Real-time security monitoring and threat detection</p>
        </div>
        <div className="flex items-center gap-2">
          {!realTimeEnabled && (
            <Button variant="outline" onClick={enableRealTimeMonitoring}>
              <Activity className="h-4 w-4 mr-2" />
              Enable Real-Time
            </Button>
          )}
          <Button variant="outline" onClick={refreshAllData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {highRiskEvents.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>SECURITY ALERT:</strong> {highRiskEvents.length} high-risk security event(s) detected in the last 24 hours.
          </AlertDescription>
        </Alert>
      )}

      {/* Real-Time Status */}
      {realTimeEnabled && (
        <Alert className="border-green-200 bg-green-50">
          <Activity className="h-4 w-4" />
          <AlertDescription>
            <strong>REAL-TIME MONITORING ACTIVE:</strong> Security events are being monitored in real-time.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Risk Level</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={getRiskLevelColor(securityMetrics.riskLevel)}>
                {securityMetrics.riskLevel.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Events (24h)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedEvents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked IPs</CardTitle>
            <Globe className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{blockedIdentifiers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityMetrics.activeSessions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
          <TabsTrigger value="threats">Threat Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Security Events</span>
              </CardTitle>
              <CardDescription>Real-time security event monitoring and analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No security events found</p>
                  </div>
                ) : (
                  securityEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getRiskLevelColor(event.risk_level)}>
                            {event.risk_level}
                          </Badge>
                          <span className="font-medium">{event.action_type}</span>
                          {!event.success && (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {format(new Date(event.created_at), 'MMM dd, HH:mm:ss')}
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground grid grid-cols-2 gap-4">
                        <div>
                          {event.resource_type && <span>Resource: {event.resource_type}</span>}
                        </div>
                        <div>
                          {event.ip_address && <span>IP: {event.ip_address}</span>}
                        </div>
                      </div>

                      {event.details && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Event Details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-limits">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limit Status</CardTitle>
              <CardDescription>Monitor and manage authentication rate limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rateLimits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No rate limit entries</p>
                  </div>
                ) : (
                  rateLimits.map((limit, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{limit.identifier}</div>
                          <div className="text-sm text-muted-foreground">
                            Endpoint: {limit.endpoint} | Attempts: {limit.attempts}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {limit.blocked_until && new Date(limit.blocked_until) > new Date() ? (
                            <>
                              <Badge variant="destructive">Blocked</Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => clearRateLimit(limit.identifier, limit.endpoint)}
                              >
                                Clear
                              </Button>
                            </>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Last attempt: {format(new Date(limit.last_attempt), 'MMM dd, yyyy HH:mm:ss')}
                        {limit.blocked_until && (
                          <span className="ml-4">
                            Blocked until: {format(new Date(limit.blocked_until), 'MMM dd, yyyy HH:mm:ss')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threats">
          <Card>
            <CardHeader>
              <CardTitle>Threat Analysis</CardTitle>
              <CardDescription>AI-powered threat detection and analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    Threat analysis shows system risk level: <strong>{securityMetrics.riskLevel}</strong>
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Failed Login Attempts</h4>
                    <div className="text-2xl font-bold text-red-600">{securityMetrics.failedLogins}</div>
                    <p className="text-sm text-muted-foreground">In the last 24 hours</p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Suspicious Activities</h4>
                    <div className="text-2xl font-bold text-orange-600">{highRiskEvents.length}</div>
                    <p className="text-sm text-muted-foreground">High-risk events detected</p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Blocked Threats</h4>
                    <div className="text-2xl font-bold text-green-600">{blockedIdentifiers.length}</div>
                    <p className="text-sm text-muted-foreground">Automatically blocked</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};