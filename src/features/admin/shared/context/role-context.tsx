"use client"

import { createContext, useContext, useState } from "react"

export type StaffRole = "Admin" | "Branch Manager" | "Practitioner" | "Concierge"

const roleNavTitles: Record<StaffRole, string[]> = {
    "Admin":          [],
    "Concierge":      ["Dashboard", "Notifications", "Settings", "Support"],
    "Practitioner":   ["Dashboard", "Appointments", "Notifications", "Settings"],
    "Branch Manager": ["Dashboard", "Branch Cockpit", "Notifications", "Settings"],
}

interface RoleContextValue {
    role: StaffRole
    setRole: (r: StaffRole) => void
    allowedTitles: string[] // empty = all allowed
}

const RoleContext = createContext<RoleContextValue>({
    role: "Admin",
    setRole: () => {},
    allowedTitles: [],
})

export function RoleProvider({ children }: { children: React.ReactNode }) {
    const [role, setRole] = useState<StaffRole>("Admin")
    const allowedTitles = roleNavTitles[role] ?? []
    return (
        <RoleContext.Provider value={{ role, setRole, allowedTitles }}>
            {children}
        </RoleContext.Provider>
    )
}

export function useRole() {
    return useContext(RoleContext)
}
