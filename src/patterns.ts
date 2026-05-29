// Hull and report IDs are written as `#` followed by 7 lowercase hex digits.
// HEX_ID_PATTERN validates a single ID in form inputs.
// HEX_ID_GLOBAL_PATTERN extracts all occurrences from free-form text (parser).
export const HEX_ID_PATTERN = /^#[0-9a-f]{7}$/i;
export const HEX_ID_GLOBAL_PATTERN = /#[0-9a-f]{7}/gi;

// Serial numbers are up to 16 digits while typing; only exactly 16 is valid.
export const SERIAL_PATTERN = /^\d{0,16}$/;
export const SERIAL_LENGTH = 16;
