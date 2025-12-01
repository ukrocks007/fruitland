import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';
import {
  convertToCSV,
  formatOrdersForExport,
  ORDER_CSV_HEADERS,
} from '@/lib/export';

/**
 * GET /api/admin/export/orders
 * Export orders to CSV with optional filters
 * Query params:
 *   - from: YYYY-MM-DD (start date)
 *   - to: YYYY-MM-DD (end date)
 *   - status: order status filter
 *   - paymentStatus: payment status filter
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');

    // Build filter conditions
    const where: {
      createdAt?: { gte?: Date; lte?: Date };
      status?: string;
      paymentStatus?: string;
    } = {};

    if (from) {
      where.createdAt = { ...where.createdAt, gte: new Date(from) };
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: toDate };
    }
    if (status) {
      where.status = status;
    }
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        address: {
          select: {
            city: true,
            state: true,
            pincode: true,
          },
        },
        items: {
          select: {
            quantity: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format data for export
    const exportData = formatOrdersForExport(
      orders.map((order) => ({
        ...order,
        razorpayPaymentId: order.razorpayPaymentId,
      }))
    );

    // Convert to CSV
    const csv = convertToCSV(exportData, ORDER_CSV_HEADERS);

    // Generate filename with date range
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `orders-export-${dateStr}.csv`;

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting orders:', error);
    return NextResponse.json(
      { error: 'Failed to export orders' },
      { status: 500 }
    );
  }
}
