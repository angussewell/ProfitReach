const { convertToUTC } = require('./src/lib/date-utils'); console.log('9AM Central to UTC:', convertToUTC('2025-04-25T09:00:00', 'America/Chicago')); console.log('9AM Mountain to UTC:', convertToUTC('2025-04-25T09:00:00', 'America/Denver')); console.log('9AM Pacific to UTC:', convertToUTC('2025-04-25T09:00:00', 'America/Los_Angeles'));
