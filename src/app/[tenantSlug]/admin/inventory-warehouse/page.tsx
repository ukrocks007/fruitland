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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Search, Plus, ArrowRightLeft, Package } from 'lucide-react';

interface Warehouse {
  id: string;
  name: string;
  city: string;
  pincode: string;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

interface ProductStock {
  id: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  warehouse: Warehouse;
  product: Product;
}

export default function AdminInventoryWarehousePage() {
  const [productStocks, setProductStocks] = useState<ProductStock[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');

  // Stock dialog
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [stockQuantity, setStockQuantity] = useState<string>('');
  const [savingStock, setSavingStock] = useState(false);

  // Transfer dialog
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferFromWarehouse, setTransferFromWarehouse] = useState<string>('');
  const [transferToWarehouse, setTransferToWarehouse] = useState<string>('');
  const [transferProductId, setTransferProductId] = useState<string>('');
  const [transferQuantity, setTransferQuantity] = useState<string>('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterStocks();
  }, [productStocks, searchQuery, warehouseFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stocksRes, warehousesRes, productsRes] = await Promise.all([
        fetch('/api/admin/inventory-warehouse'),
        fetch('/api/admin/warehouses'),
        fetch('/api/products'),
      ]);

      if (!stocksRes.ok || !warehousesRes.ok || !productsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const stocksData = await stocksRes.json();
      const warehousesData = await warehousesRes.json();
      const productsData = await productsRes.json();

      setProductStocks(stocksData.productStocks);
      setWarehouses(warehousesData.warehouses);
      setProducts(productsData.products);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const filterStocks = () => {
    if (!productStocks || !Array.isArray(productStocks)) {
      setFilteredStocks([]);
      return;
    }

    let filtered = [...productStocks];

    if (searchQuery) {
      filtered = filtered.filter(stock =>
        stock.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (warehouseFilter !== 'all') {
      filtered = filtered.filter(stock => stock.warehouseId === warehouseFilter);
    }

    setFilteredStocks(filtered);
  };

  const openStockDialog = (stock?: ProductStock) => {
    if (stock) {
      setSelectedWarehouseId(stock.warehouseId);
      setSelectedProductId(stock.productId);
      setStockQuantity(stock.quantity.toString());
    } else {
      setSelectedWarehouseId('');
      setSelectedProductId('');
      setStockQuantity('');
    }
    setStockDialogOpen(true);
  };

  const handleStockSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedWarehouseId || !selectedProductId || stockQuantity === '') {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSavingStock(true);

      const response = await fetch('/api/admin/inventory-warehouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: selectedWarehouseId,
          productId: selectedProductId,
          quantity: parseInt(stockQuantity),
        }),
      });

      if (!response.ok) throw new Error('Failed to update stock');

      toast.success('Stock updated successfully');
      setStockDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    } finally {
      setSavingStock(false);
    }
  };

  const openTransferDialog = () => {
    setTransferFromWarehouse('');
    setTransferToWarehouse('');
    setTransferProductId('');
    setTransferQuantity('');
    setTransferDialogOpen(true);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transferFromWarehouse || !transferToWarehouse || !transferProductId || !transferQuantity) {
      toast.error('Please fill all required fields');
      return;
    }

    if (transferFromWarehouse === transferToWarehouse) {
      toast.error('Source and destination warehouses must be different');
      return;
    }

    try {
      setTransferring(true);

      const response = await fetch('/api/admin/inventory-warehouse', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWarehouseId: transferFromWarehouse,
          toWarehouseId: transferToWarehouse,
          productId: transferProductId,
          transferQuantity: parseInt(transferQuantity),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to transfer stock');
      }

      toast.success('Stock transferred successfully');
      setTransferDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error transferring stock:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to transfer stock');
    } finally {
      setTransferring(false);
    }
  };

  // Get available quantity for a stock item
  const getAvailableQuantity = (stock: ProductStock) => {
    return stock.quantity - stock.reservedQuantity;
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
                <Package className="h-6 w-6" />
                Warehouse Inventory
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={openTransferDialog}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transfer Stock
                </Button>
                <Button onClick={() => openStockDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stock
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search by product or warehouse name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Inventory Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStocks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500">
                        No inventory records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStocks.map((stock) => (
                      <TableRow
                        key={stock.id}
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => openStockDialog(stock)}
                      >
                        <TableCell className="font-medium">
                          {stock.product.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{stock.product.category}</Badge>
                        </TableCell>
                        <TableCell>{stock.warehouse.name}</TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {stock.warehouse.city}, {stock.warehouse.pincode}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{stock.quantity}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {stock.reservedQuantity > 0 ? (
                            <Badge variant="destructive">{stock.reservedQuantity}</Badge>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={getAvailableQuantity(stock) < 10 ? "destructive" : "default"}>
                            {getAvailableQuantity(stock)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStockDialog(stock);
                            }}
                          >
                            Adjust
                          </Button>
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

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedProductId ? 'Adjust Stock' : 'Add Stock'}
            </DialogTitle>
            <DialogDescription>
              Set the stock quantity for a product in a warehouse
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStockSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="warehouse">Warehouse *</Label>
              <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.filter(w => w.isActive).map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="Enter stock quantity"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStockDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingStock}>
                {savingStock ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Stock'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Stock</DialogTitle>
            <DialogDescription>
              Move stock from one warehouse to another
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fromWarehouse">From Warehouse *</Label>
              <Select value={transferFromWarehouse} onValueChange={setTransferFromWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.filter(w => w.isActive).map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toWarehouse">To Warehouse *</Label>
              <Select value={transferToWarehouse} onValueChange={setTransferToWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.filter(w => w.isActive && w.id !== transferFromWarehouse).map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transferProduct">Product *</Label>
              <Select value={transferProductId} onValueChange={setTransferProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product to transfer" />
                </SelectTrigger>
                <SelectContent>
                  {transferFromWarehouse ? (
                    productStocks
                      .filter(s => s.warehouseId === transferFromWarehouse && getAvailableQuantity(s) > 0)
                      .map((stock) => (
                        <SelectItem key={stock.productId} value={stock.productId}>
                          {stock.product.name} (Available: {getAvailableQuantity(stock)})
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="placeholder" disabled>
                      Select source warehouse first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transferQuantity">Quantity to Transfer *</Label>
              <Input
                id="transferQuantity"
                type="number"
                min="1"
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(e.target.value)}
                placeholder="Enter quantity"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransferDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={transferring}>
                {transferring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  'Transfer Stock'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
