// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  Shield, 
  Eye, 
  CheckCircle, 
  Clock,
  MapPin,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metadata: any;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export const SecurityAlertsPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const { toast } = useToast();

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts((data || []) as SecurityAlert[]);
    } catch (error: any) {
      console.error('Failed to load security alerts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load security alerts.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, is_read: true } : alert
      ));
    } catch (error: any) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('security_alerts')
        .update({ 
          is_resolved: true, 
          resolved_by: user.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { 
          ...alert, 
          is_resolved: true, 
          resolved_by: user.id,
          resolved_at: new Date().toISOString()
        } : alert
      ));

      toast({
        title: "Alert Resolved",
        description: "Security alert has been marked as resolved.",
      });
    } catch (error: any) {
      console.error('Failed to resolve alert:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resolve alert.",
      });
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <Shield className="h-4 w-4" />;
      case 'medium': return <Eye className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'rate_limit_exceeded': return <Shield className="h-4 w-4" />;
      case 'suspicious_login': return <Smartphone className="h-4 w-4" />;
      case 'location_change': return <MapPin className="h-4 w-4" />;
      case 'mfa_bypass': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const unreadCount = alerts.filter(alert => !alert.is_read).length;
  const unresolvedCount = alerts.filter(alert => !alert.is_resolved).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Security Alerts</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAlerts}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Monitor security events and suspicious activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{unresolvedCount}</div>
            <div className="text-sm text-muted-foreground">Unresolved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
            <div className="text-sm text-muted-foreground">Unread</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{alerts.length}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
        </div>

        <ScrollArea className="h-96">
          <div className="space-y-3">
            {alerts.length === 0 && !isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No security alerts</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <Dialog key={alert.id}>
                  <DialogTrigger asChild>
                    <div
                      className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                        !alert.is_read ? 'bg-muted/30 border-primary/50' : ''
                      }`}
                      onClick={() => {
                        setSelectedAlert(alert);
                        if (!alert.is_read) markAsRead(alert.id);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(alert.severity)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getAlertIcon(alert.alert_type)}
                            <span className="font-medium text-sm">{alert.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {alert.severity}
                            </Badge>
                            {alert.is_resolved && (
                              <Badge variant="secondary" className="text-xs">
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {alert.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(alert.created_at), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        {getSeverityIcon(alert.severity)}
                        {alert.title}
                        <Badge variant="outline">{alert.severity}</Badge>
                      </DialogTitle>
                      <DialogDescription>
                        Security Alert Details
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Description</h4>
                        <p className="text-sm text-muted-foreground">
                          {alert.description}
                        </p>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Alert Type</h4>
                          <p className="text-sm">{alert.alert_type}</p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Severity</h4>
                          <Badge variant="outline">{alert.severity}</Badge>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Created</h4>
                          <p className="text-sm">
                            {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm:ss')}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Status</h4>
                          <Badge variant={alert.is_resolved ? "secondary" : "destructive"}>
                            {alert.is_resolved ? "Resolved" : "Active"}
                          </Badge>
                        </div>
                      </div>

                      {alert.metadata && (
                        <div>
                          <h4 className="font-medium mb-2">Additional Details</h4>
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                            {JSON.stringify(alert.metadata, null, 2)}
                          </pre>
                        </div>
                      )}

                      {!alert.is_resolved && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => resolveAlert(alert.id)}
                            size="sm"
                            className="flex-1"
                          >
                            Mark as Resolved
                          </Button>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};