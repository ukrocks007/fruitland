import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const configs = await prisma.config.findMany({
            where: {
                key: {
                    in: ['SITE_NAME', 'THEME_CONFIG', 'LANDING_PAGE_CONFIG']
                }
            }
        });

        const configMap = configs.reduce((acc, config) => {
            acc[config.key] = config.value;
            return acc;
        }, {} as Record<string, string>);

        return NextResponse.json({
            siteName: configMap['SITE_NAME'] || 'Fruitland',
            theme: configMap['THEME_CONFIG'] ? JSON.parse(configMap['THEME_CONFIG']) : null,
            landingPage: configMap['LANDING_PAGE_CONFIG'] ? JSON.parse(configMap['LANDING_PAGE_CONFIG']) : null,
        });
    } catch (error) {
        console.error('Error fetching store config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch store config' },
            { status: 500 }
        );
    }
}
