import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';
import {
  convertToCSV,
  formatInventoryForExport,
  INVENTORY_CSV_HEADERS,
} from '@/lib/export';

/**
 * GET /api/admin/export/inventory
 * Export inventory/product stock levels to CSV
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        stock: true,
        isAvailable: true,
        isSeasonal: true,
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Format data for export
    const exportData = formatInventoryForExport(products);

    // Convert to CSV
    const csv = convertToCSV(exportData, INVENTORY_CSV_HEADERS);

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `inventory-export-${dateStr}.csv`;

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting inventory:', error);
    return NextResponse.json(
      { error: 'Failed to export inventory' },
      { status: 500 }
    );
  }
}
