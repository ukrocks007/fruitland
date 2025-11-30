import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import Link from 'next/link';

async function getUserSubscriptions(userId: string) {
  return prisma.subscription.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      address: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export default async function SubscriptionsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  const subscriptions = await getUserSubscriptions(session.user.id);

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
    switch (frequency) {
      case 'WEEKLY':
        return 'Weekly';
      case 'BIWEEKLY':
        return 'Bi-weekly';
      case 'MONTHLY':
        return 'Monthly';
      default:
        return frequency;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Subscriptions</h1>
          <Link href="/subscription/new">
            <Button>Create New Subscription</Button>
          </Link>
        </div>

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
                  {/* Subscription Details */}
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

                  {/* Subscription Items */}
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

                  {/* Delivery Address */}
                  <div className="border-t pt-4 mb-4">
                    <h3 className="font-semibold mb-2">Delivery Address</h3>
                    <p className="text-sm text-gray-600">
                      {subscription.address.name}<br />
                      {subscription.address.addressLine1}<br />
                      {subscription.address.addressLine2 && <>{subscription.address.addressLine2}<br /></>}
                      {subscription.address.city}, {subscription.address.state} - {subscription.address.pincode}
                    </p>
                  </div>

                  {/* Actions */}
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
              <Link href="/subscription/new">
                <Button>Create Your First Subscription</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
