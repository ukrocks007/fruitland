'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/navbar';
import { AdminNavigation } from '@/components/admin-navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Save, Star, Palette, Layout, CreditCard, Mail, Settings } from 'lucide-react';

interface ConfigItem {
  key: string;
  value: string;
}

interface LoyaltySettings {
  pointsPerRupee: string;
  minRedeemablePoints: string;
  pointValueInRupees: string;
  silverTierThreshold: string;
  goldTierThreshold: string;
}

interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

interface LandingPageConfig {
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

interface FooterConfig {
  description: string;
  socialLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
  };
}

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#16a34a', // green-600
  secondaryColor: '#eab308', // yellow-500
  logoUrl: '',
};

const DEFAULT_LANDING_PAGE: LandingPageConfig = {
  hero: {
    title: "Nature's Sweetest Bounty, Delivered.",
    subtitle: "Experience the true taste of nature with our hand-picked, seasonal fruits. From local orchards to your doorstep in 24 hours.",
    badgeText: "100% Organic & Farm Fresh",
    ctaText: "Shop Fresh",
    imageUrl: "",
  },
  testimonials: [],
  features: [],
};

const DEFAULT_FOOTER: FooterConfig = {
  description: "Delivering nature's finest fruits directly from organic farms to your doorstep. Freshness guaranteed.",
  socialLinks: {
    facebook: '',
    twitter: '',
    instagram: '',
  },
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  // Form state
  const [paymentSettings, setPaymentSettings] = useState({
    enableOnlinePayment: true,
    enableCOD: true,
  });

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPassword: '',
    emailFrom: '',
  });

  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'Fruitland',
    supportEmail: '',
    lowStockThreshold: '10',
  });

  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_THEME);
  const [landingPageConfig, setLandingPageConfig] = useState<LandingPageConfig>(DEFAULT_LANDING_PAGE);
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(DEFAULT_FOOTER);

  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>({
    pointsPerRupee: '0.01',
    minRedeemablePoints: '100',
    pointValueInRupees: '1',
    silverTierThreshold: '500',
    goldTierThreshold: '2000',
  });

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/config');
      if (!response.ok) throw new Error('Failed to fetch config');
      const data = await response.json();

      const configMap: Record<string, string> = {};
      data.configs.forEach((config: ConfigItem) => {
        configMap[config.key] = config.value;
      });

      // Parse configs into form state
      setPaymentSettings({
        enableOnlinePayment: configMap['ENABLE_ONLINE_PAYMENT'] !== 'false',
        enableCOD: configMap['ENABLE_COD'] !== 'false',
      });

      setEmailSettings({
        smtpHost: configMap['SMTP_HOST'] || '',
        smtpPort: configMap['SMTP_PORT'] || '',
        smtpUser: configMap['SMTP_USER'] || '',
        smtpPassword: configMap['SMTP_PASSWORD'] || '',
        emailFrom: configMap['EMAIL_FROM'] || '',
      });

      setGeneralSettings({
        siteName: configMap['SITE_NAME'] || 'Fruitland',
        supportEmail: configMap['SUPPORT_EMAIL'] || '',
        lowStockThreshold: configMap['LOW_STOCK_THRESHOLD'] || '10',
      });

      if (configMap['THEME_CONFIG']) {
        try {
          setThemeConfig({ ...DEFAULT_THEME, ...JSON.parse(configMap['THEME_CONFIG']) });
        } catch (e) {
          console.error('Error parsing theme config', e);
        }
      }

      if (configMap['LANDING_PAGE_CONFIG']) {
        try {
          setLandingPageConfig({ ...DEFAULT_LANDING_PAGE, ...JSON.parse(configMap['LANDING_PAGE_CONFIG']) });
        } catch (e) {
          console.error('Error parsing landing page config', e);
        }
      }

      if (configMap['FOOTER_CONFIG']) {
        try {
          setFooterConfig({ ...DEFAULT_FOOTER, ...JSON.parse(configMap['FOOTER_CONFIG']) });
        } catch (e) {
          console.error('Error parsing footer config', e);
        }
      }

      // Fetch loyalty settings
      const loyaltyResponse = await fetch('/api/admin/loyalty');
      if (loyaltyResponse.ok) {
        const loyaltyData = await loyaltyResponse.json();
        setLoyaltySettings({
          pointsPerRupee: String(loyaltyData.settings.pointsPerRupee),
          minRedeemablePoints: String(loyaltyData.settings.minRedeemablePoints),
          pointValueInRupees: String(loyaltyData.settings.pointValueInRupees),
          silverTierThreshold: String(loyaltyData.settings.silverTierThreshold),
          goldTierThreshold: String(loyaltyData.settings.goldTierThreshold),
        });
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const configUpdates = [
        { key: 'ENABLE_ONLINE_PAYMENT', value: paymentSettings.enableOnlinePayment.toString(), label: 'Enable Online Payment', category: 'payment' },
        { key: 'ENABLE_COD', value: paymentSettings.enableCOD.toString(), label: 'Enable Cash on Delivery', category: 'payment' },
        { key: 'SMTP_HOST', value: emailSettings.smtpHost, label: 'SMTP Host', category: 'email' },
        { key: 'SMTP_PORT', value: emailSettings.smtpPort, label: 'SMTP Port', category: 'email' },
        { key: 'SMTP_USER', value: emailSettings.smtpUser, label: 'SMTP Username', category: 'email' },
        { key: 'SMTP_PASSWORD', value: emailSettings.smtpPassword, label: 'SMTP Password', category: 'email' },
        { key: 'EMAIL_FROM', value: emailSettings.emailFrom, label: 'From Email Address', category: 'email' },
        { key: 'SITE_NAME', value: generalSettings.siteName, label: 'Site Name', category: 'general' },
        { key: 'SUPPORT_EMAIL', value: generalSettings.supportEmail, label: 'Support Email', category: 'general' },
        { key: 'LOW_STOCK_THRESHOLD', value: generalSettings.lowStockThreshold, label: 'Low Stock Threshold', category: 'general' },
        { key: 'THEME_CONFIG', value: JSON.stringify(themeConfig), label: 'Theme Configuration', type: 'json', category: 'appearance' },
        { key: 'LANDING_PAGE_CONFIG', value: JSON.stringify(landingPageConfig), label: 'Landing Page Configuration', type: 'json', category: 'appearance' },
        { key: 'FOOTER_CONFIG', value: JSON.stringify(footerConfig), label: 'Footer Configuration', type: 'json', category: 'appearance' },
      ];

      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: configUpdates }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      toast.success('Settings saved successfully');
      fetchConfigs();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLoyalty = async () => {
    try {
      setSavingLoyalty(true);

      const response = await fetch('/api/admin/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointsPerRupee: parseFloat(loyaltySettings.pointsPerRupee),
          minRedeemablePoints: parseInt(loyaltySettings.minRedeemablePoints, 10),
          pointValueInRupees: parseFloat(loyaltySettings.pointValueInRupees),
          silverTierThreshold: parseInt(loyaltySettings.silverTierThreshold, 10),
          goldTierThreshold: parseInt(loyaltySettings.goldTierThreshold, 10),
        }),
      });

      if (!response.ok) throw new Error('Failed to save loyalty settings');

      toast.success('Loyalty settings saved successfully');
    } catch (error) {
      console.error('Error saving loyalty settings:', error);
      toast.error('Failed to save loyalty settings');
    } finally {
      setSavingLoyalty(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <AdminNavigation />

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Store Settings</h1>
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="general" className="gap-2"><Settings className="w-4 h-4" /> General</TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2"><Palette className="w-4 h-4" /> Appearance</TabsTrigger>
            <TabsTrigger value="payment" className="gap-2"><CreditCard className="w-4 h-4" /> Payment</TabsTrigger>
            <TabsTrigger value="email" className="gap-2"><Mail className="w-4 h-4" /> Email</TabsTrigger>
            <TabsTrigger value="loyalty" className="gap-2"><Star className="w-4 h-4" /> Loyalty</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Configuration</CardTitle>
                <CardDescription>Basic store details and operational settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Store Name</Label>
                  <Input
                    id="siteName"
                    value={generalSettings.siteName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowStockThreshold">Low Stock Alert Threshold</Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    value={generalSettings.lowStockThreshold}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, lowStockThreshold: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Theme & Branding</CardTitle>
                  <CardDescription>Customize your store's look and feel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          className="w-12 h-10 p-1 cursor-pointer"
                          value={themeConfig.primaryColor}
                          onChange={(e) => setThemeConfig({ ...themeConfig, primaryColor: e.target.value })}
                        />
                        <Input
                          value={themeConfig.primaryColor}
                          onChange={(e) => setThemeConfig({ ...themeConfig, primaryColor: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryColor">Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondaryColor"
                          type="color"
                          className="w-12 h-10 p-1 cursor-pointer"
                          value={themeConfig.secondaryColor}
                          onChange={(e) => setThemeConfig({ ...themeConfig, secondaryColor: e.target.value })}
                        />
                        <Input
                          value={themeConfig.secondaryColor}
                          onChange={(e) => setThemeConfig({ ...themeConfig, secondaryColor: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      placeholder="https://example.com/logo.png"
                      value={themeConfig.logoUrl}
                      onChange={(e) => setThemeConfig({ ...themeConfig, logoUrl: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Landing Page - Hero Section</CardTitle>
                  <CardDescription>Configure the main banner of your home page</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroTitle">Hero Title</Label>
                    <Input
                      id="heroTitle"
                      value={landingPageConfig.hero.title}
                      onChange={(e) => setLandingPageConfig({
                        ...landingPageConfig,
                        hero: { ...landingPageConfig.hero, title: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                    <Textarea
                      id="heroSubtitle"
                      value={landingPageConfig.hero.subtitle}
                      onChange={(e) => setLandingPageConfig({
                        ...landingPageConfig,
                        hero: { ...landingPageConfig.hero, subtitle: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="heroBadge">Badge Text</Label>
                      <Input
                        id="heroBadge"
                        value={landingPageConfig.hero.badgeText}
                        onChange={(e) => setLandingPageConfig({
                          ...landingPageConfig,
                          hero: { ...landingPageConfig.hero, badgeText: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="heroCta">CTA Button Text</Label>
                      <Input
                        id="heroCta"
                        value={landingPageConfig.hero.ctaText}
                        onChange={(e) => setLandingPageConfig({
                          ...landingPageConfig,
                          hero: { ...landingPageConfig.hero, ctaText: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroImage">Hero Image URL</Label>
                    <Input
                      id="heroImage"
                      placeholder="https://example.com/hero-image.jpg"
                      value={landingPageConfig.hero.imageUrl}
                      onChange={(e) => setLandingPageConfig({
                        ...landingPageConfig,
                        hero: { ...landingPageConfig.hero, imageUrl: e.target.value }
                      })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Footer Configuration</CardTitle>
                  <CardDescription>Customize footer content and social links</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="footerDesc">Footer Description</Label>
                    <Textarea
                      id="footerDesc"
                      value={footerConfig.description}
                      onChange={(e) => setFooterConfig({ ...footerConfig, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook URL</Label>
                      <Input
                        id="facebook"
                        placeholder="https://facebook.com/..."
                        value={footerConfig.socialLinks.facebook}
                        onChange={(e) => setFooterConfig({
                          ...footerConfig,
                          socialLinks: { ...footerConfig.socialLinks, facebook: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitter">Twitter URL</Label>
                      <Input
                        id="twitter"
                        placeholder="https://twitter.com/..."
                        value={footerConfig.socialLinks.twitter}
                        onChange={(e) => setFooterConfig({
                          ...footerConfig,
                          socialLinks: { ...footerConfig.socialLinks, twitter: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram URL</Label>
                      <Input
                        id="instagram"
                        placeholder="https://instagram.com/..."
                        value={footerConfig.socialLinks.instagram}
                        onChange={(e) => setFooterConfig({
                          ...footerConfig,
                          socialLinks: { ...footerConfig.socialLinks, instagram: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trust Badges / Features</CardTitle>
                  <CardDescription>Add features to highlight (e.g., Organic, Fast Delivery)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {landingPageConfig.features.map((feature, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2 items-start border-b pb-4 mb-4">
                      <div className="space-y-1">
                        <Label>Title</Label>
                        <Input
                          value={feature.title}
                          onChange={(e) => {
                            const newFeatures = [...landingPageConfig.features];
                            newFeatures[index].title = e.target.value;
                            setLandingPageConfig({ ...landingPageConfig, features: newFeatures });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Description</Label>
                        <Input
                          value={feature.desc}
                          onChange={(e) => {
                            const newFeatures = [...landingPageConfig.features];
                            newFeatures[index].desc = e.target.value;
                            setLandingPageConfig({ ...landingPageConfig, features: newFeatures });
                          }}
                        />
                      </div>
                      <div className="space-y-1 relative">
                        <Label>Icon (Lucide Name)</Label>
                        <div className="flex gap-2">
                          <Input
                            value={feature.icon}
                            onChange={(e) => {
                              const newFeatures = [...landingPageConfig.features];
                              newFeatures[index].icon = e.target.value;
                              setLandingPageConfig({ ...landingPageConfig, features: newFeatures });
                            }}
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              const newFeatures = landingPageConfig.features.filter((_, i) => i !== index);
                              setLandingPageConfig({ ...landingPageConfig, features: newFeatures });
                            }}
                          >
                            X
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setLandingPageConfig({
                      ...landingPageConfig,
                      features: [...landingPageConfig.features, { title: '', desc: '', icon: 'Leaf' }]
                    })}
                  >
                    Add Feature
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Testimonials</CardTitle>
                  <CardDescription>Customer reviews and feedback</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {landingPageConfig.testimonials.map((testimonial, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4 items-start border-b pb-4 mb-4">
                      <div className="space-y-1">
                        <Label>Name</Label>
                        <Input
                          value={testimonial.name}
                          onChange={(e) => {
                            const newTestimonials = [...landingPageConfig.testimonials];
                            newTestimonials[index].name = e.target.value;
                            setLandingPageConfig({ ...landingPageConfig, testimonials: newTestimonials });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Role</Label>
                        <Input
                          value={testimonial.role}
                          onChange={(e) => {
                            const newTestimonials = [...landingPageConfig.testimonials];
                            newTestimonials[index].role = e.target.value;
                            setLandingPageConfig({ ...landingPageConfig, testimonials: newTestimonials });
                          }}
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label>Content</Label>
                        <Textarea
                          value={testimonial.content}
                          onChange={(e) => {
                            const newTestimonials = [...landingPageConfig.testimonials];
                            newTestimonials[index].content = e.target.value;
                            setLandingPageConfig({ ...landingPageConfig, testimonials: newTestimonials });
                          }}
                        />
                      </div>
                      <div className="space-y-1 col-span-2 relative">
                        <div className="flex justify-between items-end">
                          <div className="w-full mr-2">
                            <Label>Avatar URL</Label>
                            <Input
                              value={testimonial.avatar}
                              onChange={(e) => {
                                const newTestimonials = [...landingPageConfig.testimonials];
                                newTestimonials[index].avatar = e.target.value;
                                setLandingPageConfig({ ...landingPageConfig, testimonials: newTestimonials });
                              }}
                            />
                          </div>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              const newTestimonials = landingPageConfig.testimonials.filter((_, i) => i !== index);
                              setLandingPageConfig({ ...landingPageConfig, testimonials: newTestimonials });
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setLandingPageConfig({
                      ...landingPageConfig,
                      testimonials: [...landingPageConfig.testimonials, { id: Date.now(), name: '', role: '', content: '', avatar: '' }]
                    })}
                  >
                    Add Testimonial
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payment Settings */}
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Payment Configuration</CardTitle>
                <CardDescription>Manage payment gateways and options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    id="enableOnlinePayment"
                    type="checkbox"
                    checked={paymentSettings.enableOnlinePayment}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, enableOnlinePayment: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="enableOnlinePayment">Enable Online Payment (Razorpay)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="enableCOD"
                    type="checkbox"
                    checked={paymentSettings.enableCOD}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, enableCOD: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="enableCOD">Enable Cash on Delivery (COD)</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>SMTP settings for transactional emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={emailSettings.smtpHost}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      value={emailSettings.smtpPort}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      value={emailSettings.smtpUser}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      value={emailSettings.smtpPassword}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="emailFrom">From Email Address</Label>
                    <Input
                      id="emailFrom"
                      type="email"
                      value={emailSettings.emailFrom}
                      onChange={(e) => setEmailSettings({ ...emailSettings, emailFrom: e.target.value })}
                      placeholder="noreply@fruitland.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loyalty Settings */}
          <TabsContent value="loyalty">
            <Card>
              <CardHeader>
                <CardTitle>Loyalty Program</CardTitle>
                <CardDescription>Configure points earning and redemption rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pointsPerRupee">Points Per Rupee</Label>
                    <Input
                      id="pointsPerRupee"
                      type="number"
                      step="0.001"
                      min="0"
                      value={loyaltySettings.pointsPerRupee}
                      onChange={(e) => setLoyaltySettings({ ...loyaltySettings, pointsPerRupee: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pointValueInRupees">Point Value (₹)</Label>
                    <Input
                      id="pointValueInRupees"
                      type="number"
                      step="0.1"
                      min="0"
                      value={loyaltySettings.pointValueInRupees}
                      onChange={(e) => setLoyaltySettings({ ...loyaltySettings, pointValueInRupees: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minRedeemablePoints">Minimum Redeemable Points</Label>
                    <Input
                      id="minRedeemablePoints"
                      type="number"
                      min="1"
                      value={loyaltySettings.minRedeemablePoints}
                      onChange={(e) => setLoyaltySettings({ ...loyaltySettings, minRedeemablePoints: e.target.value })}
                    />
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Tier Thresholds</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="silverTierThreshold">Silver Tier (points)</Label>
                      <Input
                        id="silverTierThreshold"
                        type="number"
                        min="0"
                        value={loyaltySettings.silverTierThreshold}
                        onChange={(e) => setLoyaltySettings({ ...loyaltySettings, silverTierThreshold: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goldTierThreshold">Gold Tier (points)</Label>
                      <Input
                        id="goldTierThreshold"
                        type="number"
                        min="0"
                        value={loyaltySettings.goldTierThreshold}
                        onChange={(e) => setLoyaltySettings({ ...loyaltySettings, goldTierThreshold: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveLoyalty} disabled={savingLoyalty} variant="outline">
                    {savingLoyalty ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Loyalty Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
