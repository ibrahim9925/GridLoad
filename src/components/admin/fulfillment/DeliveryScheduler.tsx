// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarIcon, Clock, MapPin, User, Truck, Phone, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDeliverySchedules } from '@/hooks/useDeliverySchedules';
import { useToast } from '@/hooks/use-toast';

const timeSlots = [
  '09:00-12:00',
  '13:00-16:00',
  '16:00-19:00',
  '19:00-22:00'
];

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

export const DeliveryScheduler = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newDelivery, setNewDelivery] = useState({
    customer_id: '',
    sale_id: '',
    delivery_type: 'standard',
    time_slot: '',
    special_instructions: ''
  });
  const { toast } = useToast();
  
  const { 
    deliveries, 
    customers, 
    isLoading, 
    createDeliverySchedule, 
    updateDeliveryStatus, 
    assignDriver 
  } = useDeliverySchedules();

  const todaysDeliveries = deliveries.filter(delivery => 
    delivery.scheduled_date === new Date().toISOString().split('T')[0]
  );

  const selectedDateDeliveries = deliveries.filter(delivery =>
    delivery.scheduled_date === format(selectedDate, 'yyyy-MM-dd')
  );

  const scheduleDelivery = async () => {
    if (!newDelivery.customer_id || !newDelivery.time_slot) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a customer and time slot.",
      });
      return;
    }

    const deliveryData = {
      sale_id: newDelivery.sale_id || 'temp_sale_id', // This would come from a selected sale
      customer_id: newDelivery.customer_id,
      scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
      time_slot: newDelivery.time_slot,
      delivery_type: newDelivery.delivery_type,
      special_instructions: newDelivery.special_instructions
    };

    try {
      await createDeliverySchedule(deliveryData);
      
      // Reset form
      setNewDelivery({
        customer_id: '',
        sale_id: '',
        delivery_type: 'standard',
        time_slot: '',
        special_instructions: ''
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  const confirmDelivery = (deliveryId: string) => {
    updateDeliveryStatus(deliveryId, 'confirmed');
  };

  const completeDelivery = (deliveryId: string) => {
    updateDeliveryStatus(deliveryId, 'completed');
  };

  const handleAssignDriver = (deliveryId: string, driverId: string) => {
    assignDriver(deliveryId, driverId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading delivery schedules...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{todaysDeliveries.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {todaysDeliveries.filter(d => d.status === 'confirmed').length}
            </div>
            <p className="text-xs text-muted-foreground">Ready to go</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <MapPin className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {todaysDeliveries.filter(d => d.status === 'in_progress').length}
            </div>
            <p className="text-xs text-muted-foreground">Out for delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Delivery Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">2.5h</div>
            <p className="text-xs text-muted-foreground">Hours average</p>
          </CardContent>
        </Card>
      </div>

      {/* Schedule New Delivery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Schedule New Delivery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer">Customer</Label>
              <Select value={newDelivery.customer_id} onValueChange={(value) => setNewDelivery(prev => ({...prev, customer_id: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.contact_person}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="delivery_type">Delivery Type</Label>
              <Select value={newDelivery.delivery_type} onValueChange={(value) => setNewDelivery(prev => ({...prev, delivery_type: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Delivery</SelectItem>
                  <SelectItem value="installation">Delivery + Installation</SelectItem>
                  <SelectItem value="express">Express Delivery</SelectItem>
                  <SelectItem value="pickup">Customer Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Delivery Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="time_slot">Time Slot</Label>
              <Select value={newDelivery.time_slot} onValueChange={(value) => setNewDelivery(prev => ({...prev, time_slot: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map(slot => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="instructions">Special Instructions</Label>
            <Textarea
              id="instructions"
              placeholder="Delivery instructions, access codes, contact preferences..."
              value={newDelivery.special_instructions}
              onChange={(e) => setNewDelivery(prev => ({...prev, special_instructions: e.target.value}))}
              className="min-h-20"
            />
          </div>

          <Button onClick={scheduleDelivery} className="w-full">
            Schedule Delivery
          </Button>
        </CardContent>
      </Card>

      {/* Today's Delivery Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Delivery Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaysDeliveries.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deliveries scheduled</h3>
              <p className="text-muted-foreground">No deliveries are scheduled for today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysDeliveries.map((delivery) => (
                <div key={delivery.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{delivery.time_slot}</span>
                      </div>
                      <Badge 
                        className={statusColors[delivery.status as keyof typeof statusColors]}
                        variant="secondary"
                      >
                        {delivery.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-lg font-bold">${delivery.order_value?.toFixed(2) || '0.00'}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {delivery.customer_name}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4" />
                        {delivery.customer_phone}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4" />
                        {delivery.customer_address || 'No address provided'}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm">
                        <span className="font-medium">Type:</span> {delivery.delivery_type}
                      </div>
                      {delivery.special_instructions && (
                        <div className="text-sm mt-1">
                          <span className="font-medium">Instructions:</span> {delivery.special_instructions}
                        </div>
                      )}
                      {delivery.driver_id && (
                        <div className="text-sm mt-1">
                          <span className="font-medium">Driver:</span> Assigned
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    {delivery.status === 'scheduled' && (
                      <>
                        <Button size="sm" onClick={() => confirmDelivery(delivery.id)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Confirm
                        </Button>
                        <Button variant="outline" size="sm">
                          Assign Driver
                        </Button>
                      </>
                    )}
                    
                    {delivery.status === 'confirmed' && (
                      <Button size="sm" onClick={() => completeDelivery(delivery.id)}>
                        Start Delivery
                      </Button>
                    )}
                    
                    {delivery.status === 'in_progress' && (
                      <Button size="sm" onClick={() => completeDelivery(delivery.id)}>
                        Mark Complete
                      </Button>
                    )}
                    
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-1" />
                      Call Customer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Delivery Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </div>

            {/* Selected Date Deliveries */}
            <div>
              <h4 className="font-semibold mb-3">
                Deliveries for {format(selectedDate, 'MMMM dd, yyyy')}
              </h4>
              {selectedDateDeliveries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No deliveries scheduled for this date
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateDeliveries.map((delivery) => (
                    <div key={delivery.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{delivery.time_slot}</div>
                        <Badge 
                          className={statusColors[delivery.status as keyof typeof statusColors]}
                          variant="secondary"
                        >
                          {delivery.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {delivery.customer_name} • ${delivery.order_value?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};