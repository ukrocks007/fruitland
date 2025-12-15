'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { addWeeks, addMonths, format, addDays } from 'date-fns';

interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface SubscriptionPackage {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  price: number;
  imageUrl: string | null;
  features: string;
}

function NewSubscriptionContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageId = searchParams.get('package');

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch package details if packageId is provided
      if (packageId) {
        const packageRes = await fetch(`/api/subscription-packages`);
        if (packageRes.ok) {
          const data = await packageRes.json();
          const pkg = data.packages.find((p: SubscriptionPackage) => p.id === packageId);
          if (pkg) {
            setSelectedPackage(pkg);
          }
        }
      }

      // Fetch user addresses
      const addressesRes = await fetch('/api/addresses');
      if (addressesRes.ok) {
        const data = await addressesRes.json();
        setAddresses(data?.addresses || data || []);

        // Auto-select default address
        const defaultAddr = data.addresses?.find((a: Address) => a.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressForm),
      });

      if (!response.ok) throw new Error('Failed to add address');

      const data = await response.json();
      setAddresses([...addresses, data]);
      setSelectedAddressId(data.id);
      setShowAddressForm(false);

      // Reset form
      setAddressForm({
        name: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
      });

      toast.success('Address added successfully');
    } catch (error) {
      console.error('Error adding address:', error);
      toast.error('Failed to add address');
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPackage) {
      toast.error('Please select a subscription package');
      return;
    }

    if (!selectedAddressId) {
      toast.error('Please select a delivery address');
      return;
    }

    try {
      setCreating(true);

      // Calculate next delivery date
      let nextDeliveryDate = new Date();
      switch (selectedPackage.frequency) {
        case 'DAILY':
          nextDeliveryDate = addDays(nextDeliveryDate, 1);
          break;
        case 'ALTERNATE_DAYS':
          nextDeliveryDate = addDays(nextDeliveryDate, 2);
          break;
        case 'WEEKLY':
          nextDeliveryDate = addWeeks(nextDeliveryDate, 1);
          break;
        case 'MONTHLY':
          nextDeliveryDate = addMonths(nextDeliveryDate, 1);
          break;
      }

      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          frequency: selectedPackage.frequency,
          preference: 'CUSTOM',
          addressId: selectedAddressId,
          totalAmount: selectedPackage.price,
          items: [], // Package-based subscriptions don't need individual items
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create subscription');
      }

      toast.success('Subscription created successfully!');
      router.push('/subscriptions');
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      toast.error(error.message || 'Failed to create subscription');
    } finally {
      setCreating(false);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      DAILY: 'Daily',
      ALTERNATE_DAYS: 'Alternate Days',
      WEEKLY: 'Weekly',
      MONTHLY: 'Monthly',
    };
    return labels[frequency] || frequency;
  };

  const parseFeatures = (features: string): string[] => {
    return features.split('\n').filter(f => f.trim());
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  if (!selectedPackage) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-gray-500 text-lg mb-4">Package not found</p>
              <Button onClick={() => router.push('/subscriptions')}>
                Browse Packages
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Create Subscription</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Package Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Selected Package */}
            <Card>
              <CardHeader>
                <CardTitle>Selected Package</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {selectedPackage.imageUrl && (
                    <img
                      src={selectedPackage.imageUrl}
                      alt={selectedPackage.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{selectedPackage.name}</h3>
                    {selectedPackage.description && (
                      <p className="text-sm text-gray-600 mt-1">{selectedPackage.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4">
                      <p className="text-2xl font-bold text-green-600">
                        ₹{selectedPackage.price.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">
                        per {selectedPackage.frequency.toLowerCase()}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedPackage.features && (
                  <div className="mt-4 space-y-2">
                    {parseFeatures(selectedPackage.features).map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <p className="text-sm">{feature}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Address</CardTitle>
                <CardDescription>Select or add a delivery address</CardDescription>
              </CardHeader>
              <CardContent>
                {addresses.length > 0 ? (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${selectedAddressId === address.id
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={address.id}
                          checked={selectedAddressId === address.id}
                          onChange={(e) => setSelectedAddressId(e.target.value)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{address.name}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {address.addressLine1}
                            {address.addressLine2 && `, ${address.addressLine2}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {address.city}, {address.state} - {address.pincode}
                          </p>
                          <p className="text-sm text-gray-600">Phone: {address.phone}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : null}

                {!showAddressForm ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowAddressForm(true)}
                    className="w-full mt-4"
                  >
                    Add New Address
                  </Button>
                ) : (
                  <form onSubmit={handleAddAddress} className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={addressForm.name}
                          onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="addressLine1">Address Line 1 *</Label>
                      <Input
                        id="addressLine1"
                        value={addressForm.addressLine1}
                        onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="addressLine2">Address Line 2</Label>
                      <Input
                        id="addressLine2"
                        value={addressForm.addressLine2}
                        onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pincode">Pincode *</Label>
                        <Input
                          id="pincode"
                          value={addressForm.pincode}
                          onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Save Address
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddressForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Subscription Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Package</span>
                    <span className="font-medium">{selectedPackage.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Frequency</span>
                    <span className="font-medium">{getFrequencyLabel(selectedPackage.frequency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Price</span>
                    <span className="font-medium">₹{selectedPackage.price.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold">Total Amount</span>
                    <span className="text-2xl font-bold text-green-600">
                      ₹{selectedPackage.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    You will be charged ₹{selectedPackage.price.toFixed(2)} {selectedPackage.frequency.toLowerCase()}
                  </p>
                </div>

                <Button
                  onClick={handleSubscribe}
                  disabled={creating || !selectedAddressId}
                  className="w-full"
                  size="lg"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Subscribe Now'
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  You can pause or cancel anytime from your subscriptions page
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewSubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    }>
      <NewSubscriptionContent />
    </Suspense>
  );
}
