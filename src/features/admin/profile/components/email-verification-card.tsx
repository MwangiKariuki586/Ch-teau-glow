"use client"

import * as React from "react"
import { Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from '@/lib/supabase/client'
import type { AdminProfile } from "../types"

interface EmailVerificationCardProps {
  profile: AdminProfile
}

export function EmailVerificationCard({ profile }: EmailVerificationCardProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const [emailConfirmed, setEmailConfirmed] = React.useState(false)

  React.useEffect(() => {
    // Check email confirmation status
    const checkEmailStatus = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setEmailConfirmed(user?.email_confirmed_at !== null)
      } catch (err) {
        console.error('Error checking email status:', err)
      }
    }

    checkEmailStatus()
  }, [])

  const handleResendVerification = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: profile.email
      })

      if (resendError) {
        setError(resendError.message)
        return
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Verification
        </CardTitle>
        <CardDescription>
          Manage your email verification status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Email Address</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {emailConfirmed ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Verified
                </Badge>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  Unverified
                </Badge>
              </>
            )}
          </div>
        </div>

        {!emailConfirmed && (
          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Your email address is not verified. Please check your inbox for a verification email.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  Verification email sent! Please check your inbox.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleResendVerification}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>
          </div>
        )}

        {emailConfirmed && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your email address has been verified and is secure.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}