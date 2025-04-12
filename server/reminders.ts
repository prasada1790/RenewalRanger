import cron from 'node-cron';
import { storage } from './storage';
import { sendEmail, generateRenewalReminderHtml } from './mailer';
import { db } from './db';

export function setupReminderCron() {
  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[Reminders] Running daily reminder check...');
    await processRenewableReminders();
  });
  
  console.log('[Reminders] Reminder cron job scheduled.');
}

async function processRenewableReminders() {
  try {
    // Get all active renewables
    const renewables = await storage.getAllRenewables();
    const now = new Date();
    
    for (const renewable of renewables) {
      // Skip if not active
      if (renewable.status !== 'active') continue;
      
      // Skip if there's no assignee
      if (!renewable.assignedToId) continue;
      
      // Calculate days until expiry
      const endDate = new Date(renewable.endDate);
      const daysUntilExpiry = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Get reminder intervals for this renewable
      // If custom intervals are set, use those, otherwise get default intervals from the item type
      let reminderIntervals: number[] = [];
      
      if (renewable.reminderIntervals && Array.isArray(renewable.reminderIntervals)) {
        reminderIntervals = renewable.reminderIntervals;
      } else {
        const itemType = await storage.getItemType(renewable.typeId);
        if (itemType && itemType.defaultReminderIntervals) {
          reminderIntervals = itemType.defaultReminderIntervals as number[];
        }
      }
      
      // Check if we should send a reminder for this interval
      if (reminderIntervals.includes(daysUntilExpiry)) {
        await sendReminderForRenewable(renewable.id, daysUntilExpiry);
      }
    }
    
    console.log('[Reminders] Reminder check completed.');
  } catch (error) {
    console.error('[Reminders] Error processing reminders:', error);
  }
}

async function sendReminderForRenewable(renewableId: number, daysBeforeExpiry: number) {
  try {
    // Get full renewable data with related info
    const renewable = await storage.getRenewable(renewableId);
    if (!renewable || !renewable.assignedToId) return;
    
    // Get related data
    const [client, itemType, assignedUser] = await Promise.all([
      storage.getClient(renewable.clientId),
      storage.getItemType(renewable.typeId),
      storage.getUser(renewable.assignedToId)
    ]);
    
    if (!client || !itemType || !assignedUser) {
      console.error(`[Reminders] Missing related data for renewable ${renewableId}`);
      return;
    }
    
    // Generate email content
    const emailHtml = generateRenewalReminderHtml({
      clientName: client.name,
      itemName: renewable.name,
      itemType: itemType.name,
      expiryDate: new Date(renewable.endDate),
      daysLeft: daysBeforeExpiry,
      notes: renewable.notes
    });
    
    // Send email to the assigned user
    const emailSent = await sendEmail({
      to: assignedUser.email,
      subject: `[${daysBeforeExpiry <= 7 ? 'URGENT' : 'Reminder'}] Renewal for ${client.name} - ${renewable.name}`,
      html: emailHtml
    });
    
    if (emailSent) {
      // Log the reminder
      await storage.createReminderLog({
        renewableId: renewable.id,
        sentToId: assignedUser.id,
        daysBeforeExpiry,
        emailContent: emailHtml,
        emailSentTo: assignedUser.email
      });
      
      console.log(`[Reminders] Reminder sent for ${client.name} - ${renewable.name} to ${assignedUser.email}`);
    }
  } catch (error) {
    console.error(`[Reminders] Error sending reminder for renewable ${renewableId}:`, error);
  }
}

// Function to manually trigger reminders for testing or immediate execution
export async function triggerReminders() {
  console.log('[Reminders] Manually triggering reminders...');
  await processRenewableReminders();
  return true;
}
