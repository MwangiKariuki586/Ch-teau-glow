"use client"

import { useState } from "react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Bell, Lock, Mail, Shield, Trash2, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function CustomerSettings() {
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const supabase = createClient()
    const router = useRouter()

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess("")

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match")
            return
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters long")
            return
        }

        setIsLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (error) throw error

            setSuccess("Password updated successfully")
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
        } catch (err: any) {
            setError(err.message || "Failed to update password")
        } finally {
            setIsLoading(false)
        }
    }
    return (
        <div className="flex flex-col gap-6 pb-8">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your account preferences and security</p>
            </div>

            <Card className="shadow-sm border-border/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Notifications</CardTitle>
                    </div>
                    <CardDescription>Manage how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="email-notifications">Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">Receive booking confirmations and updates via email</p>
                        </div>
                        <Switch id="email-notifications" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="sms-notifications">SMS Notifications</Label>
                            <p className="text-sm text-muted-foreground">Get text messages for appointment reminders</p>
                        </div>
                        <Switch id="sms-notifications" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="marketing-emails">Marketing Emails</Label>
                            <p className="text-sm text-muted-foreground">Receive promotional offers and newsletters</p>
                        </div>
                        <Switch id="marketing-emails" />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="booking-reminders">Booking Reminders</Label>
                            <p className="text-sm text-muted-foreground">Get reminders 24 hours before appointments</p>
                        </div>
                        <Switch id="booking-reminders" defaultChecked />
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Security</CardTitle>
                    </div>
                    <CardDescription>Manage your password and security settings</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        {error && (
                            <div className="rounded-lg bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="rounded-lg bg-green-500/10 border border-green-500/50 p-3 text-sm text-green-600">
                                {success}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password</Label>
                            <div className="relative">
                                <Input 
                                    id="current-password" 
                                    type={showCurrentPassword ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                >
                                    {showCurrentPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <div className="relative">
                                <Input 
                                    id="new-password" 
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    {showNewPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <div className="relative">
                                <Input 
                                    id="confirm-password" 
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Updating..." : "Update Password"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Privacy</CardTitle>
                    </div>
                    <CardDescription>Control your privacy preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="profile-visibility">Profile Visibility</Label>
                            <p className="text-sm text-muted-foreground">Allow venues to see your booking history</p>
                        </div>
                        <Switch id="profile-visibility" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="data-sharing">Data Sharing</Label>
                            <p className="text-sm text-muted-foreground">Share anonymized data to improve services</p>
                        </div>
                        <Switch id="data-sharing" />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="review-visibility">Review Visibility</Label>
                            <p className="text-sm text-muted-foreground">Show your name on public reviews</p>
                        </div>
                        <Switch id="review-visibility" defaultChecked />
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Communication Preferences</CardTitle>
                    </div>
                    <CardDescription>Choose your preferred contact method</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="email-preferred">Email</Label>
                            <p className="text-sm text-muted-foreground">Prefer email for all communications</p>
                        </div>
                        <Switch id="email-preferred" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="sms-preferred">SMS</Label>
                            <p className="text-sm text-muted-foreground">Prefer text messages for quick updates</p>
                        </div>
                        <Switch id="sms-preferred" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="phone-preferred">Phone</Label>
                            <p className="text-sm text-muted-foreground">Allow phone calls for important matters</p>
                        </div>
                        <Switch id="phone-preferred" />
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50 border-destructive/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-destructive" />
                        <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    </div>
                    <CardDescription>Irreversible actions for your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                        <h4 className="font-semibold mb-2">Delete Account</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                            Once you delete your account, there is no going back. This will permanently delete your profile, 
                            booking history, and all associated data.
                        </p>
                        <Button variant="destructive">Delete My Account</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
