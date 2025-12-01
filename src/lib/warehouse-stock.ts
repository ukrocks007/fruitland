import { prisma } from './prisma';

interface StockAllocationItem {
  productId: string;
  quantity: number;
}

interface AllocationResult {
  success: boolean;
  warehouseId: string | null;
  error?: string;
}

/**
 * Find a warehouse with sufficient stock for all items.
 * Uses a naive approach: finds the first warehouse with sufficient stock for all items.
 * Can be extended to consider delivery address proximity in the future.
 * 
 * @param items - Array of products and quantities to allocate
 * @param deliveryPincode - Optional pincode for warehouse selection (future enhancement)
 * @returns The warehouse ID if found, null otherwise
 */
export async function findWarehouseWithStock(
  items: StockAllocationItem[],
  deliveryPincode?: string
): Promise<string | null> {
  // Get all active warehouses
  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  // Sort warehouses to prioritize exact pincode match if delivery pincode is provided
  if (deliveryPincode) {
    warehouses.sort((a, b) => {
      if (a.pincode === deliveryPincode && b.pincode !== deliveryPincode) return -1;
      if (b.pincode === deliveryPincode && a.pincode !== deliveryPincode) return 1;
      // Then prioritize by city match (same first digits of pincode usually indicates same area)
      const aPrefix = a.pincode.substring(0, 3);
      const bPrefix = b.pincode.substring(0, 3);
      const deliveryPrefix = deliveryPincode.substring(0, 3);
      if (aPrefix === deliveryPrefix && bPrefix !== deliveryPrefix) return -1;
      if (bPrefix === deliveryPrefix && aPrefix !== deliveryPrefix) return 1;
      return 0;
    });
  }

  // Check each warehouse for sufficient stock
  for (const warehouse of warehouses) {
    const stocks = await prisma.productStock.findMany({
      where: {
        warehouseId: warehouse.id,
        productId: { in: items.map(i => i.productId) },
      },
    });

    // Check if all items have sufficient available stock
    const hasAllItems = items.every(item => {
      const stock = stocks.find(s => s.productId === item.productId);
      if (!stock) return false;
      const availableQuantity = stock.quantity - stock.reservedQuantity;
      return availableQuantity >= item.quantity;
    });

    if (hasAllItems) {
      return warehouse.id;
    }
  }

  return null;
}

/**
 * Allocate stock from a warehouse by updating reserved quantities.
 * This reserves the stock for an order without actually decrementing it.
 * 
 * @param warehouseId - The warehouse to allocate from
 * @param items - Array of products and quantities to allocate
 * @returns Result of the allocation
 */
export async function allocateStock(
  warehouseId: string,
  items: StockAllocationItem[]
): Promise<AllocationResult> {
  try {
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.productStock.update({
          where: {
            warehouseId_productId: {
              warehouseId,
              productId: item.productId,
            },
          },
          data: {
            reservedQuantity: {
              increment: item.quantity,
            },
          },
        });
      }
    });

    return { success: true, warehouseId };
  } catch (error) {
    console.error('Error allocating stock:', error);
    return { success: false, warehouseId: null, error: 'Failed to allocate stock' };
  }
}

/**
 * Confirm stock allocation by decrementing both quantity and reserved quantity.
 * Called when an order is confirmed/paid.
 * 
 * @param warehouseId - The warehouse to confirm allocation from
 * @param items - Array of products and quantities
 */
export async function confirmStockAllocation(
  warehouseId: string,
  items: StockAllocationItem[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.productStock.update({
        where: {
          warehouseId_productId: {
            warehouseId,
            productId: item.productId,
          },
        },
        data: {
          quantity: {
            decrement: item.quantity,
          },
          reservedQuantity: {
            decrement: item.quantity,
          },
        },
      });
    }
  });
}

/**
 * Release reserved stock back to available.
 * Called when an order is cancelled.
 * 
 * @param warehouseId - The warehouse to release stock in
 * @param items - Array of products and quantities to release
 */
export async function releaseStock(
  warehouseId: string,
  items: StockAllocationItem[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.productStock.update({
        where: {
          warehouseId_productId: {
            warehouseId,
            productId: item.productId,
          },
        },
        data: {
          reservedQuantity: {
            decrement: item.quantity,
          },
        },
      });
    }
  });
}

/**
 * Check if stock is available across all warehouses for given items.
 * Returns total available quantity across all warehouses for each product.
 * 
 * @param items - Array of products and quantities to check
 * @returns Object with productId as key and availability info as value
 */
export async function checkGlobalStockAvailability(
  items: StockAllocationItem[]
): Promise<Record<string, { available: number; required: number; sufficient: boolean }>> {
  const result: Record<string, { available: number; required: number; sufficient: boolean }> = {};

  for (const item of items) {
    const stocks = await prisma.productStock.findMany({
      where: {
        productId: item.productId,
        warehouse: { isActive: true },
      },
    });

    const totalAvailable = stocks.reduce((sum, stock) => {
      return sum + (stock.quantity - stock.reservedQuantity);
    }, 0);

    result[item.productId] = {
      available: totalAvailable,
      required: item.quantity,
      sufficient: totalAvailable >= item.quantity,
    };
  }

  return result;
}
