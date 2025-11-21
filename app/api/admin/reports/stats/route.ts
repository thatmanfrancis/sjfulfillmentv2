import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';

export async function GET() {
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
    const [
      totalReports,
      draftReports,
      publishedReports,
      scheduledReports,
      recentReports,
      generationSum
    ] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { status: 'DRAFT' } }),
      prisma.report.count({ where: { status: 'PUBLISHED' } }),
      prisma.report.count({ where: { status: 'SCHEDULED' } }),
      prisma.report.count({ 
        where: { 
          createdAt: { 
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          } 
        } 
      }),
      prisma.report.aggregate({
        _sum: { generationCount: true }
      })
    ]);

    const totalGenerations = generationSum._sum.generationCount || 0;
    const averageGenerationsPerReport = totalReports > 0 ? 
      Math.round((totalGenerations / totalReports) * 100) / 100 : 0;

    return NextResponse.json({
      totalReports,
      draftReports,
      publishedReports,
      scheduledReports,
      recentReports,
      totalGenerations,
      averageGenerationsPerReport,
      completionRate: totalReports > 0 ? 
        Math.round(((publishedReports / totalReports) * 100) * 100) / 100 : 0
    });

  } catch (error) {
    console.error('Error fetching report stats:', error);
    return NextResponse.json(
      { 
        totalReports: 0,
        draftReports: 0,
        publishedReports: 0,
        scheduledReports: 0,
        recentReports: 0,
        totalGenerations: 0,
        averageGenerationsPerReport: 0,
        completionRate: 0
      },
      { status: 200 }
    );
  }
}