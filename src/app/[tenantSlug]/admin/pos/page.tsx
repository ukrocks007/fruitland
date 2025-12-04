'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { AdminNavigation } from '@/components/admin-navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Loader2, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  CreditCard, 
  Banknote,
  CheckCircle,
  Receipt,
  User,
  Phone
} from 'lucide-react';
import { Role } from '@/types';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image: string | null;
  isAvailable: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface OrderResult {
  id: string;
  orderNumber: string;
  totalAmount: number;
  customerName: string;
  paymentMethod: string;
  amountReceived: number;
  change: number;
  items: {
    id: string;
    quantity: number;
    price: number;
    product: {
      name: string;
    };
  }[];
}

export default function AdminPOSPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Customer info
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  
  // Order confirmation
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [lastOrder, setLastOrder] = useState<OrderResult | null>(null);

  // Auth check
  useEffect(() => {
    if (status === 'loading') {
      return; // Wait for session to load
    }

    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated' && session?.user?.role !== Role.ADMIN) {
      router.push('/');
      return;
    }

    if (status === 'authenticated' && session?.user?.role === Role.ADMIN) {
      fetchProducts();
    }
  }, [status, session, router]);

  // Filter products based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products.filter(p => p.isAvailable && p.stock > 0));
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredProducts(
        products.filter(
          p => p.isAvailable && 
               p.stock > 0 && 
               (p.name.toLowerCase().includes(query) || 
                p.category.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, products]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?available=true');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Cart functions
  const addToCart = useCallback((product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        // Check stock
        if (existingItem.quantity >= product.stock) {
          toast.error(`Only ${product.stock} items available`);
          return prevCart;
        }
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      return [...prevCart, { product, quantity: 1 }];
    });
    
    // Focus back on search
    searchInputRef.current?.focus();
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id !== productId) return item;
        
        const newQuantity = item.quantity + delta;
        
        if (newQuantity > item.product.stock) {
          toast.error(`Only ${item.product.stock} items available`);
          return item;
        }
        
        return { ...item, quantity: newQuantity };
      }).filter(item => item.quantity > 0);
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setAmountReceived('');
  }, []);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const total = subtotal;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const changeAmount = amountReceived ? parseFloat(amountReceived) - total : 0;

  // Process payment
  const handlePayment = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (paymentMethod === 'CASH' && amountReceived) {
      const received = parseFloat(amountReceived);
      if (received < total) {
        toast.error('Amount received is less than total');
        return;
      }
    }

    setProcessing(true);

    try {
      const res = await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          paymentMethod,
          customerName,
          customerPhone,
          amountReceived: amountReceived ? parseFloat(amountReceived) : 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process order');
      }

      setLastOrder(data.order);
      setShowPaymentDialog(false);
      setShowReceiptDialog(true);
      
      // Refresh products to get updated stock
      await fetchProducts();
      
      toast.success('Order completed successfully!');
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const startNewOrder = () => {
    clearCart();
    setShowReceiptDialog(false);
    setLastOrder(null);
    searchInputRef.current?.focus();
  };

  // Quick amount buttons for cash
  const quickAmounts = [50, 100, 200, 500, 1000, 2000];

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <div className="container mx-auto px-4 py-4">
        <AdminNavigation />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Point of Sale</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg px-3 py-1">
              <ShoppingCart className="h-4 w-4 mr-2" />
              {itemCount} items
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 h-[calc(100vh-250px)]">
          {/* Products Section */}
          <div className="lg:col-span-2 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search products by name or category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 text-lg"
                      autoFocus
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    {searchQuery ? 'No products found' : 'No products available'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 p-2 pt-3">
                    {filteredProducts.map((product) => {
                      const cartItem = cart.find(item => item.product.id === product.id);
                      const inCart = !!cartItem;
                      
                      return (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className={`
                            relative p-4 rounded-lg border-2 transition-all text-left
                            hover:border-green-500 hover:shadow-md
                            ${inCart ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}
                          `}
                        >
                          {inCart && (
                            <Badge className="absolute -top-2 -right-2 bg-green-600">
                              {cartItem.quantity}
                            </Badge>
                          )}
                          <div className="font-semibold text-sm truncate">{product.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{product.category}</div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-bold text-green-600">₹{product.price.toFixed(2)}</span>
                            <span className="text-xs text-gray-400">Stock: {product.stock}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cart Section */}
          <div className="flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Cart
                  </CardTitle>
                  {cart.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearCart}
                      className="text-red-500 hover:text-red-700"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <ShoppingCart className="h-12 w-12 mb-2 opacity-50" />
                    <p>Cart is empty</p>
                    <p className="text-sm">Click products to add</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div 
                        key={item.product.id} 
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.product.name}</div>
                          <div className="text-sm text-gray-500">
                            ₹{item.product.price.toFixed(2)} × {item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="w-20 text-right font-semibold">
                          ₹{(item.product.price * item.quantity).toFixed(2)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>

              {/* Cart Footer */}
              <CardFooter className="flex-col border-t pt-4">
                <div className="w-full space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal ({itemCount} items)</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-green-600">₹{total.toFixed(2)}</span>
                  </div>
                </div>
                
                <Button
                  className="w-full"
                  size="lg"
                  disabled={cart.length === 0}
                  onClick={() => setShowPaymentDialog(true)}
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Proceed to Payment
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Complete Payment
            </DialogTitle>
            <DialogDescription>
              Total: <span className="font-bold text-green-600">₹{total.toFixed(2)}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Customer Info */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="customerName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Name
                </Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone (Optional)
                </Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <Separator />

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('CASH')}
                  className="flex flex-col h-16"
                >
                  <Banknote className="h-5 w-5 mb-1" />
                  Cash
                </Button>
                <Button
                  variant={paymentMethod === 'CARD' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('CARD')}
                  className="flex flex-col h-16"
                >
                  <CreditCard className="h-5 w-5 mb-1" />
                  Card
                </Button>
                <Button
                  variant={paymentMethod === 'UPI' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('UPI')}
                  className="flex flex-col h-16"
                >
                  <span className="text-xs font-bold mb-1">UPI</span>
                  UPI
                </Button>
              </div>
            </div>

            {/* Cash Amount */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="amountReceived">Amount Received</Label>
                  <Input
                    id="amountReceived"
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder={`₹${total.toFixed(2)}`}
                    className="text-lg"
                  />
                </div>
                
                {/* Quick amount buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmountReceived(amount.toString())}
                    >
                      ₹{amount}
                    </Button>
                  ))}
                </div>
                
                {/* Exact amount button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setAmountReceived(total.toFixed(2))}
                >
                  Exact Amount (₹{total.toFixed(2)})
                </Button>

                {/* Change display */}
                {amountReceived && parseFloat(amountReceived) >= total && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Change to return:</span>
                      <span className="text-xl font-bold text-green-600">
                        ₹{changeAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePayment} 
              disabled={processing}
              className="min-w-[120px]"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Sale
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Order Complete!
            </DialogTitle>
          </DialogHeader>

          {lastOrder && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="font-mono text-lg font-bold">{lastOrder.orderNumber}</p>
                <p className="text-sm text-gray-500">Order Number</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Customer</span>
                  <span>{lastOrder.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment Method</span>
                  <span>{lastOrder.paymentMethod}</span>
                </div>
                <Separator />
                
                {/* Items */}
                <div className="space-y-1">
                  {lastOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.product.name} × {item.quantity}</span>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-green-600">₹{lastOrder.totalAmount.toFixed(2)}</span>
                </div>
                
                {lastOrder.paymentMethod === 'CASH' && lastOrder.amountReceived > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Amount Received</span>
                      <span>₹{lastOrder.amountReceived.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium text-green-600">
                      <span>Change</span>
                      <span>₹{lastOrder.change.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={startNewOrder} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
