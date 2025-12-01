/**
 * Export utilities for CSV and PDF generation
 */

// Types for export data
export interface OrderExportRow {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  deliveryAddress: string;
  itemCount: number;
}

export interface CustomerExportRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  signupDate: string;
  totalOrders: number;
  totalSpent: number;
}

export interface InventoryExportRow {
  productId: string;
  productName: string;
  category: string;
  price: number;
  stock: number;
  isAvailable: boolean;
  isSeasonal: boolean;
}

export interface AnalyticsExportRow {
  month: string;
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  topProducts: string;
  activeSubscriptions: number;
}

export interface InvoiceData {
  orderNumber: string;
  orderDate: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  deliveryAddress: {
    name: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  taxes: number;
  discount: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
}

/**
 * Convert an array of objects to CSV string
 */
export function convertToCSV<T extends object>(data: T[], headers?: Partial<Record<keyof T, string>>): string {
  if (data.length === 0) {
    return '';
  }

  const keys = Object.keys(data[0]) as (keyof T)[];
  
  // Create header row
  const headerRow = keys.map(key => {
    const header = headers?.[key] ?? String(key);
    // Escape quotes and wrap in quotes if contains comma or quotes
    return `"${String(header).replace(/"/g, '""')}"`;
  }).join(',');

  // Create data rows
  const dataRows = data.map(row => {
    return keys.map(key => {
      const value = row[key];
      const stringValue = value === null || value === undefined ? '' : String(value);
      // Escape quotes and wrap in quotes if contains comma, quotes, or newlines
      return `"${stringValue.replace(/"/g, '""')}"`;
    }).join(',');
  }).join('\n');

  return `${headerRow}\n${dataRows}`;
}

/**
 * Generate orders CSV export data
 */
export function formatOrdersForExport(orders: Array<{
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  razorpayPaymentId: string | null;
  createdAt: Date;
  user: { name: string | null; email: string };
  address: { 
    city: string; 
    state: string;
    pincode: string;
  };
  items: Array<{ quantity: number }>;
}>): OrderExportRow[] {
  return orders.map(order => ({
    orderNumber: order.orderNumber,
    customerName: order.user.name || 'N/A',
    customerEmail: order.user.email,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.razorpayPaymentId ? 'Razorpay' : 'COD',
    createdAt: order.createdAt.toISOString().split('T')[0],
    deliveryAddress: `${order.address.city}, ${order.address.state} - ${order.address.pincode}`,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
  }));
}

/**
 * Generate customers CSV export data
 */
export function formatCustomersForExport(customers: Array<{
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: Date;
  orders: Array<{ totalAmount: number; paymentStatus: string }>;
}>): CustomerExportRow[] {
  return customers.map(customer => {
    const paidOrders = customer.orders.filter(o => o.paymentStatus === 'PAID');
    return {
      id: customer.id,
      name: customer.name || 'N/A',
      email: customer.email,
      phone: customer.phone || 'N/A',
      signupDate: customer.createdAt.toISOString().split('T')[0],
      totalOrders: paidOrders.length,
      totalSpent: paidOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    };
  });
}

/**
 * Generate inventory CSV export data
 */
export function formatInventoryForExport(products: Array<{
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  isAvailable: boolean;
  isSeasonal: boolean;
}>): InventoryExportRow[] {
  return products.map(product => ({
    productId: product.id,
    productName: product.name,
    category: product.category,
    price: product.price,
    stock: product.stock,
    isAvailable: product.isAvailable,
    isSeasonal: product.isSeasonal,
  }));
}

/**
 * Generate analytics CSV export data
 */
export function formatAnalyticsForExport(analytics: {
  revenueByMonth: Array<{ month: string; revenue: number }>;
  ordersByMonth?: Array<{ month: string; count: number }>;
  topProducts: Array<{ product: { name: string } | null; totalSold: number }>;
  subscriptionGrowth: Array<{ month: string; count: number }>;
}): AnalyticsExportRow[] {
  return analytics.revenueByMonth.map((monthData, index) => {
    const orderCount = analytics.ordersByMonth?.[index]?.count || 0;
    const topProductsStr = analytics.topProducts
      .filter(p => p.product)
      .slice(0, 3)
      .map(p => `${p.product!.name} (${p.totalSold})`)
      .join('; ');
    const subscriptionCount = analytics.subscriptionGrowth[index]?.count || 0;

    return {
      month: monthData.month,
      totalRevenue: monthData.revenue,
      orderCount,
      averageOrderValue: orderCount > 0 ? monthData.revenue / orderCount : 0,
      topProducts: topProductsStr,
      activeSubscriptions: subscriptionCount,
    };
  });
}

/**
 * Format order data for invoice PDF
 */
export function formatInvoiceData(order: {
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  razorpayPaymentId: string | null;
  createdAt: Date;
  user: { name: string | null; email: string; phone: string | null };
  address: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  items: Array<{
    quantity: number;
    price: number;
    product: { name: string };
  }>;
}): InvoiceData {
  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  return {
    orderNumber: order.orderNumber,
    orderDate: order.createdAt.toISOString().split('T')[0],
    customer: {
      name: order.user.name || order.address.name,
      email: order.user.email,
      phone: order.user.phone || order.address.phone,
    },
    deliveryAddress: {
      name: order.address.name,
      addressLine1: order.address.addressLine1,
      addressLine2: order.address.addressLine2,
      city: order.address.city,
      state: order.address.state,
      pincode: order.address.pincode,
    },
    items: order.items.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
    })),
    subtotal,
    taxes: 0, // Can be configured based on business rules
    discount: 0, // Can be configured based on order discounts
    totalAmount: order.totalAmount,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.razorpayPaymentId ? 'Razorpay' : 'Cash on Delivery',
  };
}

/**
 * Generate a simple HTML invoice that can be converted to PDF by the browser
 */
export function generateInvoiceHTML(invoice: InvoiceData): string {
  const itemRows = invoice.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.totalPrice.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${invoice.orderNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #16a34a; }
    .invoice-info { text-align: right; }
    .invoice-number { font-size: 20px; font-weight: bold; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: bold; color: #666; margin-bottom: 8px; text-transform: uppercase; }
    .customer-info, .address-info { background: #f9f9f9; padding: 16px; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { padding: 12px 8px; text-align: left; background: #16a34a; color: white; }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: right; }
    .totals { margin-top: 24px; text-align: right; }
    .totals-row { display: flex; justify-content: flex-end; padding: 8px 0; }
    .totals-label { margin-right: 40px; color: #666; }
    .totals-value { font-weight: bold; min-width: 100px; }
    .grand-total { font-size: 18px; border-top: 2px solid #333; padding-top: 16px; margin-top: 8px; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
    .payment-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .paid { background: #dcfce7; color: #16a34a; }
    .pending { background: #fef3c7; color: #d97706; }
    @media print {
      body { margin: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🍎 Fruitland</div>
    <div class="invoice-info">
      <div class="invoice-number">Invoice #${invoice.orderNumber}</div>
      <div>Date: ${invoice.orderDate}</div>
      <div style="margin-top: 8px;">
        <span class="payment-badge ${invoice.paymentStatus === 'PAID' ? 'paid' : 'pending'}">
          ${invoice.paymentStatus}
        </span>
      </div>
    </div>
  </div>

  <div style="display: flex; gap: 24px;">
    <div class="section" style="flex: 1;">
      <div class="section-title">Bill To</div>
      <div class="customer-info">
        <div style="font-weight: bold;">${invoice.customer.name}</div>
        <div>${invoice.customer.email}</div>
        <div>${invoice.customer.phone}</div>
      </div>
    </div>

    <div class="section" style="flex: 1;">
      <div class="section-title">Deliver To</div>
      <div class="address-info">
        <div style="font-weight: bold;">${invoice.deliveryAddress.name}</div>
        <div>${invoice.deliveryAddress.addressLine1}</div>
        ${invoice.deliveryAddress.addressLine2 ? `<div>${invoice.deliveryAddress.addressLine2}</div>` : ''}
        <div>${invoice.deliveryAddress.city}, ${invoice.deliveryAddress.state} - ${invoice.deliveryAddress.pincode}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Order Items</div>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <div class="totals-row">
      <span class="totals-label">Subtotal:</span>
      <span class="totals-value">₹${invoice.subtotal.toFixed(2)}</span>
    </div>
    ${invoice.taxes > 0 ? `
    <div class="totals-row">
      <span class="totals-label">Taxes:</span>
      <span class="totals-value">₹${invoice.taxes.toFixed(2)}</span>
    </div>
    ` : ''}
    ${invoice.discount > 0 ? `
    <div class="totals-row">
      <span class="totals-label">Discount:</span>
      <span class="totals-value">-₹${invoice.discount.toFixed(2)}</span>
    </div>
    ` : ''}
    <div class="totals-row grand-total">
      <span class="totals-label">Grand Total:</span>
      <span class="totals-value">₹${invoice.totalAmount.toFixed(2)}</span>
    </div>
  </div>

  <div class="section">
    <div style="margin-top: 16px; padding: 12px; background: #f0f9ff; border-radius: 8px;">
      <strong>Payment Method:</strong> ${invoice.paymentMethod}
    </div>
  </div>

  <div class="footer">
    <p>Thank you for shopping with Fruitland!</p>
    <p>For questions about this invoice, please contact support@fruitland.com</p>
  </div>
</body>
</html>
`;
}

/**
 * CSV header mappings for better readability
 */
export const ORDER_CSV_HEADERS: Record<keyof OrderExportRow, string> = {
  orderNumber: 'Order Number',
  customerName: 'Customer Name',
  customerEmail: 'Customer Email',
  totalAmount: 'Total Amount (₹)',
  status: 'Order Status',
  paymentStatus: 'Payment Status',
  paymentMethod: 'Payment Method',
  createdAt: 'Order Date',
  deliveryAddress: 'Delivery Address',
  itemCount: 'Item Count',
};

export const CUSTOMER_CSV_HEADERS: Record<keyof CustomerExportRow, string> = {
  id: 'Customer ID',
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  signupDate: 'Signup Date',
  totalOrders: 'Total Orders',
  totalSpent: 'Total Spent (₹)',
};

export const INVENTORY_CSV_HEADERS: Record<keyof InventoryExportRow, string> = {
  productId: 'Product ID',
  productName: 'Product Name',
  category: 'Category',
  price: 'Price (₹)',
  stock: 'Stock Quantity',
  isAvailable: 'Available',
  isSeasonal: 'Seasonal',
};

export const ANALYTICS_CSV_HEADERS: Record<keyof AnalyticsExportRow, string> = {
  month: 'Month',
  totalRevenue: 'Total Revenue (₹)',
  orderCount: 'Order Count',
  averageOrderValue: 'Avg Order Value (₹)',
  topProducts: 'Top Products',
  activeSubscriptions: 'Active Subscriptions',
};
