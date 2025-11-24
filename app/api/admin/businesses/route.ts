import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build where clause for search
    const whereClause: any = {
      deletedAt: null, // Only active businesses
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPhone: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.business.count({
      where: whereClause,
    });

    // Get businesses with owner information
    const businesses = await prisma.business.findMany({
      where: whereClause,
      include: {
        User_Business_ownerIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            Product: true,
            User_User_businessIdToBusiness: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      businesses: businesses.map((business: any) => ({
        id: business.id,
        name: business.name,
        logoUrl: business.logoUrl,
        contactPhone: business.contactPhone,
        address: business.address,
        city: business.city,
        state: business.state,
        country: business.country,
        isActive: business.isActive,
        onboardingStatus: business.onboardingStatus,
        createdAt: business.createdAt,
        baseCurrency: business.baseCurrency,
        owner: business.User_Business_ownerIdToUser ? {
          name: `${business.User_Business_ownerIdToUser.firstName} ${business.User_Business_ownerIdToUser.lastName}`,
          email: business.User_Business_ownerIdToUser.email,
        } : null,
        productCount: business._count.Product,
        staffCount: business._count.User_User_businessIdToBusiness || 0,
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    );
  }
}