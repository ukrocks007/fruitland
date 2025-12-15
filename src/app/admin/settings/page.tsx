'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/navbar';
import { AdminNavigation } from '@/components/admin-navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Save, Star } from 'lucide-react';

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
    showStockOnProductPages: true,
  });

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
        showStockOnProductPages: configMap['SHOW_STOCK_ON_PRODUCT_PAGES'] !== 'false',
      });

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
        { key: 'ENABLE_ONLINE_PAYMENT', value: paymentSettings.enableOnlinePayment.toString(), label: 'Enable Online Payment' },
        { key: 'ENABLE_COD', value: paymentSettings.enableCOD.toString(), label: 'Enable Cash on Delivery' },
        { key: 'SMTP_HOST', value: emailSettings.smtpHost, label: 'SMTP Host' },
        { key: 'SMTP_PORT', value: emailSettings.smtpPort, label: 'SMTP Port' },
        { key: 'SMTP_USER', value: emailSettings.smtpUser, label: 'SMTP Username' },
        { key: 'SMTP_PASSWORD', value: emailSettings.smtpPassword, label: 'SMTP Password' },
        { key: 'EMAIL_FROM', value: emailSettings.emailFrom, label: 'From Email Address' },
        { key: 'SITE_NAME', value: generalSettings.siteName, label: 'Site Name' },
        { key: 'SUPPORT_EMAIL', value: generalSettings.supportEmail, label: 'Support Email' },
        { key: 'LOW_STOCK_THRESHOLD', value: generalSettings.lowStockThreshold, label: 'Low Stock Threshold' },
        { key: 'SHOW_STOCK_ON_PRODUCT_PAGES', value: generalSettings.showStockOnProductPages.toString(), label: 'Show Stock on Product Pages' },
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

        <div className="max-w-4xl space-y-6">
          {/* Payment Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>
                Configure payment methods available to customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="enableOnlinePayment"
                  type="checkbox"
                  checked={paymentSettings.enableOnlinePayment}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      enableOnlinePayment: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="enableOnlinePayment">Enable Online Payment (Razorpay)</Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="enableCOD"
                  type="checkbox"
                  checked={paymentSettings.enableCOD}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      enableCOD: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="enableCOD">Enable Cash on Delivery (COD)</Label>
              </div>
            </CardContent>
          </Card>

          {/* Loyalty Program Settings */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-green-600" />
                Loyalty Program Settings
              </CardTitle>
              <CardDescription>
                Configure loyalty points earning and redemption rules
              </CardDescription>
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
                    onChange={(e) =>
                      setLoyaltySettings({ ...loyaltySettings, pointsPerRupee: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-500">
                    E.g., 0.01 = 1 point per ₹100 spent
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pointValueInRupees">Point Value (₹)</Label>
                  <Input
                    id="pointValueInRupees"
                    type="number"
                    step="0.1"
                    min="0"
                    value={loyaltySettings.pointValueInRupees}
                    onChange={(e) =>
                      setLoyaltySettings({ ...loyaltySettings, pointValueInRupees: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Rupee value per point when redeeming
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minRedeemablePoints">Minimum Redeemable Points</Label>
                  <Input
                    id="minRedeemablePoints"
                    type="number"
                    min="1"
                    value={loyaltySettings.minRedeemablePoints}
                    onChange={(e) =>
                      setLoyaltySettings({ ...loyaltySettings, minRedeemablePoints: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Minimum points required to redeem
                  </p>
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
                      onChange={(e) =>
                        setLoyaltySettings({ ...loyaltySettings, silverTierThreshold: e.target.value })
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Points needed for Silver tier
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goldTierThreshold">Gold Tier (points)</Label>
                    <Input
                      id="goldTierThreshold"
                      type="number"
                      min="0"
                      value={loyaltySettings.goldTierThreshold}
                      onChange={(e) =>
                        setLoyaltySettings({ ...loyaltySettings, goldTierThreshold: e.target.value })
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Points needed for Gold tier
                    </p>
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

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>
                SMTP settings for sending transactional emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={emailSettings.smtpHost}
                    onChange={(e) =>
                      setEmailSettings({ ...emailSettings, smtpHost: e.target.value })
                    }
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    value={emailSettings.smtpPort}
                    onChange={(e) =>
                      setEmailSettings({ ...emailSettings, smtpPort: e.target.value })
                    }
                    placeholder="587"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpUser">SMTP Username</Label>
                  <Input
                    id="smtpUser"
                    value={emailSettings.smtpUser}
                    onChange={(e) =>
                      setEmailSettings({ ...emailSettings, smtpUser: e.target.value })
                    }
                    placeholder="your-email@gmail.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={emailSettings.smtpPassword}
                    onChange={(e) =>
                      setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })
                    }
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="emailFrom">From Email Address</Label>
                  <Input
                    id="emailFrom"
                    type="email"
                    value={emailSettings.emailFrom}
                    onChange={(e) =>
                      setEmailSettings({ ...emailSettings, emailFrom: e.target.value })
                    }
                    placeholder="noreply@fruitland.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic configuration for your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={generalSettings.siteName}
                  onChange={(e) =>
                    setGeneralSettings({ ...generalSettings, siteName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={generalSettings.supportEmail}
                  onChange={(e) =>
                    setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })
                  }
                  placeholder="support@fruitland.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Alert Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  value={generalSettings.lowStockThreshold}
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      lowStockThreshold: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-gray-500">
                  Products with stock below this value will be flagged in the dashboard
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  id="showStockOnProductPages"
                  type="checkbox"
                  checked={generalSettings.showStockOnProductPages}
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      showStockOnProductPages: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="showStockOnProductPages">
                  Show stock count on product pages
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save All Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
