'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/navbar';
import { AdminNavigation } from '@/components/admin-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Search, Trash2, Edit2, Plus, Warehouse, MapPin } from 'lucide-react';

interface WarehouseData {
  id: string;
  name: string;
  city: string;
  pincode: string;
  zone: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    productStocks: number;
    orders: number;
  };
}

interface WarehouseFormData {
  name: string;
  city: string;
  pincode: string;
  zone: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  isActive: boolean;
}

export default function AdminWarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseData | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<WarehouseFormData>({
    name: '',
    city: '',
    pincode: '',
    zone: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    isActive: true,
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    filterWarehouses();
  }, [warehouses, searchQuery]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/warehouses');
      if (!response.ok) throw new Error('Failed to fetch warehouses');
      const data = await response.json();
      setWarehouses(data.warehouses);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const filterWarehouses = () => {
    if (!warehouses || !Array.isArray(warehouses)) {
      setFilteredWarehouses([]);
      return;
    }

    let filtered = [...warehouses];

    if (searchQuery) {
      filtered = filtered.filter(warehouse =>
        warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        warehouse.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        warehouse.pincode.includes(searchQuery) ||
        (warehouse.zone && warehouse.zone.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredWarehouses(filtered);
  };

  const openCreateDialog = () => {
    setEditingWarehouse(null);
    setFormData({
      name: '',
      city: '',
      pincode: '',
      zone: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (warehouse: WarehouseData) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      city: warehouse.city,
      pincode: warehouse.pincode,
      zone: warehouse.zone || '',
      contactName: warehouse.contactName || '',
      contactPhone: warehouse.contactPhone || '',
      contactEmail: warehouse.contactEmail || '',
      isActive: warehouse.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.city || !formData.pincode) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSaving(true);

      const warehouseData = {
        name: formData.name,
        city: formData.city,
        pincode: formData.pincode,
        zone: formData.zone || null,
        contactName: formData.contactName || null,
        contactPhone: formData.contactPhone || null,
        contactEmail: formData.contactEmail || null,
        isActive: formData.isActive,
      };

      if (editingWarehouse) {
        // Update existing warehouse
        const response = await fetch(`/api/admin/warehouses/${editingWarehouse.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(warehouseData),
        });

        if (!response.ok) throw new Error('Failed to update warehouse');
        toast.success('Warehouse updated successfully');
      } else {
        // Create new warehouse
        const response = await fetch('/api/admin/warehouses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(warehouseData),
        });

        if (!response.ok) throw new Error('Failed to create warehouse');
        toast.success('Warehouse created successfully');
      }

      setDialogOpen(false);
      fetchWarehouses();
    } catch (error) {
      console.error('Error saving warehouse:', error);
      toast.error('Failed to save warehouse');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (warehouseId: string) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;

    try {
      const response = await fetch(`/api/admin/warehouses/${warehouseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete warehouse');
      }

      toast.success('Warehouse deleted successfully');
      fetchWarehouses();
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete warehouse');
    }
  };

  const toggleActive = async (warehouse: WarehouseData) => {
    try {
      const response = await fetch(`/api/admin/warehouses/${warehouse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !warehouse.isActive }),
      });

      if (!response.ok) throw new Error('Failed to update warehouse');

      toast.success('Warehouse status updated');
      fetchWarehouses();
    } catch (error) {
      console.error('Error updating warehouse:', error);
      toast.error('Failed to update warehouse');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <AdminNavigation />

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Warehouse className="h-6 w-6" />
                Warehouse Management
              </CardTitle>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Warehouse
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search by name, city, pincode, or zone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Warehouses Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWarehouses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500">
                        No warehouses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWarehouses.map((warehouse) => (
                      <TableRow
                        key={warehouse.id}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => openEditDialog(warehouse)}
                      >
                        <TableCell className="font-medium">
                          {warehouse.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{warehouse.city}, {warehouse.pincode}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {warehouse.zone ? (
                            <Badge variant="secondary">{warehouse.zone}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {warehouse.contactName || warehouse.contactPhone ? (
                            <div className="text-sm">
                              {warehouse.contactName && <div>{warehouse.contactName}</div>}
                              {warehouse.contactPhone && <div className="text-gray-500">{warehouse.contactPhone}</div>}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {warehouse._count.productStocks} products
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {warehouse._count.orders} orders
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant={warehouse.isActive ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleActive(warehouse)}
                          >
                            {warehouse.isActive ? 'Active' : 'Inactive'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(warehouse)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(warehouse.id)}
                              disabled={warehouse._count.orders > 0 || warehouse._count.productStocks > 0}
                              title={
                                warehouse._count.orders > 0
                                  ? 'Cannot delete: has orders'
                                  : warehouse._count.productStocks > 0
                                    ? 'Cannot delete: has stock records'
                                    : 'Delete warehouse'
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
            </DialogTitle>
            <DialogDescription>
              {editingWarehouse ? 'Update warehouse details' : 'Create a new warehouse location'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Warehouse Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Main Warehouse"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone">Zone</Label>
                <Input
                  id="zone"
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                  placeholder="North, South, East, West"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Mumbai"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="400001"
                  required
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Contact Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+91 9876543210"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="warehouse@example.com"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive">Warehouse is active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
