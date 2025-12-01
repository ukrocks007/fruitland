'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Star, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { LoyaltyTier, LoyaltyTransactionType } from '@/types';

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

interface LoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  description: string;
  createdAt: string;
  order?: {
    orderNumber: string;
  } | null;
}

interface LoyaltyInfo {
  pointsBalance: number;
  loyaltyTier: string;
  transactions: LoyaltyTransaction[];
  settings: {
    pointsPerRupee: number;
    minRedeemablePoints: number;
    pointValueInRupees: number;
  };
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  });

  const fetchAddresses = useCallback(async () => {
    try {
      const response = await fetch('/api/addresses');
      if (response.ok) {
        const data = await response.json();
        setAddresses(data);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  }, []);

  const fetchLoyaltyInfo = useCallback(async () => {
    try {
      setLoyaltyLoading(true);
      const response = await fetch('/api/user/loyalty?limit=20');
      if (response.ok) {
        const data = await response.json();
        setLoyaltyInfo(data);
      }
    } catch (error) {
      console.error('Error fetching loyalty info:', error);
    } finally {
      setLoyaltyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchAddresses();
      fetchLoyaltyInfo();
    }
  }, [session, fetchAddresses, fetchLoyaltyInfo]);

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Address added successfully');
        setShowAddressForm(false);
        setFormData({
          name: '',
          phone: '',
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          pincode: '',
          isDefault: false,
        });
        fetchAddresses();
      } else {
        toast.error('Failed to add address');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case LoyaltyTier.GOLD:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case LoyaltyTier.SILVER:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case LoyaltyTier.GOLD:
        return '🥇';
      case LoyaltyTier.SILVER:
        return '🥈';
      default:
        return '🥉';
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        <Tabs defaultValue="account" className="space-y-4">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="loyalty">Loyalty Points</TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={session.user.name || ''} disabled />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={session.user.email} disabled />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input value={session.user.role} disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="addresses">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Saved Addresses</h2>
                <Button onClick={() => setShowAddressForm(!showAddressForm)}>
                  {showAddressForm ? 'Cancel' : 'Add New Address'}
                </Button>
              </div>

              {showAddressForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddressSubmit} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="addressLine1">Address Line 1 *</Label>
                        <Input
                          id="addressLine1"
                          value={formData.addressLine1}
                          onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="addressLine2">Address Line 2</Label>
                        <Input
                          id="addressLine2"
                          value={formData.addressLine2}
                          onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                        />
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State *</Label>
                          <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="pincode">Pincode *</Label>
                          <Input
                            id="pincode"
                            value={formData.pincode}
                            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Address'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {addresses.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {addresses.map((address) => (
                    <Card key={address.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{address.name}</CardTitle>
                          {address.isDefault && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600">
                          {address.addressLine1}<br />
                          {address.addressLine2 && <>{address.addressLine2}<br /></>}
                          {address.city}, {address.state}<br />
                          {address.pincode}<br />
                          Phone: {address.phone}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                !showAddressForm && (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <p className="text-gray-500 mb-4">No saved addresses</p>
                      <Button onClick={() => setShowAddressForm(true)}>Add Your First Address</Button>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </TabsContent>

          <TabsContent value="loyalty">
            {loyaltyLoading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              </div>
            ) : loyaltyInfo ? (
              <div className="space-y-6">
                {/* Loyalty Balance Card */}
                <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Star className="h-6 w-6 text-green-600" />
                        <CardTitle>Loyalty Points</CardTitle>
                      </div>
                      <Badge className={`${getTierColor(loyaltyInfo.loyaltyTier)} px-3 py-1`}>
                        {getTierIcon(loyaltyInfo.loyaltyTier)} {loyaltyInfo.loyaltyTier} Tier
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className="text-5xl font-bold text-green-600">
                        {loyaltyInfo.pointsBalance}
                      </p>
                      <p className="text-gray-600 mt-2">Available Points</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Worth ₹{(loyaltyInfo.pointsBalance * loyaltyInfo.settings.pointValueInRupees).toFixed(2)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Earn Rate</p>
                        <p className="font-semibold">
                          ₹{loyaltyInfo.settings.pointsPerRupee > 0 ? Math.round(1 / loyaltyInfo.settings.pointsPerRupee) : 0} = 1 pt
                        </p>
                        <p className="text-xs text-gray-400">rupees per point</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Min. Redeem</p>
                        <p className="font-semibold">{loyaltyInfo.settings.minRedeemablePoints} pts</p>
                        <p className="text-xs text-gray-400">minimum points</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Transaction History */}
                <Card>
                  <CardHeader>
                    <CardTitle>Points History</CardTitle>
                    <CardDescription>Your recent loyalty transactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loyaltyInfo.transactions.length > 0 ? (
                      <div className="space-y-4">
                        {loyaltyInfo.transactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {transaction.type === LoyaltyTransactionType.EARN ? (
                                <div className="p-2 bg-green-100 rounded-full">
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                </div>
                              ) : (
                                <div className="p-2 bg-orange-100 rounded-full">
                                  <TrendingDown className="h-4 w-4 text-orange-600" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{transaction.description}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(transaction.createdAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                  {transaction.order && (
                                    <span className="ml-2">• Order: {transaction.order.orderNumber}</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`font-bold ${
                                transaction.type === LoyaltyTransactionType.EARN
                                  ? 'text-green-600'
                                  : 'text-orange-600'
                              }`}
                            >
                              {transaction.type === LoyaltyTransactionType.EARN ? '+' : '-'}
                              {transaction.points} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No transactions yet</p>
                        <p className="text-sm">Start shopping to earn loyalty points!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-gray-500">Failed to load loyalty information</p>
                  <Button onClick={fetchLoyaltyInfo} className="mt-4">Retry</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
