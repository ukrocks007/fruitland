import { prisma } from '@/lib/prisma';
import { cache } from 'react';

export interface ThemeConfig {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
}

export interface LandingPageConfig {
    hero: {
        title: string;
        subtitle: string;
        badgeText: string;
        ctaText: string;
        imageUrl: string;
    };
    testimonials: Array<{
        id: number;
        name: string;
        role: string;
        content: string;
        avatar: string;
    }>;
    features: Array<{
        title: string;
        desc: string;
        icon: string;
    }>;
}

export interface FooterConfig {
    description: string;
    socialLinks: {
        facebook?: string;
        twitter?: string;
        instagram?: string;
    };
}

export interface StoreConfig {
    siteName: string;
    theme: ThemeConfig | null;
    landingPage: LandingPageConfig | null;
    footer: FooterConfig | null;
}

export const getStoreConfig = cache(async (): Promise<StoreConfig> => {
    try {
        const configs = await prisma.config.findMany({
            where: {
                key: {
                    in: ['SITE_NAME', 'THEME_CONFIG', 'LANDING_PAGE_CONFIG', 'FOOTER_CONFIG']
                }
            }
        });

        const configMap = configs.reduce((acc, config) => {
            acc[config.key] = config.value;
            return acc;
        }, {} as Record<string, string>);

        return {
            siteName: configMap['SITE_NAME'] || 'Fruitland',
            theme: configMap['THEME_CONFIG'] ? JSON.parse(configMap['THEME_CONFIG']) : null,
            landingPage: configMap['LANDING_PAGE_CONFIG'] ? JSON.parse(configMap['LANDING_PAGE_CONFIG']) : null,
            footer: configMap['FOOTER_CONFIG'] ? JSON.parse(configMap['FOOTER_CONFIG']) : null,
        };
    } catch (error) {
        console.error('Error fetching store config:', error);
        return {
            siteName: 'Fruitland',
            theme: null,
            landingPage: null,
            footer: null,
        };
    }
});
