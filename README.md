# Sendjon 3PL Platform

A comprehensive, enterprise-grade Third-Party Logistics (3PL) platform built with Next.js 15, TypeScript, and Prisma. Features advanced analytics, multi-currency support, cloud image management, and complete business intelligence capabilities.

## 🚀 Complete Feature Set

### Core 3PL Operations
- **Multi-tenant Architecture**: Support for multiple businesses and warehouses
- **Order Management**: Complete order lifecycle from creation to delivery
- **Inventory Management**: Real-time stock tracking, transfers, and optimization
- **User Management**: Role-based access control (Admin, Merchant, Merchant Staff, Logistics)
- **Warehouse Management**: Multi-warehouse support with regional logistics
- **Invoice Generation**: Professional PDF invoice generation and management
- **API-First Design**: RESTful APIs for all operations

### Advanced Analytics & Business Intelligence
- **📊 Dashboard Analytics**: Comprehensive KPIs, metrics, and real-time insights
- **📈 Trend Analysis**: Revenue forecasting, seasonal patterns, and growth tracking
- **🏭 Warehouse Analytics**: Utilization metrics, performance benchmarking, and optimization
- **💰 Financial Analytics**: Profit analysis, cash flow tracking, and financial health scoring
- **📋 Comprehensive Reporting**: Multi-format exports (JSON/CSV) with detailed business reports

### Enterprise Services
- **🌍 Multi-Currency Support**: Real-time exchange rates with 180+ currencies
- **☁️ Cloud Image Management**: Cloudinary integration with optimization and responsive delivery
- **📧 Email Notifications**: Professional HTML templates for all platform communications
- **🔄 Stock Transfers**: Inter-warehouse transfers with approval workflows
- **📊 Business Intelligence**: Advanced forecasting, trend analysis, and insights

### Data Export & Integration
- **PDF Generation**: Professional invoices and reports
- **CSV Exports**: All data available in standardized formats
- **RESTful APIs**: Complete API coverage for third-party integrations
- **Audit Trail**: Complete activity logging and compliance tracking

## 🛠 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based authentication
- **File Storage**: Cloudinary for image management
- **PDF Generation**: PDFKit for professional documents
- **Email Service**: Nodemailer with HTML templates
- **Currency**: Real-time exchange rate APIs with caching
- **Analytics**: Advanced business intelligence and forecasting

## 📊 Analytics & Reporting APIs

### Dashboard Analytics
```
GET /api/analytics/dashboard
- Comprehensive KPIs and metrics
- Real-time order, financial, and inventory insights
- Warehouse utilization and performance
- Top products and recent activity analysis
```

### Trend Analysis & Forecasting
```
GET /api/analytics/trends
- Revenue and order trends with forecasting
- Product performance tracking
- Regional analysis and seasonal patterns
- Growth rate calculations and market insights
```

### Warehouse Analytics
```
GET /api/analytics/warehouse
- Warehouse-specific performance metrics
- Stock health analysis and alerts
- Operational efficiency tracking
- Utilization and capacity optimization
```

### Financial Intelligence
```
GET /api/analytics/financial
- Complete P&L analysis with projections
- Cash flow tracking and health scoring
- Invoice and payment analytics
- Cost analysis and margin optimization
```

### Comprehensive Reporting
```
GET /api/reports/comprehensive
- Multi-section business reports
- Orders, inventory, and financial data
- CSV export capabilities
- Audit trail and compliance reporting
```

## 🌐 Core API Endpoints

### Authentication & Users
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/users` - User management with role-based filtering

### Business Management
- `GET /api/businesses` - Multi-tenant business management
- `POST /api/businesses` - Business creation and configuration
- `POST /api/businesses/[id]/logo` - Cloudinary-powered logo uploads

### Product & Inventory
- `GET /api/products` - Product catalog management
- `POST /api/products/images` - Product image uploads with optimization
- `GET /api/reports/availability` - Stock availability reports with CSV export
- `POST /api/inventory/transfers` - Inter-warehouse stock transfers

### Order Processing
- `GET /api/orders` - Order management and tracking
- `POST /api/orders` - Order creation with automatic stock allocation
- `GET /api/orders/[id]/pdf` - Order confirmation PDFs

### Financial Management
- `GET /api/invoices` - Invoice management and tracking
- `GET /api/invoices/[id]/pdf` - Professional PDF invoices
- `GET /api/currency` - Multi-currency conversion service

### Warehouse Operations
- `GET /api/warehouses` - Warehouse management and analytics
- `POST /api/stock/allocate` - Stock allocation and management
- `GET /api/stock` - Real-time inventory tracking

## 📈 Business Intelligence Features

### Real-Time Dashboards
- **Order Metrics**: Total orders, fulfillment rates, delivery performance
- **Financial KPIs**: Revenue tracking, profit margins, payment analytics
- **Inventory Health**: Stock levels, turnover rates, reorder alerts
- **Warehouse Performance**: Utilization rates, processing efficiency

### Advanced Analytics
- **Trend Analysis**: Historical performance with growth projections
- **Seasonal Patterns**: Weekly and monthly performance patterns
- **Product Intelligence**: Top performers, declining products, opportunity analysis
- **Regional Performance**: Geographic performance tracking and optimization

### Financial Intelligence
- **Profitability Analysis**: Margin tracking and cost optimization
- **Cash Flow Management**: Real-time cash flow tracking and projections
- **Invoice Analytics**: Payment patterns and collection efficiency
- **Cost Analysis**: Operational cost tracking and optimization

### Predictive Analytics
- **Revenue Forecasting**: AI-powered revenue predictions
- **Demand Planning**: Product demand forecasting and inventory optimization
- **Growth Analysis**: Business growth tracking and opportunity identification

## 🔧 Configuration & Setup

### Environment Variables (see .env.example)
```env
# Database
DATABASE_URL="postgresql://..."
JWT_SECRET="your-jwt-secret"

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email Configuration
SMTP_HOST="your-smtp-host"
SMTP_PORT=587
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
SMTP_FROM_EMAIL="noreply@yourcompany.com"

# Company Information
COMPANY_NAME="Your Company"
COMPANY_EMAIL="contact@yourcompany.com"
COMPANY_ADDRESS="Your Company Address"

# Optional
CURRENCY_API_KEY="for-enhanced-rates"
DEFAULT_CURRENCY="NGN"
```

### Quick Start
1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd sendjon
   npm install
   ```

2. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Configure Services**
   - Copy `.env.example` to `.env`
   - Configure Cloudinary for image management
   - Set up SMTP for email notifications
   - Add currency API key for enhanced rates

4. **Launch Platform**
   ```bash
   npm run dev
   ```

## 🔐 Role-Based Access Control

### **ADMIN** - Full Platform Access
- Complete system administration
- Cross-business analytics and reporting
- User management and configuration
- Audit trail and compliance monitoring

### **MERCHANT** - Business Management
- Business-specific analytics and reporting
- Product and inventory management
- Order processing and fulfillment
- Financial tracking and invoicing

### **MERCHANT_STAFF** - Operations Support
- Order processing and inventory management
- Limited analytics access
- Customer service operations

### **LOGISTICS** - Warehouse Operations
- Regional warehouse management
- Stock transfers and allocation
- Fulfillment operations
- Regional performance analytics

## 🎯 Key Business Capabilities

### Multi-Warehouse Operations
- Cross-warehouse inventory visibility
- Automated stock transfers and rebalancing
- Regional fulfillment optimization
- Warehouse performance benchmarking

### Financial Management
- Multi-currency support with real-time rates
- Automated invoicing with professional PDFs
- Payment tracking and collections management
- Financial health monitoring and alerts

### Advanced Reporting
- Real-time business intelligence dashboards
- Exportable reports in multiple formats
- Automated alert systems
- Compliance and audit trail reporting

### Integration Ready
- RESTful API architecture
- Webhook support for real-time updates
- Third-party system integration capabilities
- Scalable multi-tenant architecture

## 📊 Platform Overview API
```
GET /api/overview
Complete documentation of all available endpoints, features, and capabilities
```

## 🚀 Production Readiness

This platform is production-ready with:
- ✅ Enterprise-grade security and authentication
- ✅ Scalable multi-tenant architecture
- ✅ Comprehensive error handling and logging
- ✅ Professional PDF generation and email templates
- ✅ Cloud-based image management
- ✅ Real-time analytics and business intelligence
- ✅ Multi-currency and internationalization support
- ✅ Complete audit trail and compliance features

## 📝 License

[Your License Here]
