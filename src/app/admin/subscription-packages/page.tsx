'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/navbar';
import { AdminNavigation } from '@/components/admin-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import { Loader2, Plus, Edit2, Trash2 } from 'lucide-react';

interface SubscriptionPackage {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  price: number;
  imageUrl: string | null;
  features: string;
  isActive: boolean;
  createdAt: string;
}

interface PackageFormData {
  name: string;
  description: string;
  frequency: string;
  price: string;
  imageUrl: string;
  features: string;
  isActive: boolean;
}

export default function AdminSubscriptionPackagesPage() {
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SubscriptionPackage | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    description: '',
    frequency: 'WEEKLY',
    price: '',
    imageUrl: '',
    features: '',
    isActive: true,
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/subscription-packages');
      if (!response.ok) throw new Error('Failed to fetch packages');
      const data = await response.json();
      setPackages(data.packages);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load subscription packages');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      description: '',
      frequency: 'WEEKLY',
      price: '',
      imageUrl: '',
      features: '',
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (pkg: SubscriptionPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      frequency: pkg.frequency,
      price: pkg.price.toString(),
      imageUrl: pkg.imageUrl || '',
      features: pkg.features,
      isActive: pkg.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.frequency) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSaving(true);

      const packageData = {
        name: formData.name,
        description: formData.description || null,
        frequency: formData.frequency,
        price: parseFloat(formData.price),
        imageUrl: formData.imageUrl || null,
        features: formData.features,
        isActive: formData.isActive,
      };

      if (editingPackage) {
        const response = await fetch(`/api/admin/subscription-packages/${editingPackage.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(packageData),
        });

        if (!response.ok) throw new Error('Failed to update package');
        toast.success('Package updated successfully');
      } else {
        const response = await fetch('/api/admin/subscription-packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(packageData),
        });

        if (!response.ok) throw new Error('Failed to create package');
        toast.success('Package created successfully');
      }

      setDialogOpen(false);
      fetchPackages();
    } catch (error) {
      console.error('Error saving package:', error);
      toast.error('Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;

    try {
      const response = await fetch(`/api/admin/subscription-packages/${packageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete package');

      toast.success('Package deleted successfully');
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast.error('Failed to delete package');
    }
  };

  const toggleActive = async (pkg: SubscriptionPackage) => {
    try {
      const response = await fetch(`/api/admin/subscription-packages/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success('Package status updated');
      fetchPackages();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      DAILY: 'Daily',
      WEEKLY: 'Weekly',
      MONTHLY: 'Monthly',
    };
    return labels[frequency] || frequency;
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
              <CardTitle className="text-2xl">Subscription Packages</CardTitle>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Package
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        No subscription packages found
                      </TableCell>
                    </TableRow>
                  ) : (
                    packages.map((pkg) => (
                      <TableRow
                        key={pkg.id}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => openEditDialog(pkg)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{pkg.name}</p>
                            {pkg.description && (
                              <p className="text-sm text-gray-500">{pkg.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getFrequencyLabel(pkg.frequency)}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">₹{pkg.price.toFixed(2)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant={pkg.isActive ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleActive(pkg)}
                          >
                            {pkg.isActive ? 'Active' : 'Inactive'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(pkg)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(pkg.id)}
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

      {/* Package Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Edit Package' : 'Add New Package'}
            </DialogTitle>
            <DialogDescription>
              {editingPackage ? 'Update package details' : 'Create a new subscription package'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Package Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Premium Fruit Box"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the package"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <select
                  id="frequency"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="999.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">Features (one per line)</Label>
              <Textarea
                id="features"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="Fresh seasonal fruits&#10;Organic produce&#10;Free delivery&#10;Cancel anytime"
                rows={5}
              />
              <p className="text-xs text-gray-500">Enter each feature on a new line</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive">Active (visible to customers)</Label>
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
                  editingPackage ? 'Update Package' : 'Create Package'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
