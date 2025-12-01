'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { AdminNavigation } from '@/components/admin-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Search, Eye, Trash2, Pause, Play, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Role } from '@/types';

interface Subscription {
  id: string;
  subscriptionNumber: string;
  frequency: string;
  preference: string;
  totalAmount: number;
  status: string;
  startDate: string;
  nextDeliveryDate: string;
  user: {
    name: string;
    email: string;
  };
  address: {
    name: string;
    city: string;
    state: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    product: {
      name: string;
      price: number;
    };
  }>;
}

export default function AdminSubscriptionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState('all');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ id: string, action: string } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user?.role !== Role.ADMIN) {
      router.push('/');
      return;
    }

    fetchSubscriptions();
  }, [status, session, router]);

  useEffect(() => {
    filterSubscriptions();
  }, [searchTerm, statusFilter, frequencyFilter, subscriptions]);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/admin/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const filterSubscriptions = () => {
    let filtered = subscriptions;

    if (searchTerm) {
      filtered = filtered.filter(
        (sub) =>
          sub.subscriptionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.user.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((sub) => sub.status === statusFilter);
    }

    if (frequencyFilter !== 'all') {
      filtered = filtered.filter((sub) => sub.frequency === frequencyFilter);
    }

    setFilteredSubscriptions(filtered);
  };

  const updateSubscriptionStatus = async (id: string, status: string) => {
    const action = status === 'ACTIVE' ? 'RESUME' : status === 'PAUSED' ? 'PAUSE' : 'CANCEL';
    setActionLoading({ id, action });
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast.success('Subscription status updated');
        fetchSubscriptions();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteSubscription = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;

    setActionLoading({ id, action: 'DELETE' });
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Subscription deleted');
        fetchSubscriptions();
      } else {
        toast.error('Failed to delete subscription');
      }
    } catch (error) {
      toast.error('Failed to delete subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <AdminNavigation />

        <h2 className="text-2xl font-semibold mb-2">Subscription Management</h2>
        <p className="text-gray-600 mb-6">Manage all customer subscriptions</p>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by subscription #, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Frequencies</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscription #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Delivery</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.length > 0 ? (
                    filteredSubscriptions.map((sub) => (
                      <TableRow
                        key={sub.id}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          setSelectedSubscription(sub);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">{sub.subscriptionNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sub.user.name}</p>
                            <p className="text-sm text-gray-500">{sub.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sub.frequency}</Badge>
                        </TableCell>
                        <TableCell>₹{sub.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(sub.status)}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(sub.nextDeliveryDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedSubscription(sub);
                                setIsDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {sub.status === 'ACTIVE' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateSubscriptionStatus(sub.id, 'PAUSED')}
                                disabled={actionLoading?.id === sub.id}
                              >
                                {actionLoading?.id === sub.id && actionLoading?.action === 'PAUSE' ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Pause className="h-4 w-4 text-yellow-500" />
                                )}
                              </Button>
                            )}
                            {sub.status === 'PAUSED' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateSubscriptionStatus(sub.id, 'ACTIVE')}
                                disabled={actionLoading?.id === sub.id}
                              >
                                {actionLoading?.id === sub.id && actionLoading?.action === 'RESUME' ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                            )}
                            {sub.status !== 'CANCELLED' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateSubscriptionStatus(sub.id, 'CANCELLED')}
                                disabled={actionLoading?.id === sub.id}
                              >
                                {actionLoading?.id === sub.id && actionLoading?.action === 'CANCEL' ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteSubscription(sub.id)}
                              disabled={actionLoading?.id === sub.id}
                            >
                              {actionLoading?.id === sub.id && actionLoading?.action === 'DELETE' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-500" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No subscriptions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Subscription #</p>
                  <p className="font-medium">{selectedSubscription.subscriptionNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={getStatusColor(selectedSubscription.status)}>
                    {selectedSubscription.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Frequency</p>
                  <p className="font-medium">{selectedSubscription.frequency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Preference</p>
                  <p className="font-medium">{selectedSubscription.preference}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-medium">₹{selectedSubscription.totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Next Delivery</p>
                  <p className="font-medium">
                    {new Date(selectedSubscription.nextDeliveryDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-medium">{selectedSubscription.user.name}</p>
                  <p className="text-sm text-gray-600">{selectedSubscription.user.email}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Delivery Address</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-medium">{selectedSubscription.address.name}</p>
                  <p className="text-sm text-gray-600">
                    {selectedSubscription.address.city}, {selectedSubscription.address.state}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Subscription Items</h3>
                <div className="space-y-2">
                  {selectedSubscription.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">₹{item.product.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
