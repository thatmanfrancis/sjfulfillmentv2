import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Read the CSV template from public/templates
    const csvContent = `customerName,customerPhone,customerAddress,businessName,productSku,quantity
John Doe,+234-800-123-4567,"123 Main Street Lagos Nigeria",ABC Electronics,PHONE-001,2
Jane Smith,+234-800-987-6543,"456 Victoria Island Lagos Nigeria",ABC Electronics,LAPTOP-002,1
Mike Johnson,+234-800-555-0123,"789 Ikeja Lagos Nigeria",XYZ Fashion,SHIRT-003,5
Sarah Williams,+234-800-444-5678,"321 Abuja FCT Nigeria",ABC Electronics,PHONE-001,1
David Brown,+234-800-333-2222,"654 Port Harcourt Rivers Nigeria",XYZ Fashion,JEANS-004,3`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="bulk-orders-template.csv"'
      }
    });
  } catch (error) {
    console.error('Error generating CSV template:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}