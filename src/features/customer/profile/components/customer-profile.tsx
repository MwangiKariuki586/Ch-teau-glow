"use client"

import { useState, useEffect, useRef } from "react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function CustomerProfile() {
    const [isLoading, setIsLoading] = useState(false)
    const [isAddressLoading, setIsAddressLoading] = useState(false)
    const [isImageUploading, setIsImageUploading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [addressError, setAddressError] = useState("")
    const [addressSuccess, setAddressSuccess] = useState("")
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [dateOfBirth, setDateOfBirth] = useState("")
    const [gender, setGender] = useState("")
    const [avatarUrl, setAvatarUrl] = useState("")
    
    const [address, setAddress] = useState("")
    const [city, setCity] = useState("")
    const [state, setState] = useState("")
    const [zipCode, setZipCode] = useState("")
    const [country, setCountry] = useState("")
    
    const supabase = createClient()

    useEffect(() => {
        const loadUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)
                
                // Fetch profile from user_profiles table
                const { data: profileData } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .single()
                
                if (profileData) {
                    setProfile(profileData)
                    setEmail(profileData.email || "")
                    setFirstName(profileData.first_name || "")
                    setLastName(profileData.last_name || "")
                    setPhone(profileData.phone || "")
                    setDateOfBirth(profileData.date_of_birth || "")
                    setGender(profileData.gender || "")
                    setAvatarUrl(profileData.avatar_url || "")
                    setAddress(profileData.address || "")
                    setCity(profileData.city || "")
                    setState(profileData.state || "")
                    setZipCode(profileData.zip_code || "")
                    setCountry(profileData.country || "")
                }
            }
        }
        loadUserData()
    }, [supabase])

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user) return

        setIsImageUploading(true)
        setError("")

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ avatar_url: publicUrl })
                .eq('user_id', user.id)

            if (updateError) throw updateError

            setAvatarUrl(publicUrl)
            setSuccess("Profile picture updated successfully")
            setTimeout(() => setSuccess(""), 3000)
        } catch (err: any) {
            setError(err.message || "Failed to upload image")
        } finally {
            setIsImageUploading(false)
        }
    }

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess("")
        setIsLoading(true)

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    first_name: firstName,
                    last_name: lastName,
                    phone,
                    date_of_birth: dateOfBirth || null,
                    gender,
                })
                .eq('user_id', user.id)

            if (error) throw error

            setSuccess("Profile updated successfully")
            setTimeout(() => setSuccess(""), 3000)
        } catch (err: any) {
            setError(err.message || "Failed to update profile")
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddressUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setAddressError("")
        setAddressSuccess("")
        setIsAddressLoading(true)

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    address,
                    city,
                    state,
                    zip_code: zipCode,
                    country,
                })
                .eq('user_id', user.id)

            if (error) throw error

            setAddressSuccess("Address updated successfully")
            setTimeout(() => setAddressSuccess(""), 3000)
        } catch (err: any) {
            setAddressError(err.message || "Failed to update address")
        } finally {
            setIsAddressLoading(false)
        }
    }
    return (
        <div className="flex flex-col gap-6 pb-8">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">My Profile</h1>
                <p className="text-muted-foreground mt-1">Manage your personal information</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="shadow-sm border-border/50">
                    <CardHeader>
                        <CardTitle>Profile Picture</CardTitle>
                        <CardDescription>Update your profile photo</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                        <div className="relative">
                            <Avatar className="h-32 w-32">
                                <AvatarImage src={avatarUrl} alt="Profile" />
                                <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                                    {firstName?.[0]}{lastName?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <Button 
                                size="icon" 
                                className="absolute bottom-0 right-0 rounded-full h-10 w-10"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isImageUploading}
                            >
                                {isImageUploading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Camera className="h-5 w-5" />
                                )}
                            </Button>
                        </div>
                        <div className="text-center">
                            <p className="font-semibold">{firstName} {lastName}</p>
                            <p className="text-sm text-muted-foreground">{email}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-border/50 md:col-span-2">
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Update your personal details</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
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
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input 
                                        id="firstName" 
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input 
                                        id="lastName" 
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    value={email}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input 
                                    id="phone" 
                                    type="tel" 
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                                <Input 
                                    id="dateOfBirth" 
                                    type="date" 
                                    value={dateOfBirth}
                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gender">Gender</Label>
                                <Input 
                                    id="gender" 
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm border-border/50">
                <CardHeader>
                    <CardTitle>Address Information</CardTitle>
                    <CardDescription>Manage your address details</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddressUpdate} className="space-y-4">
                        {addressError && (
                            <div className="rounded-lg bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive">
                                {addressError}
                            </div>
                        )}
                        {addressSuccess && (
                            <div className="rounded-lg bg-green-500/10 border border-green-500/50 p-3 text-sm text-green-600">
                                {addressSuccess}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="address">Street Address</Label>
                            <Input 
                                id="address" 
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input 
                                    id="city" 
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State/Emirate</Label>
                                <Input 
                                    id="state" 
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="zipCode">Zip Code</Label>
                                <Input 
                                    id="zipCode" 
                                    value={zipCode}
                                    onChange={(e) => setZipCode(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Input 
                                id="country" 
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isAddressLoading}>
                            {isAddressLoading ? "Updating..." : "Update Address"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
