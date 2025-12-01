'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/navbar';
import { AdminNavigation } from '@/components/admin-navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

interface ConfigItem {
  key: string;
  value: string;
}

export default function AdminSettingsPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/config');
      if (!response.ok) throw new Error('Failed to fetch config');
      const data = await response.json();
      
      const configMap: Record<string, string> = {};
      data.configs.forEach((config: ConfigItem) => {
        configMap[config.key] = config.value;
      });
      setConfigs(configMap);

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
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

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
