import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    return NextResponse.json({
      analytics: {
        dashboard: {
          endpoint: '/api/analytics/dashboard',
          description: 'Comprehensive dashboard with key metrics, KPIs, and recent activity',
          parameters: [
            'period (days, default: 30)',
            'currency (default: NGN)'
          ],
          features: [
            'Order metrics (total, pending, delivered, canceled)',
            'Financial metrics (revenue, average order value)',
            'Inventory metrics (stock levels, movements)',
            'Billing metrics (invoices, payment rates)',
            'Warehouse utilization statistics',
            'Top products analysis',
            'Real-time insights and recommendations'
          ]
        },
        
        trends: {
          endpoint: '/api/analytics/trends',
          description: 'Trend analysis with forecasting and seasonal patterns',
          parameters: [
            'period (days, default: 90)',
            'granularity (daily/weekly/monthly, default: daily)',
            'currency (default: NGN)'
          ],
          features: [
            'Order and revenue trends over time',
            'Product performance trends',
            'Regional performance analysis',
            'Growth rate calculations',
            'Seasonal pattern detection',
            'Revenue forecasting',
            'Market trend insights'
          ]
        },
        
        warehouse: {
          endpoint: '/api/analytics/warehouse',
          description: 'Warehouse-specific analytics and operational metrics',
          parameters: [
            'warehouseId (optional, specific warehouse)',
            'period (days, default: 30)'
          ],
          features: [
            'Warehouse utilization and capacity',
            'Order processing performance',
            'Stock health analysis (low stock, overstock)',
            'Stock movement tracking',
            'Product diversity metrics',
            'Operational alerts and recommendations',
            'Performance benchmarking'
          ],
          access: 'Admin and Logistics roles only'
        },
        
        financial: {
          endpoint: '/api/analytics/financial',
          description: 'Complete financial analysis and reporting',
          parameters: [
            'period (days, default: 30)',
            'currency (default: NGN)',
            'projections (true/false, default: false)'
          ],
          features: [
            'Revenue and cost analysis',
            'Profit and margin calculations',
            'Invoice and payment analysis',
            'Cash flow tracking',
            'Financial health scoring',
            'Revenue projections',
            'Financial insights and alerts'
          ]
        }
      },
      
      reports: {
        availability: {
          endpoint: '/api/reports/availability',
          description: 'Product availability and inventory reports',
          parameters: [
            'format (json/csv, default: json)',
            'businessId (optional)',
            'warehouseId (optional)',
            'lowStockOnly (true/false)',
            'currency (default: NGN)'
          ],
          features: [
            'Stock level analysis',
            'Low stock detection',
            'Out of stock tracking',
            'Reorder recommendations',
            'Availability percentages',
            'CSV export capability'
          ]
        },
        
        comprehensive: {
          endpoint: '/api/reports/comprehensive',
          description: 'Multi-section comprehensive business report',
          parameters: [
            'format (json/csv, default: json)',
            'period (days, default: 30)',
            'type (comprehensive/orders/inventory/financial, default: comprehensive)'
          ],
          features: [
            'Orders detailed report',
            'Inventory status report',
            'Financial transactions report',
            'Audit trail (admin only)',
            'Multi-format export (JSON/CSV)',
            'Role-based data filtering'
          ]
        }
      },
      
      management: {
        currency: {
          endpoint: '/api/currency',
          description: 'Currency conversion service',
          methods: ['GET', 'POST'],
          features: [
            'Real-time exchange rates',
            'Multi-currency conversion',
            'Rate caching',
            'Batch conversions',
            'Formatted currency display'
          ]
        },
        
        images: {
          endpoints: [
            '/api/products/images',
            '/api/businesses/[id]/logo'
          ],
          description: 'Cloudinary-powered image management',
          methods: ['POST', 'DELETE'],
          features: [
            'Image upload and optimization',
            'Responsive image URLs',
            'Automatic format conversion',
            'Cloud storage integration',
            'Image deletion management'
          ]
        },
        
        transfers: {
          endpoint: '/api/inventory/transfers',
          description: 'Stock transfer management',
          methods: ['GET', 'POST', 'PATCH'],
          features: [
            'Inter-warehouse transfers',
            'Transfer status tracking',
            'Approval workflows',
            'Transfer history',
            'Audit trail integration'
          ]
        }
      },
      
      services: {
        email: {
          description: 'Comprehensive email notification system',
          features: [
            'Order status notifications',
            'Invoice delivery',
            'Stock level alerts',
            'User account management emails',
            'Professional HTML templates',
            'SMTP integration'
          ]
        },
        
        currency: {
          description: 'Multi-currency support service',
          features: [
            'Real-time exchange rates',
            'Rate caching (1-hour TTL)',
            'Fallback rate providers',
            'Currency formatting',
            'Batch conversion support'
          ]
        },
        
        cloudinary: {
          description: 'Cloud image management service',
          features: [
            'Image upload and storage',
            'Automatic optimization',
            'Responsive image generation',
            'Format conversion',
            'CDN delivery'
          ]
        }
      },
      
      rolePermissions: {
        ADMIN: {
          access: 'Full access to all analytics and reports',
          features: [
            'All dashboard metrics',
            'All warehouse analytics',
            'Complete financial data',
            'Audit trail access',
            'Cross-business reporting'
          ]
        },
        
        MERCHANT: {
          access: 'Business-specific analytics and reports',
          features: [
            'Own business metrics only',
            'Order and inventory data',
            'Financial data for own business',
            'Product performance analysis',
            'Invoice and payment tracking'
          ]
        },
        
        MERCHANT_STAFF: {
          access: 'Same as MERCHANT role',
          features: [
            'Business-specific data access',
            'Operational metrics',
            'Inventory monitoring',
            'Order tracking'
          ]
        },
        
        LOGISTICS: {
          access: 'Region-specific warehouse analytics',
          features: [
            'Assigned warehouse metrics',
            'Regional performance data',
            'Warehouse utilization analysis',
            'Stock movement tracking',
            'Operational insights'
          ]
        }
      },
      
      configuration: {
        requiredEnvironmentVariables: [
          'CLOUDINARY_CLOUD_NAME',
          'CLOUDINARY_API_KEY', 
          'CLOUDINARY_API_SECRET',
          'SMTP_HOST',
          'SMTP_PORT',
          'SMTP_USER',
          'SMTP_PASS',
          'SMTP_FROM_EMAIL',
          'COMPANY_NAME',
          'COMPANY_EMAIL',
          'COMPANY_ADDRESS'
        ],
        
        optionalEnvironmentVariables: [
          'CURRENCY_API_KEY (for enhanced rate accuracy)',
          'DEFAULT_CURRENCY (default: NGN)',
          'CACHE_TTL_HOURS (default: 1)'
        ]
      },
      
      capabilities: {
        dataExport: ['JSON', 'CSV'],
        currencies: 'All major currencies via exchange rate API',
        imageFormats: ['JPEG', 'PNG', 'WebP', 'AVIF'],
        emailTemplates: ['HTML', 'Plain Text'],
        auditTrail: 'Complete activity logging',
        realTimeData: 'Live analytics and metrics',
        roleBasedAccess: 'Secure data filtering by user role',
        multiWarehouse: 'Support for multiple warehouse operations',
        forecasting: 'Revenue and trend predictions',
        alertSystem: 'Automated threshold-based alerts'
      },
      
      nextSteps: [
        '1. Configure environment variables from .env.example',
        '2. Set up Cloudinary account for image management',
        '3. Configure SMTP settings for email notifications',
        '4. Test analytics endpoints with your user roles',
        '5. Customize currency and localization settings',
        '6. Set up scheduled reporting if needed',
        '7. Configure warehouse-specific thresholds'
      ]
    });

  } catch (error) {
    console.error("Error generating API overview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}