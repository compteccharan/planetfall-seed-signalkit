export const LEVEL_ONE_RECORD_TYPES = [
  { kind: "antenna", summary: "antenna collected" },
  { kind: "battery", summary: "battery collected" },
  { kind: "compass", summary: "compass collected" },
  { kind: "bulb", summary: "light bulb collected" },
  { kind: "filter", summary: "air filter collected" },
  { kind: "oxygen", summary: "oxygen tank collected" },
  { kind: "dial", summary: "radio dial collected" },
  { kind: "stick", summary: "control stick collected" },
  { kind: "beacon", summary: "beacon collected" },
];

export const LEVEL_ONE_ARCHIVE_RECORDS = [
  { id: "31f0cafe4d12", summary: LEVEL_ONE_RECORD_TYPES[0].summary },
  { id: "7e11a2b09c44", summary: LEVEL_ONE_RECORD_TYPES[1].summary },
  { id: "b0a7ded51a6e", summary: LEVEL_ONE_RECORD_TYPES[2].summary },
];

export const LEVEL_ONE_ARCHIVE_ROWS = LEVEL_ONE_ARCHIVE_RECORDS.map(({ id, summary }) => [id, summary]);

export function levelOneRecordSummary(index) {
  return LEVEL_ONE_RECORD_TYPES[index % LEVEL_ONE_RECORD_TYPES.length].summary;
}
