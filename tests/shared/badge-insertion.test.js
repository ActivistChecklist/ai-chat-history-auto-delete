import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  BADGE_ID,
  findBadgeInsertionPoint,
  isBadgeInPlace,
  insertBadge
} from '../../src/shared/badge-insertion.js';

/**
 * Mirrors the shape of Claude's sidebar as of the 2026 nav redesign: a
 * `sidebar-recents` region whose section holds a `label:recents` row ("Chats and
 * tasks") followed by a `display: contents` wrapper around the chat rows.
 */
function sidebarDom({ labelRowKey = 'label:recents', withLabel = true, withRecents = true } = {}) {
  const labelRow = withLabel
    ? `<div ${labelRowKey ? `data-row-key="${labelRowKey}"` : ''} class="df-drag-shiftable">
         <div data-sidebar-group-label><button>Chats and tasks</button></div>
       </div>`
    : '';
  const recents = withRecents
    ? `<div data-testid="sidebar-recents" class="df-recents-anchor">
         <div class="group/section flex flex-col gap-px">
           ${labelRow}
           <div class="contents">
             <div data-row-key="chat:aaa"><a href="/chat/aaa">First chat</a></div>
             <div data-row-key="chat:bbb"><a href="/chat/bbb">Second chat</a></div>
           </div>
         </div>
       </div>`
    : '';

  const dom = new JSDOM(`<!DOCTYPE html><body>
    <aside class="dframe-sidebar">
      <div class="dframe-sidebar-body">
        <div class="dframe-nav-scroll">
          <div data-testid="sidebar-pinned"></div>
          ${recents}
        </div>
      </div>
    </aside>
  </body>`);
  return dom.window.document;
}

function makeBadge(doc) {
  const badge = doc.createElement('button');
  badge.id = BADGE_ID;
  return badge;
}

describe('findBadgeInsertionPoint', () => {
  it('anchors directly after the "Chats and tasks" label row', () => {
    const doc = sidebarDom();
    const point = findBadgeInsertionPoint(doc);
    const labelRow = doc.querySelector('[data-row-key="label:recents"]');

    expect(point.anchor).toBe('recents-label-row');
    expect(point.after).toBe(labelRow);
    expect(point.parent).toBe(labelRow.parentElement);
  });

  it('falls back to the group label when the row key is renamed', () => {
    const doc = sidebarDom({ labelRowKey: '' });
    const point = findBadgeInsertionPoint(doc);

    expect(point.anchor).toBe('recents-group-label');
    expect(point.parent.classList.contains('group/section')).toBe(true);
  });

  it('falls back to the top of the recents section when no label exists', () => {
    const doc = sidebarDom({ withLabel: false });
    const point = findBadgeInsertionPoint(doc);

    expect(point.anchor).toBe('recents-section');
    expect(point.after).toBeNull();
  });

  it('falls back to the nav scroller when recents is absent (empty state)', () => {
    const doc = sidebarDom({ withRecents: false });
    const point = findBadgeInsertionPoint(doc);

    expect(point.anchor).toBe('nav-scroll');
    expect(point.parent.classList.contains('dframe-nav-scroll')).toBe(true);
  });

  it('falls back to the sidebar body when even the nav scroller is gone', () => {
    const doc = sidebarDom({ withRecents: false });
    doc.querySelector('.dframe-nav-scroll').className = 'renamed-by-claude';
    const point = findBadgeInsertionPoint(doc);

    expect(point.anchor).toBe('sidebar-body');
  });

  it('returns null when no sidebar is present at all', () => {
    const doc = new JSDOM('<!DOCTYPE html><body><main>chat</main></body>').window.document;
    expect(findBadgeInsertionPoint(doc)).toBeNull();
  });
});

describe('insertBadge', () => {
  it('places the badge between the label row and the chat list', () => {
    const doc = sidebarDom();
    const badge = makeBadge(doc);
    const point = findBadgeInsertionPoint(doc);

    insertBadge(point, badge);

    const labelRow = doc.querySelector('[data-row-key="label:recents"]');
    expect(labelRow.nextElementSibling).toBe(badge);
    expect(badge.nextElementSibling.classList.contains('contents')).toBe(true);
  });

  it('leaves Claude’s existing nodes attached (no reparenting)', () => {
    const doc = sidebarDom();
    const rows = doc.querySelector('.contents');
    const section = rows.parentElement;
    const badge = makeBadge(doc);

    insertBadge(findBadgeInsertionPoint(doc), badge);

    expect(rows.parentElement).toBe(section);
    expect(section.childElementCount).toBe(3);
  });

  it('never calls removeChild — reparenting React nodes throws on reconciliation', () => {
    const doc = sidebarDom();
    const badge = makeBadge(doc);
    const point = findBadgeInsertionPoint(doc);
    point.parent.removeChild = () => {
      throw new Error('removeChild must not be called');
    };

    expect(() => insertBadge(point, badge)).not.toThrow();
  });

  it('is idempotent — re-inserting keeps a single badge in the same slot', () => {
    const doc = sidebarDom();
    const badge = makeBadge(doc);

    insertBadge(findBadgeInsertionPoint(doc), badge);
    insertBadge(findBadgeInsertionPoint(doc), badge);

    expect(doc.querySelectorAll(`#${BADGE_ID}`).length).toBe(1);
    expect(doc.querySelector('[data-row-key="label:recents"]').nextElementSibling).toBe(badge);
  });

  it('appends instead of throwing when the reference node has been detached', () => {
    const doc = sidebarDom();
    const badge = makeBadge(doc);
    const point = findBadgeInsertionPoint(doc);
    // Simulate Claude re-rendering the chat list out from under a stale point.
    const stale = doc.createElement('div');
    point.after.after(stale);
    stale.remove();

    expect(() => insertBadge(point, badge)).not.toThrow();
    expect(badge.parentElement).toBe(point.parent);
  });

  it('no-ops on missing arguments', () => {
    const doc = sidebarDom();
    expect(insertBadge(null, makeBadge(doc))).toBe(false);
    expect(insertBadge(findBadgeInsertionPoint(doc), null)).toBe(false);
  });
});

describe('isBadgeInPlace', () => {
  it('is true right after insertion and false once Claude moves the badge', () => {
    const doc = sidebarDom();
    const badge = makeBadge(doc);
    insertBadge(findBadgeInsertionPoint(doc), badge);

    expect(isBadgeInPlace(badge, findBadgeInsertionPoint(doc))).toBe(true);

    // Claude re-renders and shunts the badge to the end of the section.
    findBadgeInsertionPoint(doc).parent.appendChild(badge);
    expect(isBadgeInPlace(badge, findBadgeInsertionPoint(doc))).toBe(false);
  });

  it('is false for a detached badge', () => {
    const doc = sidebarDom();
    expect(isBadgeInPlace(makeBadge(doc), findBadgeInsertionPoint(doc))).toBe(false);
  });

  it('checks first-child position for label-less anchors', () => {
    const doc = sidebarDom({ withLabel: false });
    const badge = makeBadge(doc);
    insertBadge(findBadgeInsertionPoint(doc), badge);

    expect(isBadgeInPlace(badge, findBadgeInsertionPoint(doc))).toBe(true);
  });
});
