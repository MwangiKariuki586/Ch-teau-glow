"use client"

import { useState } from "react"
import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { EmailTemplate } from "../types"

interface EmailTemplatePreviewProps {
  template: EmailTemplate
}

export function EmailTemplatePreview({ template }: EmailTemplatePreviewProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Sample data for preview
  const sampleData = {
    customer_name: "John Doe",
    booking_number: "BRZ-2024-001",
    service_name: "Eyebrow Threading",
    booking_date: "March 25, 2026",
    booking_time: "2:00 PM",
    branch_name: "Château Glow Dubai Mall",
    specialist_name: "Sarah Ahmed",
    customer_message: "I would like to know about your eyebrow services and pricing."
  }

  // Replace template variables with sample data
  const previewSubject = template.subject.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return sampleData[key as keyof typeof sampleData] || match
  })

  const previewContent = template.content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return sampleData[key as keyof typeof sampleData] || match
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Email Preview: {template.name}</span>
            <Badge variant={template.is_active ? "default" : "secondary"}>
              {template.is_active ? "Active" : "Inactive"}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Subject Line:</p>
            <p className="font-medium">{previewSubject}</p>
          </div>
          
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {previewContent}
              </div>
            </div>
          </div>
          
          <div className="bg-muted/30 p-3 rounded text-xs text-muted-foreground">
            <p className="font-medium mb-1">Available Variables:</p>
            <div className="grid grid-cols-2 gap-1">
              <span>• {`{{customer_name}}`}</span>
              <span>• {`{{booking_number}}`}</span>
              <span>• {`{{service_name}}`}</span>
              <span>• {`{{booking_date}}`}</span>
              <span>• {`{{booking_time}}`}</span>
              <span>• {`{{branch_name}}`}</span>
              <span>• {`{{specialist_name}}`}</span>
              <span>• {`{{customer_message}}`}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}