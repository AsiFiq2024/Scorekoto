const unknownKickoffStatuses = new Set(["TBD", "PST"]);

export function hasKnownKickoffTime(matchDate, status) {
  const normalizedStatus = String(status || "").toUpperCase();

  if (unknownKickoffStatuses.has(normalizedStatus) || !matchDate) {
    return false;
  }

  const kickoff = new Date(matchDate);
  return !Number.isNaN(kickoff.getTime());
}

export function formatKickoffTime(matchDate, status, showTimezone = true) {
  if (!hasKnownKickoffTime(matchDate, status)) {
    return "TBD";
  }

  const kickoff = new Date(matchDate);
  // Format in Bangladesh Standard Time (BST, Asia/Dhaka - UTC+6)
  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Dhaka",
  }).format(kickoff);

  return showTimezone ? `${formattedTime} BST` : formattedTime;
}
