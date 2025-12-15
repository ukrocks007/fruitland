'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Minus, ShoppingCart, Building2, MapPin, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { fetchPublicUiConfig } from '@/lib/public-ui-config';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  isAvailable: boolean;
}

interface BulkCartItem {
  product: Product;
  quantity: number;
}

interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export default function BulkOrderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [bulkCart, setBulkCart] = useState<BulkCartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [step, setStep] = useState<'products' | 'details'>('products');
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [showStockOnProductPages, setShowStockOnProductPages] = useState(true);

  // Bulk customer info
  const [bulkCustomerName, setBulkCustomerName] = useState('');
  const [bulkCustomerContact, setBulkCustomerContact] = useState('');
  const [bulkCustomerGST, setBulkCustomerGST] = useState('');
  const [bulkOrderNote, setBulkOrderNote] = useState('');

  // New address form
  const [newAddress, setNewAddress] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/bulk-order');
      return;
    }

    if (status === 'authenticated') {
      fetchPublicUiConfig().then((cfg) => setShowStockOnProductPages(cfg.showStockOnProductPages));
      loadData();
    }
  }, [status, router]);

  const loadData = async () => {
    try {
      // Load products
      const productsRes = await fetch('/api/products?available=true');
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }

      // Load addresses
      const addressRes = await fetch('/api/addresses');
      if (addressRes.ok) {
        const addressData = await addressRes.json();
        setAddresses(addressData);
        const defaultAddr = addressData.find((a: Address) => a.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        } else if (addressData.length > 0) {
          setSelectedAddressId(addressData[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddress),
      });

      if (!res.ok) throw new Error('Failed to add address');

      const address = await res.json();
      setAddresses([...addresses, address]);
      setSelectedAddressId(address.id);
      setIsAddressDialogOpen(false);
      setNewAddress({
        name: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
        isDefault: false
      });
      toast.success('Address added successfully');
    } catch (error) {
      toast.error('Failed to add address');
    } finally {
      setSavingAddress(false);
    }
  };

  const updateBulkCart = (product: Product, quantity: number) => {
    setBulkCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (quantity <= 0) {
        return prev.filter(item => item.product.id !== product.id);
      }
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity } : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const getCartQuantity = (productId: string) => {
    const item = bulkCart.find(item => item.product.id === productId);
    return item?.quantity || 0;
  };

  const getTotalQuantity = () => {
    return bulkCart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getDiscountPercent = () => {
    const total = getTotalQuantity();
    if (total >= 100) return 20;
    if (total >= 50) return 15;
    if (total >= 25) return 10;
    if (total >= 10) return 5;
    return 0;
  };

  const getSubtotal = () => {
    return bulkCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const getDiscountAmount = () => {
    return getSubtotal() * (getDiscountPercent() / 100);
  };

  const getTotal = () => {
    return getSubtotal() - getDiscountAmount();
  };

  const handleSubmitOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Please select a delivery address');
      return;
    }

    if (!bulkCustomerName.trim() || !bulkCustomerContact.trim()) {
      toast.error('Please fill in customer name and contact');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/bulk-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: bulkCart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          addressId: selectedAddressId,
          bulkCustomerName,
          bulkCustomerContact,
          bulkCustomerGST: bulkCustomerGST || undefined,
          bulkOrderNote: bulkOrderNote || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to place bulk order');
      }

      toast.success('Bulk order placed successfully! Our team will contact you shortly.');
      router.push('/orders');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to place order';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
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
        <div className="flex items-center gap-3 mb-8">
          <Building2 className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold">Bulk Order / Wholesale</h1>
            <p className="text-gray-600">Order in bulk and save more! Minimum 10 items for bulk discount.</p>
          </div>
        </div>

        {/* Discount Tiers Info */}
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-green-800 mb-3">Bulk Discount Tiers</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-green-600">5%</p>
                <p className="text-sm text-gray-600">10+ items</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-green-600">10%</p>
                <p className="text-sm text-gray-600">25+ items</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-green-600">15%</p>
                <p className="text-sm text-gray-600">50+ items</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-green-600">20%</p>
                <p className="text-sm text-gray-600">100+ items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {step === 'products' ? (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Products Grid */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Select Products</CardTitle>
                  <CardDescription>Add products to your bulk order</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {products.map((product) => (
                      <div key={product.id} className="flex gap-4 p-4 border rounded-lg">
                        <div className="relative h-20 w-20 shrink-0 rounded overflow-hidden bg-gray-100">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{product.name}</h4>
                          <p className="text-sm text-gray-500">₹{product.price}</p>
                          {showStockOnProductPages && (
                            <p className="text-xs text-gray-400">Stock: {product.stock}</p>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            {getCartQuantity(product.id) > 0 ? (
                              <>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => updateBulkCart(product, getCartQuantity(product.id) - 1)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                  type="number"
                                  min="0"
                                  max={product.stock}
                                  value={getCartQuantity(product.id)}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    updateBulkCart(product, Math.min(val, product.stock));
                                  }}
                                  className="w-16 h-8 text-center"
                                />
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    const newQty = getCartQuantity(product.id) + 1;
                                    if (newQty <= product.stock) {
                                      updateBulkCart(product, newQty);
                                    }
                                  }}
                                  disabled={getCartQuantity(product.id) >= product.stock}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => updateBulkCart(product, 1)}
                                disabled={product.stock === 0}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Bulk Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bulkCart.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No items added yet</p>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {bulkCart.map((item) => (
                          <div key={item.product.id} className="flex justify-between items-center text-sm">
                            <span className="truncate flex-1">{item.product.name}</span>
                            <span className="text-gray-500 mx-2">x{item.quantity}</span>
                            <span className="font-medium">₹{(item.product.price * item.quantity).toFixed(2)}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 ml-2"
                              onClick={() => updateBulkCart(item.product, 0)}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Items</span>
                          <span>{getTotalQuantity()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Subtotal</span>
                          <span>₹{getSubtotal().toFixed(2)}</span>
                        </div>
                        {getDiscountPercent() > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Bulk Discount ({getDiscountPercent()}%)</span>
                            <span>-₹{getDiscountAmount().toFixed(2)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total</span>
                          <span className="text-green-600">₹{getTotal().toFixed(2)}</span>
                        </div>
                      </div>

                      {getDiscountPercent() > 0 && (
                        <Badge className="w-full justify-center bg-green-600">
                          You save ₹{getDiscountAmount().toFixed(2)} with bulk discount!
                        </Badge>
                      )}
                    </>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    disabled={bulkCart.length === 0}
                    onClick={() => setStep('details')}
                  >
                    Continue to Details
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Customer Details Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Business/Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business / Customer Information
                  </CardTitle>
                  <CardDescription>Required for bulk order processing and invoicing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Company / Customer Name *</Label>
                      <Input
                        id="customerName"
                        value={bulkCustomerName}
                        onChange={(e) => setBulkCustomerName(e.target.value)}
                        placeholder="Enter company or customer name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerContact">Contact (Phone / Email) *</Label>
                      <Input
                        id="customerContact"
                        value={bulkCustomerContact}
                        onChange={(e) => setBulkCustomerContact(e.target.value)}
                        placeholder="Enter phone number or email"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerGST">GST Number (Optional)</Label>
                    <Input
                      id="customerGST"
                      value={bulkCustomerGST}
                      onChange={(e) => setBulkCustomerGST(e.target.value)}
                      placeholder="Enter GST number if applicable"
                    />
                    <p className="text-xs text-gray-500">
                      Provide GST number for tax invoice generation
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orderNote">Order Notes (Optional)</Label>
                    <Textarea
                      id="orderNote"
                      value={bulkOrderNote}
                      onChange={(e) => setBulkOrderNote(e.target.value)}
                      placeholder="Any special instructions or requirements for this order..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Address */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Delivery Address
                    </CardTitle>
                  </div>
                  <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Address</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddAddress} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                              id="name"
                              value={newAddress.name}
                              onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                              id="phone"
                              value={newAddress.phone}
                              onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="addressLine1">Address Line 1</Label>
                          <Input
                            id="addressLine1"
                            value={newAddress.addressLine1}
                            onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                          <Input
                            id="addressLine2"
                            value={newAddress.addressLine2}
                            onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              value={newAddress.city}
                              onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="state">State</Label>
                            <Input
                              id="state"
                              value={newAddress.state}
                              onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="pincode">Pincode</Label>
                          <Input
                            id="pincode"
                            value={newAddress.pincode}
                            onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={savingAddress}>
                          {savingAddress ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save Address'
                          )}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {addresses.length > 0 ? (
                    <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId}>
                      <div className="grid gap-4">
                        {addresses.map((address) => (
                          <div key={address.id} className="flex items-start space-x-2 border p-4 rounded-lg">
                            <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                            <Label htmlFor={address.id} className="grid gap-1 cursor-pointer flex-1">
                              <span className="font-semibold">
                                {address.name}
                                {address.isDefault && (
                                  <Badge variant="secondary" className="ml-2">Default</Badge>
                                )}
                              </span>
                              <span className="text-sm text-gray-500">
                                {address.addressLine1}
                                {address.addressLine2 && `, ${address.addressLine2}`}
                              </span>
                              <span className="text-sm text-gray-500">
                                {address.city}, {address.state} - {address.pincode}
                              </span>
                              <span className="text-sm text-gray-500">Phone: {address.phone}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No addresses found. Please add a delivery address.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep('products')}>
                  Back to Products
                </Button>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {bulkCart.map((item) => (
                      <div key={item.product.id} className="flex justify-between text-sm">
                        <span className="truncate flex-1">{item.product.name} x{item.quantity}</span>
                        <span>₹{(item.product.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Items</span>
                      <span>{getTotalQuantity()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>₹{getSubtotal().toFixed(2)}</span>
                    </div>
                    {getDiscountPercent() > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Bulk Discount ({getDiscountPercent()}%)</span>
                        <span>-₹{getDiscountAmount().toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-green-600">₹{getTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-3 rounded-lg text-sm">
                    <p className="font-medium text-yellow-800">Payment Note</p>
                    <p className="text-yellow-700 text-xs mt-1">
                      Bulk orders are processed after admin approval. Payment can be made via bank transfer or offline methods. Our team will contact you with invoice details.
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    disabled={submitting || addresses.length === 0 || !bulkCustomerName.trim() || !bulkCustomerContact.trim()}
                    onClick={handleSubmitOrder}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Placing Order...
                      </>
                    ) : (
                      'Place Bulk Order'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
