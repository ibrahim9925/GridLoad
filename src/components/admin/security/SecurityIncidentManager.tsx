// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Shield, 
  Users, 
  Clock, 
  CheckCircle,
  XCircle,
  Eye,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SecurityIncident {
  id: string;
  incident_type: string;
  severity: string;
  title: string;
  description: string;
  affected_users: any;
  affected_resources: any;
  metadata: any;
  status: string;
  assigned_to: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at?: string;
}

export const SecurityIncidentManager: React.FC = () => {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const { toast } = useToast();

  const fetchIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('security_incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents((data || []) as unknown as SecurityIncident[]);
    } catch (error) {
      console.error('Failed to fetch security incidents:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load security incidents"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTestIncident = async () => {
    try {
      const { data, error } = await supabase.rpc('create_security_incident', {
        p_type: 'suspicious_activity',
        p_severity: 'medium',
        p_description: 'Multiple login attempts from different geographic locations within a short time frame.',
        p_details: JSON.stringify({
          ip_addresses: ['192.168.1.1', '10.0.0.1'],
          user_agent: 'Mozilla/5.0 Test',
          detection_time: new Date().toISOString()
        })
      });

      if (error) throw error;

      toast({
        title: "Test Incident Created",
        description: "A test security incident has been created successfully"
      });

      await fetchIncidents();
    } catch (error) {
      console.error('Failed to create test incident:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create test incident"
      });
    }
  };

  const updateIncidentStatus = async (incidentId: string, newStatus: string) => {
    try {
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('security_incidents')
        .update(updateData)
        .eq('id', incidentId);

      if (error) throw error;

      toast({
        title: "Incident Updated",
        description: `Incident status changed to ${newStatus}`
      });

      await fetchIncidents();
    } catch (error) {
      console.error('Failed to update incident:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update incident status"
      });
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'default';
      case 'investigating': return 'secondary';
      case 'open': return 'destructive';
      case 'false_positive': return 'outline';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'investigating': return <Eye className="h-4 w-4" />;
      case 'open': return <AlertTriangle className="h-4 w-4" />;
      case 'false_positive': return <XCircle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const openIncidents = incidents.filter(inc => inc.status === 'open');
  const criticalIncidents = incidents.filter(inc => inc.severity === 'critical');

  return (
    <div className="space-y-6">
      {/* Header with Critical Alerts */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Incident Manager</h2>
          <p className="text-muted-foreground">Monitor and manage security incidents</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={createTestIncident}>
            <Plus className="h-4 w-4 mr-2" />
            Create Test Incident
          </Button>
          <Button variant="outline" onClick={fetchIncidents}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalIncidents.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>CRITICAL SECURITY ALERTS:</strong> {criticalIncidents.length} critical incident(s) require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{openIncidents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Incidents</CardTitle>
            <Shield className="h-4 w-4 text-red-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{criticalIncidents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved (24h)</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {incidents.filter(inc => 
                inc.status === 'resolved' && 
                new Date(inc.resolved_at || '').getTime() > Date.now() - 24 * 60 * 60 * 1000
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incidents List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Incidents</TabsTrigger>
          <TabsTrigger value="open">Open ({openIncidents.length})</TabsTrigger>
          <TabsTrigger value="critical">Critical ({criticalIncidents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Security Incidents</CardTitle>
              <CardDescription>Complete list of security incidents and their current status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incidents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No security incidents found</p>
                    <p className="text-sm">This is a good sign!</p>
                  </div>
                ) : (
                  incidents.map((incident) => (
                    <div key={incident.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant={getSeverityColor(incident.severity)}>
                              {incident.severity.toUpperCase()}
                            </Badge>
                            <Badge variant={getStatusColor(incident.status)}>
                              {getStatusIcon(incident.status)}
                              <span className="ml-1">{incident.status}</span>
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {incident.incident_type.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <h3 className="font-semibold">{incident.title}</h3>
                          <p className="text-sm text-muted-foreground">{incident.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {incident.status === 'open' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateIncidentStatus(incident.id, 'investigating')}
                              >
                                Investigate
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                              >
                                Resolve
                              </Button>
                            </>
                          )}
                          {incident.status === 'investigating' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Created: {format(new Date(incident.created_at), 'MMM dd, yyyy HH:mm')}</span>
                          </span>
                          {incident.resolved_at && (
                            <span className="flex items-center space-x-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>Resolved: {format(new Date(incident.resolved_at), 'MMM dd, yyyy HH:mm')}</span>
                            </span>
                          )}
                        </div>
                        
                        {incident.affected_resources && incident.affected_resources.length > 0 && (
                          <div>
                            <strong>Affected Resources:</strong> {incident.affected_resources.join(', ')}
                          </div>
                        )}
                        
                        {incident.metadata && Object.keys(incident.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer font-medium hover:text-foreground">
                              Technical Details
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(incident.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="open">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Open Security Incidents</CardTitle>
              <CardDescription>Incidents requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              {incidents
                .filter(inc => inc.status === 'open')
                .map((incident) => (
                  <div key={incident.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getSeverityColor(incident.severity)}>
                            {incident.severity.toUpperCase()}
                          </Badge>
                          <Badge variant={getStatusColor(incident.status)}>
                            {getStatusIcon(incident.status)}
                            <span className="ml-1">{incident.status}</span>
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {incident.incident_type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <h3 className="font-semibold">{incident.title}</h3>
                        <p className="text-sm text-muted-foreground">{incident.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {incident.status === 'open' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateIncidentStatus(incident.id, 'investigating')}
                            >
                              Investigate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                            >
                              Resolve
                            </Button>
                          </>
                        )}
                        {incident.status === 'investigating' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Created: {format(new Date(incident.created_at), 'MMM dd, yyyy HH:mm')}</span>
                        </span>
                        {incident.resolved_at && (
                          <span className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Resolved: {format(new Date(incident.resolved_at), 'MMM dd, yyyy HH:mm')}</span>
                          </span>
                        )}
                      </div>

                      {incident.affected_resources && incident.affected_resources.length > 0 && (
                        <div>
                          <strong>Affected Resources:</strong> {incident.affected_resources.join(', ')}
                        </div>
                      )}

                      {incident.metadata && Object.keys(incident.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium hover:text-foreground">
                            Technical Details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(incident.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="critical">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-700">Critical Security Incidents</CardTitle>
              <CardDescription>High-priority security threats</CardDescription>
            </CardHeader>
            <CardContent>
              {incidents
                .filter(inc => inc.severity === 'critical')
                .map((incident) => (
                  <div key={incident.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getSeverityColor(incident.severity)}>
                            {incident.severity.toUpperCase()}
                          </Badge>
                          <Badge variant={getStatusColor(incident.status)}>
                            {getStatusIcon(incident.status)}
                            <span className="ml-1">{incident.status}</span>
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {incident.incident_type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <h3 className="font-semibold">{incident.title}</h3>
                        <p className="text-sm text-muted-foreground">{incident.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {incident.status === 'open' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateIncidentStatus(incident.id, 'investigating')}
                            >
                              Investigate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                            >
                              Resolve
                            </Button>
                          </>
                        )}
                        {incident.status === 'investigating' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateIncidentStatus(incident.id, 'resolved')}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Created: {format(new Date(incident.created_at), 'MMM dd, yyyy HH:mm')}</span>
                        </span>
                        {incident.resolved_at && (
                          <span className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Resolved: {format(new Date(incident.resolved_at), 'MMM dd, yyyy HH:mm')}</span>
                          </span>
                        )}
                      </div>

                      {incident.affected_resources && incident.affected_resources.length > 0 && (
                        <div>
                          <strong>Affected Resources:</strong> {incident.affected_resources.join(', ')}
                        </div>
                      )}

                      {incident.metadata && Object.keys(incident.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium hover:text-foreground">
                            Technical Details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(incident.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
