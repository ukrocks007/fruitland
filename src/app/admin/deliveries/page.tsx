'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/navbar';
import { AdminNavigation } from '@/components/admin-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Truck, CheckCircle, XCircle } from 'lucide-react';

interface DeliveryItem {
    id: string; // Subscription ID
    user: {
        name: string | null;
        phone: string | null;
    };
    address: {
        addressLine1: string;
        city: string;
        pincode: string;
    };
    items: Array<{
        quantity: number;
        product: {
            name: string;
        };
    }>;
    subscriptionNumber: string;
    nextDeliveryDate: string;
}

export default function DailyDeliveriesPage() {
    const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchDeliveries();
    }, []);

    const fetchDeliveries = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/daily-deliveries');
            if (!response.ok) throw new Error('Failed to fetch deliveries');
            const data = await response.json();
            setDeliveries(data.deliveries);
        } catch (error) {
            console.error('Error fetching deliveries:', error);
            toast.error('Failed to load deliveries');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (subscriptionId: string, status: 'DELIVERED' | 'MISSED') => {
        if (!confirm(`Mark this delivery as ${status}?`)) return;

        try {
            setProcessing(subscriptionId);
            const response = await fetch('/api/admin/daily-deliveries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptionId, status, notes: `Marked as ${status} by Admin` }),
            });

            if (!response.ok) throw new Error('Failed to update status');

            toast.success(`Delivery marked as ${status}`);
            // Refresh list to remove processed item (since its date will be bumped)
            fetchDeliveries();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="container mx-auto px-4 py-8">
                <AdminNavigation />

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <Truck className="h-6 w-6" />
                                Daily Deliveries ({new Date().toLocaleDateString()})
                            </CardTitle>
                            <Badge variant="outline" className="text-lg px-4 py-1">
                                Total Due: {deliveries.length}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : deliveries.length === 0 ? (
                            <div className="text-center py-16 text-gray-500">
                                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                                <p className="text-xl">All deliveries for today are completed!</p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Address</TableHead>
                                            <TableHead>Items</TableHead>
                                            <TableHead>Sub #</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {deliveries.map((delivery) => (
                                            <TableRow key={delivery.id}>
                                                <TableCell>
                                                    <div className="font-medium">{delivery.user?.name || 'Guest'}</div>
                                                    <div className="text-sm text-gray-500">{delivery.user?.phone}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {delivery.address.addressLine1}<br />
                                                        {delivery.address.city}, {delivery.address.pincode}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        {delivery.items.map((item, idx) => (
                                                            <div key={idx} className="flex gap-2 text-sm">
                                                                <Badge variant="secondary" className="h-5 px-1.5">{item.quantity}x</Badge>
                                                                <span>{item.product.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {delivery.subscriptionNumber}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700"
                                                            onClick={() => handleAction(delivery.id, 'DELIVERED')}
                                                            disabled={processing === delivery.id}
                                                        >
                                                            {processing === delivery.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                                            Deliver
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleAction(delivery.id, 'MISSED')}
                                                            disabled={processing === delivery.id}
                                                        >
                                                            {processing === delivery.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                                                            Missed
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
