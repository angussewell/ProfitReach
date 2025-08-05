/**
 * Migration script to fix existing webhook logs that have scenario names 
 * instead of processed email subject lines in the emailSubject field
 */

const { PrismaClient } = require('@prisma/client');

// Simple variable replacement function (copied from variableReplacer.ts)
function processWebhookVariables(text, data) {
  const regex = /{([^}]+)}/g;
  let result = text;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const variable = match[1];
    const value = findValueInData(data, variable);
    if (value !== undefined) {
      result = result.replace(`{${variable}}`, value);
    }
  }
  
  return result;
}

function findValueInData(data, field) {
  const cleanField = field.replace(/[{}]/g, '').toLowerCase();
  
  const variations = [
    cleanField,
    cleanField.replace(/\s+/g, '_'),
    cleanField.replace(/[-\s]/g, '_'),
    cleanField.replace(/[-\s_]/g, ''),
    cleanField.replace(/\s+/g, ''),
    cleanField.replace(/[-\s_](.)/g, (_, letter) => letter.toUpperCase()),
    cleanField.replace(/\s+/g, '_').replace(/([A-Z])/g, '_$1').toLowerCase()
  ];
  
  const uniqueVariations = [...new Set(variations)];
  
  // Try each variation
  for (const variant of uniqueVariations) {
    if (data[field] !== undefined) return data[field];
    if (data[variant] !== undefined) return data[variant];
    if (data.contactData?.[variant] !== undefined) return data.contactData[variant];
    if (data.contact?.[variant] !== undefined) return data.contact[variant];
  }
  
  // Recursively search nested objects
  for (const key in data) {
    if (typeof data[key] === 'object' && data[key] !== null) {
      const found = findValueInData(data[key], field);
      if (found !== undefined) return found;
    }
  }
  
  return undefined;
}

const prisma = new PrismaClient();

async function fixWebhookSubjects() {
  try {
    console.log('🔧 Starting webhook subject line migration...\n');

    // Get all webhook logs for the organization
    const webhookLogs = await prisma.webhookLog.findMany({
      where: {
        organizationId: 'ae4addba-f910-496f-827e-fb6074d6ba05'
      },
      select: {
        id: true,
        scenarioName: true,
        emailSubject: true,
        requestBody: true,
        contactEmail: true,
        contactName: true,
        company: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📋 Found ${webhookLogs.length} webhook logs to check\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const log of webhookLogs) {
      // Skip if emailSubject doesn't equal scenarioName (already processed correctly)
      if (log.emailSubject !== log.scenarioName) {
        console.log(`⏭️  Skipping ${log.id} - already has processed subject: "${log.emailSubject}"`);
        skippedCount++;
        continue;
      }

      console.log(`🔍 Processing webhook log ${log.id}`);
      console.log(`   Scenario: ${log.scenarioName}`);
      console.log(`   Current subject: ${log.emailSubject}`);

      try {
        // Look up the scenario to get the subject line template
        const scenario = await prisma.scenario.findFirst({
          where: {
            name: log.scenarioName,
            organizationId: 'ae4addba-f910-496f-827e-fb6074d6ba05'
          },
          select: {
            subjectLine: true
          }
        });

        if (!scenario) {
          console.log(`   ❌ Scenario "${log.scenarioName}" not found, skipping`);
          skippedCount++;
          continue;
        }

        if (!scenario.subjectLine || !scenario.subjectLine.trim()) {
          console.log(`   ❌ Scenario has no subject line template, skipping`);
          skippedCount++;
          continue;
        }

        console.log(`   📝 Template: ${scenario.subjectLine.substring(0, 100)}...`);

        // Prepare webhook data for variable processing
        const webhookData = {
          email: log.contactEmail,
          firstName: log.contactName?.split(' ')[0] || '',
          lastName: log.contactName?.split(' ').slice(1).join(' ') || '',
          company: log.company,
          companyName: log.company,
          // Include any data from the original requestBody
          ...(typeof log.requestBody === 'object' ? log.requestBody : {})
        };

        // Process the subject line template with variables
        const processedSubject = processWebhookVariables(scenario.subjectLine, webhookData);
        
        console.log(`   ✨ Processed: ${processedSubject.substring(0, 100)}${processedSubject.length > 100 ? '...' : ''}`);

        // Only update if the processed subject is different from the scenario name
        if (processedSubject !== log.scenarioName && processedSubject.trim()) {
          await prisma.webhookLog.update({
            where: { id: log.id },
            data: { emailSubject: processedSubject }
          });

          console.log(`   ✅ Updated successfully!\n`);
          fixedCount++;
        } else {
          console.log(`   ⚠️  Processed subject same as scenario name, skipping update\n`);
          skippedCount++;
        }

      } catch (error) {
        console.log(`   ❌ Error processing: ${error.message}\n`);
        skippedCount++;
      }
    }

    console.log('📊 Migration Summary:');
    console.log(`   ✅ Fixed: ${fixedCount} webhook logs`);
    console.log(`   ⏭️  Skipped: ${skippedCount} webhook logs`);
    console.log(`   📝 Total checked: ${webhookLogs.length} webhook logs`);

    if (fixedCount > 0) {
      console.log('\n🎉 Migration completed! The webhook log details pages should now show processed subject lines instead of scenario names.');
    } else {
      console.log('\n💡 No webhook logs needed fixing. This might mean:');
      console.log('   - All existing logs already have processed subjects');
      console.log('   - The scenarios have subject line templates that process to the same as scenario names');
      console.log('   - There are no scenarios with proper subject line templates');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  fixWebhookSubjects()
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { fixWebhookSubjects };