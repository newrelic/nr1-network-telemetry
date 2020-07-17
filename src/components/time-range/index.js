export const durationToAbsoluteRange = timeRange => {
  if (!timeRange) {
    return durationToAbsoluteRange({
      duration: 30 * 60 * 1000
    });
  } else if (timeRange.begin_time && timeRange.end_time) {
    return timeRange;
  } else if (timeRange.duration) {
    const now = Math.floor(new Date().getTime() / 1000);
    return {
      begin_time: now - timeRange.duration / 1000,
      end_time: now
    };
  }
};

/*
 * Helper function to turn timeRange into NRQL Since
 */
export const timeRangeToNrql = timeRange => {
  if (!timeRange) {
    return "";
  } else if (timeRange.begin_time && timeRange.end_time) {
    return ` SINCE ${timeRange.begin_time} UNTIL ${timeRange.end_time}`;
  } else if (timeRange.duration) {
    return ` SINCE ${timeRange.duration / 1000} SECONDS AGO`;
  }

  return "";
};
