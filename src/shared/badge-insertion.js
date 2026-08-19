/**
 * Locates where the sidebar badge belongs in Claude's DOM and puts it there.
 *
 * Kept separate from the content script so the selector chain — the part most
 * likely to break when Claude reorganises its UI — is unit-testable.
 *
 * Rules:
 *  - Only ever `insertBefore`. Never `removeChild` one of Claude's nodes:
 *    reparenting React-managed elements throws during reconciliation.
 *  - Every selector has a fallback, so a renamed class degrades the badge's
 *    position rather than removing it entirely.
 */

export const BADGE_ID = 'aichad-sidebar-badge';

function nextSiblingIgnoringBadge(el) {
  let node = el?.nextElementSibling ?? null;
  while (node && node.id === BADGE_ID) node = node.nextElementSibling;
  return node;
}

function firstChildIgnoringBadge(parent) {
  let node = parent?.firstElementChild ?? null;
  while (node && node.id === BADGE_ID) node = node.nextElementSibling;
  return node;
}

/**
 * @param {Document|HTMLElement} [root]
 * @returns {{parent: HTMLElement, after: HTMLElement|null, anchor: string}|null}
 *   `after` is the node the badge should directly follow; null means "first child".
 */
export function findBadgeInsertionPoint(root = document) {
  const recents = root.querySelector('[data-testid="sidebar-recents"]');

  if (recents) {
    // Preferred: directly beneath the "Chats and tasks" label row.
    const labelRow = recents.querySelector('[data-row-key="label:recents"]');
    if (labelRow?.parentElement) {
      return { parent: labelRow.parentElement, after: labelRow, anchor: 'recents-label-row' };
    }

    // The row key was renamed but the group label survived.
    const label = recents.querySelector('[data-sidebar-group-label]');
    const labelHost = label?.closest('[data-row-key]') ?? label?.parentElement ?? null;
    if (labelHost?.parentElement && recents.contains(labelHost.parentElement)) {
      return { parent: labelHost.parentElement, after: labelHost, anchor: 'recents-group-label' };
    }

    // No label at all — sit at the top of the recents section.
    const section = recents.firstElementChild;
    if (section) return { parent: section, after: null, anchor: 'recents-section' };
    return { parent: recents, after: null, anchor: 'recents' };
  }

  // Recents list absent (e.g. empty state): top of the scrollable nav.
  const navScroll = root.querySelector('.dframe-nav-scroll');
  if (navScroll) return { parent: navScroll, after: null, anchor: 'nav-scroll' };

  // Last resort: anywhere in the sidebar is better than nowhere.
  const sidebarBody = root.querySelector('.dframe-sidebar-body');
  if (sidebarBody) return { parent: sidebarBody, after: null, anchor: 'sidebar-body' };

  return null;
}

/**
 * True when `badge` already sits exactly where `point` says it should.
 */
export function isBadgeInPlace(badge, point) {
  if (!badge?.parentElement || !point?.parent) return false;
  if (badge.parentElement !== point.parent) return false;
  if (point.after) return badge.previousElementSibling === point.after;
  return badge === point.parent.firstElementChild;
}

/**
 * Inserts (or repositions) the badge. insertBefore-only — see module notes.
 */
export function insertBadge(point, badge) {
  if (!point?.parent || !badge) return false;
  const { parent, after } = point;
  const before = after ? nextSiblingIgnoringBadge(after) : firstChildIgnoringBadge(parent);
  // A stale reference would make insertBefore throw; append instead.
  if (before && before.parentElement !== parent) {
    parent.appendChild(badge);
    return true;
  }
  parent.insertBefore(badge, before);
  return true;
}
