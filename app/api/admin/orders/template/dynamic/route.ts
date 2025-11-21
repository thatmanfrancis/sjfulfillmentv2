import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Get actual products and businesses from the database
    const [products, businesses] = await Promise.all([
      prisma.product.findMany({
        select: {
          sku: true,
          name: true,
          Business: {
            select: {
              name: true
            }
          }
        },
        take: 20, // Limit to first 20 products for template
        orderBy: {
          sku: 'asc'
        }
      }),
      prisma.business.findMany({
        select: {
          name: true
        },
        take: 10, // Get first 10 businesses
        orderBy: {
          name: 'asc'
        }
      })
    ]);

    if (products.length === 0) {
      // Fallback to sample data if no products exist
      const csvContent = `customerName,customerPhone,customerAddress,businessName,productSku,quantity
John Doe,+234-800-123-4567,"123 Main Street Lagos Nigeria",Sample Business,SAMPLE-001,2
Jane Smith,+234-800-987-6543,"456 Victoria Island Lagos Nigeria",Sample Business,SAMPLE-002,1
Mike Johnson,+234-800-555-0123,"789 Ikeja Lagos Nigeria",Sample Business,SAMPLE-003,5`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="bulk-orders-template.csv"'
        }
      });
    }

    // Generate CSV with real product data
    let csvContent = 'customerName,customerPhone,customerAddress,businessName,productSku,quantity\n';
    
    const sampleCustomers = [
      { name: 'John Doe', phone: '+234-800-123-4567', address: '123 Main Street, Lagos, Nigeria' },
      { name: 'Jane Smith', phone: '+234-800-987-6543', address: '456 Victoria Island, Lagos, Nigeria' },
      { name: 'Mike Johnson', phone: '+234-800-555-0123', address: '789 Ikeja, Lagos, Nigeria' },
      { name: 'Sarah Williams', phone: '+234-800-444-5678', address: '321 Abuja, FCT, Nigeria' },
      { name: 'David Brown', phone: '+234-800-333-2222', address: '654 Port Harcourt, Rivers, Nigeria' },
      { name: 'Mary Wilson', phone: '+234-800-777-8888', address: '987 Kano, Kano State, Nigeria' },
      { name: 'James Davis', phone: '+234-800-666-9999', address: '246 Ibadan, Oyo State, Nigeria' },
      { name: 'Linda Miller', phone: '+234-800-555-4444', address: '135 Kaduna, Kaduna State, Nigeria' }
    ];

    // Create sample orders using real products
    for (let i = 0; i < Math.min(15, products.length); i++) {
      const product = products[i];
      const customer = sampleCustomers[i % sampleCustomers.length];
      const quantity = Math.floor(Math.random() * 5) + 1; // Random quantity 1-5
      
      csvContent += `"${customer.name}","${customer.phone}","${customer.address}","${product.Business.name}","${product.sku}",${quantity}\n`;
    }

    // Add a few more rows with different combinations
    if (products.length > 5) {
      for (let i = 0; i < 5; i++) {
        const productIndex = Math.floor(Math.random() * Math.min(products.length, 10));
        const customerIndex = Math.floor(Math.random() * sampleCustomers.length);
        const product = products[productIndex];
        const customer = sampleCustomers[customerIndex];
        const quantity = Math.floor(Math.random() * 3) + 1;
        
        csvContent += `"${customer.name}","${customer.phone}","${customer.address}","${product.Business.name}","${product.sku}",${quantity}\n`;
      }
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="bulk-orders-template-with-real-products.csv"'
      }
    });

  } catch (error) {
    console.error('Error generating CSV template with real products:', error);
    
    // Fallback to basic template
    const fallbackCsv = `customerName,customerPhone,customerAddress,businessName,productSku,quantity
John Doe,+234-800-123-4567,"123 Main Street Lagos Nigeria",Your Business Name,YOUR-PRODUCT-SKU,2
Jane Smith,+234-800-987-6543,"456 Victoria Island Lagos Nigeria",Your Business Name,YOUR-PRODUCT-SKU-2,1`;

    return new NextResponse(fallbackCsv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="bulk-orders-template.csv"'
      }
    });
  }
}