import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { AdminProfile } from "../types"

interface AccountMetadataProps {
  profile: AdminProfile
}

export function AccountMetadata({ profile }: AccountMetadataProps) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
        <CardTitle className="text-lg font-semibold text-slate-900">Role & Access</CardTitle>
        <CardDescription className="text-slate-600">
          Your current system role and permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium shadow-sm">
            {profile.role === 'admin' ? 'System Administrator' : 'Customer'}
          </Badge>
          {profile.role === 'admin' && (
            <>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 font-medium shadow-sm">
                Full Access
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 font-medium shadow-sm">
                User Management
              </Badge>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 font-medium shadow-sm">
                System Settings
              </Badge>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 font-medium shadow-sm">
                Analytics
              </Badge>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}