import { Badge } from "@/components/ui/badge"

interface RoleBadgeProps {
  role: 'admin' | 'customer'
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const roleDisplay = role === 'admin' ? 'Administrator' : 'Customer'
  
  return (
    <Badge 
      className={`bg-primary/10 text-primary border-primary/20 font-medium shadow-sm ${className || ''}`}
    >
      {roleDisplay}
    </Badge>
  )
}