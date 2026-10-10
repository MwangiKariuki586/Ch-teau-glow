"use client"

import { useState } from "react"
import { Mail, Edit, Plus, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useEmailTemplates } from "../hooks/use-email-templates"
import { EMAIL_TEMPLATE_TYPES } from "../lib/config"
import { EmailTemplatePreview } from "./email-template-preview"
import type { EmailTemplate } from "../types"

export function EmailTemplatesSection() {
  const { templates, loading, updateTemplate, createTemplate } = useEmailTemplates()
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate({ ...template })
    setIsCreating(false)
  }

  const handleCreateNew = () => {
    const newTemplate: EmailTemplate = {
      id: '',
      name: '',
      subject: '',
      content: '',
      type: 'booking_confirmation',
      is_active: true,
      created_at: '',
      updated_at: ''
    }
    setEditingTemplate(newTemplate)
    setIsCreating(true)
  }

  const handleSave = async () => {
    if (!editingTemplate) return
    
    try {
      if (isCreating) {
        await createTemplate(editingTemplate)
      } else {
        await updateTemplate(editingTemplate.id, editingTemplate)
      }
      setEditingTemplate(null)
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to save template:', error)
    }
  }

  const handleCancel = () => {
    setEditingTemplate(null)
    setIsCreating(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading templates...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#6B4423]" />
            Email Templates
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage email templates for customer communications
          </p>
        </div>
        <Button 
          onClick={handleCreateNew}
          className="bg-[#6B4423] hover:bg-[#5A3A1D]"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {editingTemplate && (
        <Card className="border-[#6B4423]/20">
          <CardHeader>
            <CardTitle className="text-lg">
              {isCreating ? 'Create New Template' : 'Edit Template'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-type">Template Type</Label>
                <Select 
                  value={editingTemplate.type} 
                  onValueChange={(value) => setEditingTemplate(prev => prev ? { ...prev, type: value as any } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TEMPLATE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template-subject">Subject Line</Label>
              <Input
                id="template-subject"
                value={editingTemplate.subject}
                onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, subject: e.target.value } : null)}
                placeholder="Use {{variables}} for dynamic content"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template-content">Email Content</Label>
              <Textarea
                id="template-content"
                rows={8}
                value={editingTemplate.content}
                onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, content: e.target.value } : null)}
                placeholder="Use {{variables}} for dynamic content like {{customer_name}}, {{booking_date}}, etc."
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="template-active"
                  checked={editingTemplate.is_active}
                  onCheckedChange={(checked) => setEditingTemplate(prev => prev ? { ...prev, is_active: checked } : null)}
                />
                <Label htmlFor="template-active">Active</Label>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-[#6B4423] hover:bg-[#5A3A1D]">
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {templates.map((template, index) => (
          <Card key={template.id || `template-${index}`} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{template.name}</h4>
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{template.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    Type: {EMAIL_TEMPLATE_TYPES.find(t => t.value === template.type)?.label}
                  </p>
                </div>
                <div className="flex gap-2">
                  <EmailTemplatePreview template={template} />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}