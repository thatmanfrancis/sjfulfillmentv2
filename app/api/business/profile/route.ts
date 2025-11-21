import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentSession } from '@/lib/session';
import { z } from 'zod';

const updateBusinessSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's business
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        Business_User_businessIdToBusiness: true
      }
    });

    const business = user?.Business_User_businessIdToBusiness;
    if (!user || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // For merchants, only allow access to their own business
    if (user.role === 'MERCHANT' && user.businessId !== business.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        contactPhone: business.contactPhone,
        address: business.address,
        city: business.city,
        state: business.state,
        country: business.country,
        isActive: business.isActive,
        onboardingStatus: business.onboardingStatus
      }
    });

  } catch (error) {
    console.error('Get business profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = updateBusinessSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      );
    }

    const { name, contactPhone, address, city, state, country } = validationResult.data;

    // Get user's business
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        Business_User_businessIdToBusiness: true
      }
    });

    const business = user?.Business_User_businessIdToBusiness;
    if (!user || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // For merchants, only allow access to their own business
    if (user.role === 'MERCHANT' && user.businessId !== business.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update business information
    const updatedBusiness = await prisma.business.update({
      where: { id: business.id },
      data: {
        name,
        contactPhone,
        address,
        city,
        state,
        country,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Business information updated successfully',
      business: {
        id: updatedBusiness.id,
        name: updatedBusiness.name,
        contactPhone: updatedBusiness.contactPhone,
        address: updatedBusiness.address,
        city: updatedBusiness.city,
        state: updatedBusiness.state,
        country: updatedBusiness.country
      }
    });

  } catch (error) {
    console.error('Update business profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}