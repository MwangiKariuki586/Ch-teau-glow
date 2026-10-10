// Comprehensive testing utilities for admin settings
// This file provides testing functions to verify all settings functionality

export class SettingsTestSuite {
  
  // Test notification settings persistence
  static async testNotificationPersistence() {
    console.log('🧪 Testing Notification Settings Persistence...')
    
    try {
      // Get current settings
      const response1 = await fetch('/api/admin/settings/notifications')
      const originalSettings = await response1.json()
      console.log('✅ Original settings loaded:', originalSettings)
      
      // Update settings
      const testUpdate = {
        booking_notifications: !originalSettings.booking_notifications,
        contact_enquiry_alerts: !originalSettings.contact_enquiry_alerts
      }
      
      const response2 = await fetch('/api/admin/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUpdate)
      })
      
      if (response2.ok) {
        console.log('✅ Settings updated successfully')
        
        // Verify persistence by fetching again
        const response3 = await fetch('/api/admin/settings/notifications')
        const updatedSettings = await response3.json()
        
        const isPersisted = 
          updatedSettings.booking_notifications === testUpdate.booking_notifications &&
          updatedSettings.contact_enquiry_alerts === testUpdate.contact_enquiry_alerts
        
        if (isPersisted) {
          console.log('✅ Settings persistence verified')
          
          // Restore original settings
          await fetch('/api/admin/settings/notifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(originalSettings)
          })
          console.log('✅ Original settings restored')
          
          return true
        } else {
          console.error('❌ Settings not persisted correctly')
          return false
        }
      } else {
        console.error('❌ Failed to update settings')
        return false
      }
    } catch (error) {
      console.error('❌ Test failed:', error)
      return false
    }
  }
  
  // Test email template CRUD operations
  static async testEmailTemplateCRUD() {
    console.log('🧪 Testing Email Template CRUD Operations...')
    
    try {
      // Get templates
      const response1 = await fetch('/api/admin/settings/email-templates')
      const originalTemplates = await response1.json()
      console.log('✅ Templates loaded:', originalTemplates.length, 'templates')
      
      // Create new template
      const newTemplate = {
        name: 'Test Template',
        subject: 'Test Subject - {{customer_name}}',
        content: 'Hello {{customer_name}}, this is a test template.',
        type: 'welcome',
        is_active: true
      }
      
      const response2 = await fetch('/api/admin/settings/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      })
      
      if (response2.ok) {
        const createdTemplate = await response2.json()
        console.log('✅ Template created:', createdTemplate.id)
        
        // Update template
        const updatedTemplate = {
          ...createdTemplate,
          name: 'Updated Test Template',
          subject: 'Updated Subject - {{customer_name}}'
        }
        
        const response3 = await fetch('/api/admin/settings/email-templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTemplate)
        })
        
        if (response3.ok) {
          console.log('✅ Template updated successfully')
          
          // Verify the update
          const response4 = await fetch('/api/admin/settings/email-templates')
          const updatedTemplates = await response4.json()
          const foundTemplate = updatedTemplates.find((t: any) => t.id === createdTemplate.id)
          
          if (foundTemplate && foundTemplate.name === 'Updated Test Template') {
            console.log('✅ Template update verified')
            return true
          } else {
            console.error('❌ Template update not verified')
            return false
          }
        } else {
          console.error('❌ Failed to update template')
          return false
        }
      } else {
        console.error('❌ Failed to create template')
        return false
      }
    } catch (error) {
      console.error('❌ Test failed:', error)
      return false
    }
  }
  
  // Test payment settings
  static async testPaymentSettings() {
    console.log('🧪 Testing Payment Settings...')
    
    try {
      // Get current settings
      const response1 = await fetch('/api/admin/settings/payments')
      const originalSettings = await response1.json()
      console.log('✅ Payment settings loaded')
      
      // Test currency and payment methods
      const testUpdate = {
        ...originalSettings,
        currency: 'EUR',
        payment_methods: ['card', 'apple_pay'],
        require_deposit: true,
        deposit_percentage: 25
      }
      
      const response2 = await fetch('/api/admin/settings/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUpdate)
      })
      
      if (response2.ok) {
        console.log('✅ Payment settings updated')
        
        // Verify persistence
        const response3 = await fetch('/api/admin/settings/payments')
        const updatedSettings = await response3.json()
        
        const isCorrect = 
          updatedSettings.currency === 'EUR' &&
          updatedSettings.require_deposit === true &&
          updatedSettings.deposit_percentage === 25
        
        if (isCorrect) {
          console.log('✅ Payment settings persistence verified')
          
          // Restore original
          await fetch('/api/admin/settings/payments', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(originalSettings)
          })
          console.log('✅ Original payment settings restored')
          
          return true
        } else {
          console.error('❌ Payment settings not persisted correctly')
          return false
        }
      } else {
        console.error('❌ Failed to update payment settings')
        return false
      }
    } catch (error) {
      console.error('❌ Test failed:', error)
      return false
    }
  }
  
  // Test dynamic configuration loading
  static async testDynamicConfiguration() {
    console.log('🧪 Testing Dynamic Configuration...')
    
    try {
      const response = await fetch('/api/admin/settings/config')
      const config = await response.json()
      
      if (config.currencies && config.paymentMethods) {
        console.log('✅ Dynamic configuration loaded')
        console.log('  - Currencies:', config.currencies.length)
        console.log('  - Payment Methods:', config.paymentMethods.length)
        
        // Verify AED is included (from environment variable)
        const hasAED = config.currencies.some((c: any) => c.value === 'AED')
        if (hasAED) {
          console.log('✅ Environment-based currency (AED) found')
          return true
        } else {
          console.error('❌ Environment-based currency not found')
          return false
        }
      } else {
        console.error('❌ Configuration incomplete')
        return false
      }
    } catch (error) {
      console.error('❌ Test failed:', error)
      return false
    }
  }
  
  // Run all tests
  static async runAllTests() {
    console.log('🚀 Starting Admin Settings Test Suite...')
    
    const results = {
      notificationPersistence: await this.testNotificationPersistence(),
      emailTemplateCRUD: await this.testEmailTemplateCRUD(),
      paymentSettings: await this.testPaymentSettings(),
      dynamicConfiguration: await this.testDynamicConfiguration()
    }
    
    const passedTests = Object.values(results).filter(Boolean).length
    const totalTests = Object.keys(results).length
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`)
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Admin Settings are working correctly.')
    } else {
      console.log('⚠️  Some tests failed. Please check the implementation.')
    }
    
    return results
  }
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).SettingsTestSuite = SettingsTestSuite
}