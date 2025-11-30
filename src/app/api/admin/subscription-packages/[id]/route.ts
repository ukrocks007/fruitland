import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.frequency !== undefined) updateData.frequency = body.frequency;
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.features !== undefined) updateData.features = body.features;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const subscriptionPackage = await prisma.subscriptionPackage.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ package: subscriptionPackage });
  } catch (error) {
    console.error('Error updating subscription package:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription package' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.subscriptionPackage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subscription package:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription package' },
      { status: 500 }
    );
  }
}
