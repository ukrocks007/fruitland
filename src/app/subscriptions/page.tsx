'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SubscriptionPackage {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  price: number;
  imageUrl: string | null;
  features: string;
  isActive: boolean;
}

interface Subscription {
  id: string;
  subscriptionNumber: string;
  frequency: string;
  preference: string;
  totalAmount: number;
  status: string;
  startDate: string;
  nextDeliveryDate: string;
  items: Array<{
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      price: number;
    };
  }>;
  address: {
    name: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    pincode: string;
  };
}

export default function SubscriptionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'packages' | 'my-subscriptions'>('packages');

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
      const [packagesRes, subscriptionsRes] = await Promise.all([
        fetch('/api/subscription-packages'),
        fetch('/api/subscriptions'),
      ]);

      if (packagesRes.ok) {
        const packagesData = await packagesRes.json();
        setPackages(packagesData.packages);
      }

      if (subscriptionsRes.ok) {
        const subscriptionsData = await subscriptionsRes.json();
        setSubscriptions(subscriptionsData.subscriptions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      DAILY: 'Daily Morning',
      ALTERNATE_DAYS: 'Alternate Days',
      WEEKLY: 'Weekly',
      BIWEEKLY: 'Bi-weekly',
      MONTHLY: 'Monthly',
    };
    return labels[frequency] || frequency;
  };

  const formatEnumLikeText = (value: string) =>
    value
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const getFrequencyDisplayText = (frequency: string) => {
    switch (frequency) {
      case 'DAILY':
        return 'Day';
      case 'ALTERNATE_DAYS':
        return 'Alternate Day';
      case 'WEEKLY':
        return 'Week';
      case 'BIWEEKLY':
        return 'Week';
      case 'MONTHLY':
        return 'Month';
      default:
        return formatEnumLikeText(frequency);
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Subscriptions</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b">
          <button
            onClick={() => setActiveTab('packages')}
            className={`pb-4 px-2 font-medium transition-colors ${activeTab === 'packages'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Available Packages
          </button>
          <button
            onClick={() => setActiveTab('my-subscriptions')}
            className={`pb-4 px-2 font-medium transition-colors ${activeTab === 'my-subscriptions'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            My Subscriptions ({subscriptions.length})
          </button>
        </div>

        {/* Available Packages Tab */}
        {activeTab === 'packages' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-16 text-center">
                  <p className="text-gray-500 text-lg">No subscription packages available at the moment</p>
                </CardContent>
              </Card>
            ) : (
              packages.map((pkg) => (
                <Card key={pkg.id} className="flex flex-col">
                  {pkg.imageUrl && (
                    <img
                      src={pkg.imageUrl}
                      alt={pkg.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  )}
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-xl">{pkg.name}</CardTitle>
                      <Badge variant="secondary">{getFrequencyLabel(pkg.frequency)}</Badge>
                    </div>
                    {pkg.description && (
                      <CardDescription>{pkg.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="mb-4">
                      <p className="text-3xl font-bold text-green-600">
                        ₹{pkg.price.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">per {getFrequencyDisplayText(pkg.frequency)}</p>
                    </div>

                    {pkg.features && (
                      <div className="mb-6 space-y-2">
                        {parseFeatures(pkg.features).map((feature, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{feature}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button className="w-full mt-auto" asChild>
                      <Link href={`/subscription/new?package=${pkg.id}`}>
                        Subscribe Now
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* My Subscriptions Tab */}
        {activeTab === 'my-subscriptions' && (
          <>
            {subscriptions.length > 0 ? (
              <div className="space-y-6">
                {subscriptions.map((subscription) => (
                  <Card key={subscription.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">
                            {subscription.preference} Fruit Box
                          </CardTitle>
                          <CardDescription>
                            Subscription #{subscription.subscriptionNumber}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(subscription.status)}>
                          {subscription.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Frequency</p>
                          <p className="font-medium">{getFrequencyLabel(subscription.frequency)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Amount</p>
                          <p className="font-medium text-green-600">₹{subscription.totalAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Started On</p>
                          <p className="font-medium">{format(new Date(subscription.startDate), 'PP')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Next Delivery</p>
                          <p className="font-medium">
                            {subscription.status === 'ACTIVE'
                              ? format(new Date(subscription.nextDeliveryDate), 'PP')
                              : 'N/A'
                            }
                          </p>
                        </div>
                      </div>

                      <div className="border-t pt-4 mb-4">
                        <h3 className="font-semibold mb-3">Items in this subscription</h3>
                        <div className="space-y-2">
                          {subscription.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center">
                              <p className="text-sm">{item.product.name}</p>
                              <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t pt-4 mb-4">
                        <h3 className="font-semibold mb-2">Delivery Address</h3>
                        <p className="text-sm text-gray-600">
                          {subscription.address.name}<br />
                          {subscription.address.addressLine1}<br />
                          {subscription.address.addressLine2 && <>{subscription.address.addressLine2}<br /></>}
                          {subscription.address.city}, {subscription.address.state} - {subscription.address.pincode}
                        </p>
                      </div>

                      <div className="flex gap-2 border-t pt-4">
                        {subscription.status === 'ACTIVE' && (
                          <Button variant="outline" size="sm">Pause Subscription</Button>
                        )}
                        {subscription.status === 'PAUSED' && (
                          <Button variant="outline" size="sm">Resume Subscription</Button>
                        )}
                        {subscription.status !== 'CANCELLED' && (
                          <Button variant="outline" size="sm" className="text-red-600">Cancel Subscription</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-gray-500 text-lg mb-4">You don't have any subscriptions yet</p>
                  <Button onClick={() => setActiveTab('packages')}>
                    Browse Available Packages
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
