import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';
import {
  convertToCSV,
  formatCustomersForExport,
  CUSTOMER_CSV_HEADERS,
} from '@/lib/export';

/**
 * GET /api/admin/export/customers
 * Export customers list to CSV with metadata (signup date, total orders, total spent)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        orders: {
          select: {
            totalAmount: true,
            paymentStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format data for export
    const exportData = formatCustomersForExport(customers);

    // Convert to CSV
    const csv = convertToCSV(exportData, CUSTOMER_CSV_HEADERS);

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `customers-export-${dateStr}.csv`;

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting customers:', error);
    return NextResponse.json(
      { error: 'Failed to export customers' },
      { status: 500 }
    );
  }
}
