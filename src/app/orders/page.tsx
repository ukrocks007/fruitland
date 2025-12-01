import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { OrderItemWithReview } from '@/components/order-item-with-review';

async function getUserOrdersWithReviews(userId: string) {
  const orders = await prisma.order.findMany({
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

  // Get user's reviews for all products they've ordered
  const productIds = orders.flatMap(order => order.items.map(item => item.productId));
  const reviews = await prisma.review.findMany({
    where: {
      userId,
      productId: { in: productIds },
    },
    select: {
      id: true,
      productId: true,
      rating: true,
    },
  });

  // Create a map of productId to review for quick lookup
  const reviewMap = new Map(reviews.map(review => [review.productId, review]));

  return { orders, reviewMap };
}

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  const { orders, reviewMap } = await getUserOrdersWithReviews(session.user.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800';
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Orders</h1>

        {orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">Order #{order.orderNumber}</CardTitle>
                      <CardDescription>
                        Placed on {format(new Date(order.createdAt), 'PPP')}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                      <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                        {order.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Order Items */}
                  <div className="space-y-3 mb-4">
                    {order.items.map((item) => (
                      <OrderItemWithReview
                        key={item.id}
                        item={item}
                        canReview={order.status === 'DELIVERED' && order.paymentStatus === 'PAID'}
                        existingReview={reviewMap.get(item.productId) || null}
                      />
                    ))}
                  </div>

                  {/* Delivery Address */}
                  <div className="border-t pt-4 mb-4">
                    <h3 className="font-semibold mb-2">Delivery Address</h3>
                    <p className="text-sm text-gray-600">
                      {order.address.name}<br />
                      {order.address.addressLine1}<br />
                      {order.address.addressLine2 && <>{order.address.addressLine2}<br /></>}
                      {order.address.city}, {order.address.state} - {order.address.pincode}<br />
                      Phone: {order.address.phone}
                    </p>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center border-t pt-4">
                    <span className="font-semibold text-lg">Total Amount</span>
                    <span className="font-bold text-xl text-green-600">₹{order.totalAmount.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-gray-500 text-lg mb-4">You haven't placed any orders yet</p>
              <a href="/products" className="text-green-600 hover:underline">
                Start shopping →
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
