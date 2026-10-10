"use client"

import { useState, useEffect } from "react"
import { CreditCard, Save, RefreshCw, Eye, EyeOff, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { usePaymentSettings } from "../hooks/use-payment-settings"

interface Currency {
  value: string
  label: string
  symbol: string
}

interface PaymentMethod {
  value: string
  label: string
}

export function PaymentSettingsSection() {
  const { settings, loading, updateSettings } = usePaymentSettings()
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [localSettings, setLocalSettings] = useState(settings)
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

  // Load dynamic configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/admin/settings/config')
        if (response.ok) {
          const data = await response.json()
          setCurrencies(data.currencies)
          setPaymentMethods(data.paymentMethods)
        }
      } catch (error) {
        console.error('Failed to load configuration:', error)
      }
    }
    loadConfig()
  }, [])

  if (loading || !settings) {
    return <div className="flex items-center justify-center p-8">Loading payment settings...</div>
  }

  if (!localSettings) {
    setLocalSettings(settings)
    return null
  }

  const handleChange = (key: keyof typeof settings, value: any) => {
    setLocalSettings(prev => prev ? { ...prev, [key]: value } : null)
    setHasChanges(true)
  }

  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    if (!localSettings) return
    
    const updatedMethods = checked
      ? [...localSettings.payment_methods, method as any]
      : localSettings.payment_methods.filter(m => m !== method)
    
    handleChange('payment_methods', updatedMethods)
  }

  const handleSave = async () => {
    if (!localSettings) return
    
    setIsSaving(true)
    try {
      await updateSettings(localSettings)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setLocalSettings(settings)
    setHasChanges(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#6B4423]" />
            Payment Settings
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure payment processing and policies
          </p>
        </div>
        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#6B4423] hover:bg-[#5A3A1D]"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Payment settings are sensitive. Changes will affect all future transactions. Test thoroughly before going live.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Stripe Configuration</CardTitle>
          <CardDescription>Configure your Stripe payment processor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stripe-public-key">Stripe Publishable Key</Label>
            <Input
              id="stripe-public-key"
              value={localSettings.stripe_public_key}
              onChange={(e) => handleChange('stripe_public_key', e.target.value)}
              placeholder="pk_test_..."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="stripe-secret-key">Stripe Secret Key</Label>
            <div className="relative">
              <Input
                id="stripe-secret-key"
                type={showSecretKey ? "text" : "password"}
                value={localSettings.stripe_secret_key}
                onChange={(e) => handleChange('stripe_secret_key', e.target.value)}
                placeholder="sk_test_..."
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowSecretKey(!showSecretKey)}
              >
                {showSecretKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Select which payment methods to accept</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.map((method) => (
            <div key={method.value} className="flex items-center space-x-2">
              <Checkbox
                id={method.value}
                checked={localSettings.payment_methods.includes(method.value as any)}
                onCheckedChange={(checked) => handlePaymentMethodChange(method.value, checked as boolean)}
              />
              <Label htmlFor={method.value}>{method.label}</Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currency & Pricing</CardTitle>
          <CardDescription>Configure currency and pricing settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Default Currency</Label>
            <Select 
              value={localSettings.currency} 
              onValueChange={(value) => handleChange('currency', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map(currency => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deposit & Refund Policies</CardTitle>
          <CardDescription>Configure deposit requirements and refund policies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Require Deposit</Label>
              <p className="text-sm text-muted-foreground">
                Require customers to pay a deposit when booking
              </p>
            </div>
            <Switch
              checked={localSettings.require_deposit}
              onCheckedChange={(checked) => handleChange('require_deposit', checked)}
            />
          </div>
          
          {localSettings.require_deposit && (
            <div className="space-y-2">
              <Label htmlFor="deposit-percentage">Deposit Percentage</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="deposit-percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={localSettings.deposit_percentage}
                  onChange={(e) => handleChange('deposit_percentage', parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="refund-policy-days">Refund Policy (Days)</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="refund-policy-days"
                type="number"
                min="0"
                value={localSettings.refund_policy_days}
                onChange={(e) => handleChange('refund_policy_days', parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">days for full refund</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Auto-Capture Payments</Label>
              <p className="text-sm text-muted-foreground">
                Automatically capture payments when bookings are confirmed
              </p>
            </div>
            <Switch
              checked={localSettings.auto_capture}
              onCheckedChange={(checked) => handleChange('auto_capture', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}