/*
 * Constants
 */
export const INTERVAL_SECONDS_MIN = 3;
export const INTERVAL_SECONDS_MAX = 60;
export const INTERVAL_SECONDS_DEFAULT = 30;

export const BLURRED_LINK_OPACITY = 0.3;
export const FOCUSED_LINK_OPACITY = 0.8;
export const COLOR_END = "#FFC400";
export const COLOR_START = "#3ED2F2";
export const COLORS = [
  "#11A893",
  "#00B3D7",
  "#FFC400",
  "#A45AC1",
  "#83CB4E",
  "#FA6E37",
  "#C40685",

  "#4ACAB7",
  "#3ED2F2",
  "#FFDD78",
  "#C07DDB",
  "#A2E572",
  "#FF9269",
  "#E550B0",

  "#0E7365",
  "#0189A4",
  "#CE9E00",
  "#79428E",
  "#63973A",
  "#C6562C",
  "#910662",
];

export const NRQL_QUERY_LIMIT_DEFAULT = 50;
export const NRQL_QUERY_LIMIT_MIN = 1;
export const NRQL_QUERY_LIMIT_MAX = 100;

export const NRQL_IPFIX_WHERE =
  " WHERE (bgpSourceAsNumber > 1 AND bgpSourceAsNumber < 64495)" +
  " OR (bgpSourceAsNumber > 65534 AND bgpSourceAsNumber < 4200000000)" +
  " OR (bgpSourceAsNumber > 4294967294)";
