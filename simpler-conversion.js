function convertToUTC(dateTimeStr, timeZone = "America/Chicago") { const timezoneOffsets = { "America/New_York": "-04:00", "America/Chicago": "-05:00", "America/Denver": "-06:00", "America/Los_Angeles": "-07:00", "America/Anchorage": "-08:00", "Pacific/Honolulu": "-10:00" }; const offsetString = timezoneOffsets[timeZone] || "-05:00"; const cleanDateTimeStr = dateTimeStr.endsWith("Z") ? dateTimeStr.slice(0, -1) : dateTimeStr; const isoWithOffset = `${cleanDateTimeStr}${offsetString}`; const utcDate = new Date(isoWithOffset); return utcDate.toISOString(); } console.log("9AM Central:", convertToUTC("2025-04-25T09:00:00", "America/Chicago")); console.log("9AM Mountain:", convertToUTC("2025-04-25T09:00:00", "America/Denver")); console.log("9AM Pacific:", convertToUTC("2025-04-25T09:00:00", "America/Los_Angeles"));
