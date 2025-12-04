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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Search, Users, Package, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Role } from '@/types';

interface DeliveryAgent {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  totalOrders: number;
  activeOrders: number;
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  address: {
    city: string;
    state: string;
  };
  deliveryPartner: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function AdminDeliveryAgentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<DeliveryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<DeliveryAgent | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [unassignedOrders, setUnassignedOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user?.role !== Role.ADMIN) {
      router.push('/');
      return;
    }

    fetchAgents();
  }, [status, session, router]);

  useEffect(() => {
    filterAgents();
  }, [searchTerm, agents]);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/admin/delivery-agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load delivery agents');
    } finally {
      setLoading(false);
    }
  };

  const filterAgents = () => {
    let filtered = agents;

    if (searchTerm) {
      filtered = filtered.filter(
        (agent) =>
          agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.phone?.includes(searchTerm)
      );
    }

    setFilteredAgents(filtered);
  };

  const fetchUnassignedOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        // Filter for orders that need delivery assignment
        const unassigned = data.filter(
          (order: Order) =>
            !order.deliveryPartner &&
            order.status !== 'DELIVERED' &&
            order.status !== 'CANCELLED'
        );
        setUnassignedOrders(unassigned);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  const openAssignDialog = (agent: DeliveryAgent) => {
    setSelectedAgent(agent);
    setIsAssignDialogOpen(true);
    fetchUnassignedOrders();
  };

  const assignOrderToAgent = async (orderId: string) => {
    if (!selectedAgent) return;

    setAssigning(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryPartnerId: selectedAgent.id }),
      });

      if (res.ok) {
        toast.success('Order assigned successfully');
        fetchUnassignedOrders();
        fetchAgents();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to assign order');
      }
    } catch (error) {
      console.error('Error assigning order:', error);
      toast.error('Failed to assign order');
    } finally {
      setAssigning(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  const totalAgents = agents.length;
  const totalActiveOrders = agents.reduce((sum, a) => sum + a.activeOrders, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <AdminNavigation />

        <h2 className="text-2xl font-semibold mb-2">Delivery Fleet Management</h2>
        <p className="text-gray-600 mb-6">Manage delivery partners and assign orders</p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Delivery Partners</p>
                  <p className="text-2xl font-bold text-blue-600">{totalAgents}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Deliveries</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {totalActiveOrders}
                  </p>
                </div>
                <Truck className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Unassigned Orders</p>
                  <p className="text-2xl font-bold text-red-600">
                    {unassignedOrders.length > 0 ? unassignedOrders.length : '-'}
                  </p>
                </div>
                <Package className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Delivery Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Agents Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Active Orders</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.length > 0 ? (
                    filteredAgents.map((agent) => (
                      <TableRow
                        key={agent.id}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => openAssignDialog(agent)}
                      >
                        <TableCell className="font-medium">
                          {agent.name || 'N/A'}
                        </TableCell>
                        <TableCell>{agent.email}</TableCell>
                        <TableCell>{agent.phone || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={agent.activeOrders > 0 ? 'default' : 'secondary'}
                          >
                            {agent.activeOrders}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{agent.totalOrders}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(agent.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssignDialog(agent);
                            }}
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Assign Orders
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-gray-500"
                      >
                        {agents.length === 0
                          ? 'No delivery partners found. Assign the DELIVERY_PARTNER role to users in User Management.'
                          : 'No matching delivery partners found'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assign Orders Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Orders to {selectedAgent?.name || selectedAgent?.email}</DialogTitle>
            <DialogDescription>
              Select orders to assign to this delivery partner
            </DialogDescription>
          </DialogHeader>

          {loadingOrders ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : unassignedOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No unassigned orders available
            </div>
          ) : (
            <div className="space-y-3">
              {unassignedOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">
                      {order.user.name} - {order.address.city}, {order.address.state}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{order.status}</Badge>
                      <Badge variant="outline">₹{order.totalAmount.toFixed(2)}</Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => assignOrderToAgent(order.id)}
                    disabled={assigning === order.id}
                    size="sm"
                  >
                    {assigning === order.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Assign'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
