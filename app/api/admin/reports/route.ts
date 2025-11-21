import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has admin role
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const type = url.searchParams.get('type') || '';
    const category = url.searchParams.get('category') || '';
    const status = url.searchParams.get('status') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (type && type !== 'all') {
      where.type = type;
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const [reports, totalCount] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          User: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      prisma.report.count({ where })
    ]);

    const transformedReports = reports.map((report: any) => ({
      id: report.id,
      name: report.title || report.name,
      title: report.title || report.name,
      description: report.description,
      type: report.type || 'CUSTOM',
      category: report.category || 'ANALYTICS',
      status: report.status || 'DRAFT',
      format: report.format || 'PDF',
      frequency: report.frequency || 'ONCE',
      size: report.fileSize || '0 KB',
      lastGenerated: report.lastGeneratedAt?.toISOString(),
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      createdBy: report.createdByUser ? 
        `${report.createdByUser.firstName} ${report.createdByUser.lastName}` : 
        'System',
      downloadUrl: report.filePath || null,
      nextScheduled: report.nextScheduledAt?.toISOString(),
      generationCount: report.generationCount || 0,
      metadata: report.metadata || {}
    }));

    return NextResponse.json({
      reports: transformedReports,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has admin role
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    
    const {
      title,
      description,
      type,
      category,
      format,
      frequency,
      dataSource,
      dateRange,
      filters,
      scheduling,
      visualization,
      permissions
    } = body;

    // Validate required fields
    if (!title || !description || !type || !category || !format) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, type, category, format' },
        { status: 400 }
      );
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        id: `report_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        title,
        name: title, // For backward compatibility
        description,
        type,
        category,
        format,
        frequency: frequency || 'ONCE',
        status: 'DRAFT',
        updatedAt: new Date(),
        configuration: {
          dataSource: dataSource || [],
          dateRange: dateRange || {},
          filters: filters || {},
          visualization: visualization || {},
          permissions: permissions || {}
        },
        scheduledFor: scheduling?.isScheduled && scheduling?.scheduleTime ? 
          new Date(scheduling.scheduleTime) : null,
        metadata: {
          scheduling: scheduling || {},
          createdFrom: 'admin-panel'
        },
        // Note: You'll need to add createdById based on the authenticated user
        // createdById: userId
      }
    });

    // If it's a scheduled report, set up the scheduling
    if (scheduling?.isScheduled) {
      // Here you would typically add the report to a job queue
      // For now, we'll just set the next scheduled time
      await prisma.report.update({
        where: { id: report.id },
        data: {
          nextScheduledAt: new Date(scheduling.scheduleTime)
        }
      });
    }

    return NextResponse.json({
      message: 'Report created successfully',
      report: {
        id: report.id,
        title: report.title,
        status: report.status,
        createdAt: report.createdAt.toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}