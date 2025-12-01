'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CartRecommendations } from '@/components/CartRecommendations';
import { toast } from 'sonner';
import { Loader2, MapPin, Plus, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
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

interface LoyaltyInfo {
  pointsBalance: number;
  loyaltyTier: string;
  settings: {
    pointsPerRupee: number;
    minRedeemablePoints: number;
    pointValueInRupees: number;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

interface CartApiItem {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    stock: number;
  };
  quantity: number;
}

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  
  // Payment method configuration
  const enableOnlinePayment = process.env.NEXT_PUBLIC_ENABLE_ONLINE_PAYMENT === 'true';
  const enableCOD = process.env.NEXT_PUBLIC_ENABLE_COD === 'true';
  
  // Set default payment method based on what's enabled
  const defaultPaymentMethod = enableOnlinePayment ? 'online' : enableCOD ? 'cod' : 'online';
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'online' | 'cod'>(defaultPaymentMethod);
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);

  // Loyalty points state
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  
  // New address form state
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

  const loadData = useCallback(async () => {
    try {
      // Load cart from database
      const cartRes = await fetch('/api/cart');
      if (cartRes.ok) {
        const cartData = await cartRes.json();
        if (cartData.length === 0) {
          toast.error('Your cart is empty');
          router.push('/cart');
          return;
        }
        // Transform cart data to match expected format
        const items = cartData.map((item: CartApiItem) => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          image: item.product.image,
          quantity: item.quantity,
          stock: item.product.stock,
        }));
        setCartItems(items);
      } else {
        router.push('/cart');
        return;
      }

      // Load addresses
      const res = await fetch('/api/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
        const defaultAddr = data.find((a: Address) => a.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        } else if (data.length > 0) {
          setSelectedAddressId(data[0].id);
        }
      }

      // Load loyalty info
      const loyaltyRes = await fetch('/api/user/loyalty');
      if (loyaltyRes.ok) {
        const loyaltyData = await loyaltyRes.json();
        setLoyaltyInfo(loyaltyData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/checkout');
      return;
    }

    if (status === 'authenticated') {
      loadData();
    }
  }, [status, router, loadData]);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch {
      toast.error('Failed to add address');
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculatePointsDiscount = () => {
    if (!usePoints || !loyaltyInfo || pointsToRedeem <= 0) return 0;
    return pointsToRedeem * loyaltyInfo.settings.pointValueInRupees;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculatePointsDiscount();
    return Math.max(0, subtotal - discount);
  };

  const handlePointsChange = (value: string) => {
    const points = parseInt(value, 10) || 0;
    const maxPoints = loyaltyInfo?.pointsBalance || 0;
    const pointValue = loyaltyInfo?.settings.pointValueInRupees || 1;
    const maxRedeemableForOrder = pointValue > 0 ? Math.floor(calculateSubtotal() / pointValue) : 0;
    const effectiveMax = Math.min(maxPoints, maxRedeemableForOrder);
    setPointsToRedeem(Math.min(Math.max(0, points), effectiveMax));
  };

  const handleUsePointsToggle = (checked: boolean) => {
    setUsePoints(checked);
    if (!checked) {
      setPointsToRedeem(0);
    }
  };

  const handleCODOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Please select a delivery address');
      return;
    }

    setProcessing(true);

    try {
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(item => ({
            productId: item.id,
            quantity: item.quantity
          })),
          addressId: selectedAddressId,
          paymentMethod: 'COD',
          redeemPoints: usePoints ? pointsToRedeem : 0,
        }),
      });

      if (!orderRes.ok) {
        const error = await orderRes.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const orderData = await orderRes.json();

      // Clear cart from database
      await fetch('/api/cart', { method: 'DELETE' });
      
      // Dispatch event to update navbar
      window.dispatchEvent(new Event('cartUpdated'));
      
      let successMessage = 'Order placed successfully! Pay on delivery.';
      if (orderData.loyaltyPointsEarned > 0) {
        successMessage += ` You earned ${orderData.loyaltyPointsEarned} loyalty points!`;
      }
      toast.success(successMessage);
      router.push('/orders');
    } catch (error: unknown) {
      console.error('Order error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to place order';
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleOnlinePayment = async () => {
    if (!selectedAddressId) {
      toast.error('Please select a delivery address');
      return;
    }

    setProcessing(true);

    try {
      // 1. Create Order
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(item => ({
            productId: item.id,
            quantity: item.quantity
          })),
          addressId: selectedAddressId,
          paymentMethod: 'ONLINE',
          redeemPoints: usePoints ? pointsToRedeem : 0,
        }),
      });

      if (!orderRes.ok) {
        const error = await orderRes.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const orderData = await orderRes.json();

      // 2. Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Fruitland',
        description: 'Fresh Fruit Order',
        order_id: orderData.id,
        handler: async function (response: RazorpayResponse) {
          try {
            // 3. Verify Payment
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: orderData.receipt // This is our internal order ID
              }),
            });

            if (!verifyRes.ok) throw new Error('Payment verification failed');

            const verifyData = await verifyRes.json();

            // Clear cart from database
            await fetch('/api/cart', { method: 'DELETE' });
            
            // Dispatch event to update navbar
            window.dispatchEvent(new Event('cartUpdated'));
            
            let successMessage = 'Order placed successfully!';
            if (verifyData.loyaltyPointsEarned > 0) {
              successMessage += ` You earned ${verifyData.loyaltyPointsEarned} loyalty points!`;
            }
            toast.success(successMessage);
            router.push('/orders');
          } catch (error) {
            console.error('Verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: session?.user?.name,
          email: session?.user?.email,
        },
        theme: {
          color: '#16a34a',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: unknown) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (selectedPaymentMethod === 'cod') {
      await handleCODOrder();
    } else {
      await handleOnlinePayment();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  const canRedeemPoints = loyaltyInfo && 
    loyaltyInfo.pointsBalance >= loyaltyInfo.settings.minRedeemablePoints;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Address & Review */}
          <div className="lg:col-span-2 space-y-6">
            {/* Address Selection */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Address
                </CardTitle>
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
                      <Button type="submit" className="w-full">Save Address</Button>
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

            {/* Payment Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedPaymentMethod} onValueChange={(value) => setSelectedPaymentMethod(value as 'online' | 'cod')}>
                  <div className="grid gap-4">
                    {enableOnlinePayment && (
                      <div className="flex items-center space-x-2 border p-4 rounded-lg">
                        <RadioGroupItem value="online" id="online" />
                        <Label htmlFor="online" className="flex items-center gap-2 cursor-pointer flex-1">
                          <div className="grid gap-1">
                            <span className="font-semibold">Online Payment</span>
                            <span className="text-sm text-gray-500">Pay securely using Cards, UPI, Net Banking, Wallets</span>
                          </div>
                        </Label>
                      </div>
                    )}
                    {enableCOD && (
                      <div className="flex items-center space-x-2 border p-4 rounded-lg">
                        <RadioGroupItem value="cod" id="cod" />
                        <Label htmlFor="cod" className="flex items-center gap-2 cursor-pointer flex-1">
                          <div className="grid gap-1">
                            <span className="font-semibold">Cash on Delivery (COD)</span>
                            <span className="text-sm text-gray-500">Pay when you receive the order</span>
                          </div>
                        </Label>
                      </div>
                    )}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Loyalty Points Redemption */}
            {loyaltyInfo && loyaltyInfo.pointsBalance > 0 && (
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-green-600" />
                    Use Loyalty Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Available Points: <span className="text-green-600">{loyaltyInfo.pointsBalance}</span></p>
                      <p className="text-sm text-gray-500">
                        Worth ₹{(loyaltyInfo.pointsBalance * loyaltyInfo.settings.pointValueInRupees).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="usePoints"
                        checked={usePoints}
                        onChange={(e) => handleUsePointsToggle(e.target.checked)}
                        disabled={!canRedeemPoints}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="usePoints" className="cursor-pointer">
                        Use Points
                      </Label>
                    </div>
                  </div>

                  {usePoints && canRedeemPoints && (
                    <div className="space-y-2">
                      <Label htmlFor="pointsAmount">Points to Redeem</Label>
                      <div className="flex gap-2">
                        <Input
                          id="pointsAmount"
                          type="number"
                          min={loyaltyInfo.settings.minRedeemablePoints}
                          max={Math.min(
                            loyaltyInfo.pointsBalance,
                            Math.floor(calculateSubtotal() / loyaltyInfo.settings.pointValueInRupees)
                          )}
                          value={pointsToRedeem}
                          onChange={(e) => handlePointsChange(e.target.value)}
                          className="max-w-32"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const maxPoints = Math.min(
                              loyaltyInfo.pointsBalance,
                              Math.floor(calculateSubtotal() / loyaltyInfo.settings.pointValueInRupees)
                            );
                            setPointsToRedeem(maxPoints);
                          }}
                        >
                          Use Max
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">
                        Discount: ₹{calculatePointsDiscount().toFixed(2)}
                      </p>
                      {!canRedeemPoints && (
                        <p className="text-sm text-orange-600">
                          Minimum {loyaltyInfo.settings.minRedeemablePoints} points required to redeem
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Items Review */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 relative rounded overflow-hidden bg-gray-100">
                          <Image 
                            src={item.image} 
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary & Payment */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold text-green-600">FREE</span>
                </div>
                {usePoints && pointsToRedeem > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      Points Discount ({pointsToRedeem} pts)
                    </span>
                    <span className="font-semibold">-₹{calculatePointsDiscount().toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-lg font-bold text-green-600">
                    ₹{calculateTotal().toFixed(2)}
                  </span>
                </div>
                {loyaltyInfo && (
                  <p className="text-sm text-gray-500 text-center">
                    Earn ~{Math.floor(calculateTotal() * loyaltyInfo.settings.pointsPerRupee)} points on this order
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handlePayment}
                  disabled={processing || addresses.length === 0 || (!enableOnlinePayment && !enableCOD)}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : selectedPaymentMethod === 'cod' ? (
                    'Place Order (COD)'
                  ) : (
                    'Pay Now'
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Checkout Recommendations */}
            <CartRecommendations
              cartProductIds={cartItems.map((item) => item.id)}
              title="Add before checkout"
              limit={4}
              onAddToCart={loadData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
