/**
 * Default capacity, applied to any day the shop has not set a rule for.
 *
 * Deliberately generous: these exist so a day cannot be oversold without
 * anyone noticing, not to throttle a shop that is having a good morning. The
 * florist raises or lowers them per day in Admin → Delivery days.
 */
export const DEFAULT_MAX_ORDERS_PER_DAY = 40
export const DEFAULT_MAX_PER_WINDOW = 12
