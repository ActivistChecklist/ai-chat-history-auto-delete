import { describe, it, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { insertBarAsFirstChildOfMainContent } from '../../src/shared/bar-insertion.js';

describe('insertBarAsFirstChildOfMainContent', () => {
  it('uses insertBefore(wrap, firstChild) and never removeChild (React-safe)', () => {
    const existingFirst = { tagName: 'DIV' };
    const mainContent = {
      firstElementChild: existingFirst,
      insertBefore: vi.fn(),
      removeChild: vi.fn(() => {
        throw new Error('removeChild must not be called — reparenting breaks React');
      })
    };
    const wrapEl = { tagName: 'DIV', id: 'aichad-autodelete-top-bar-wrap' };

    insertBarAsFirstChildOfMainContent(mainContent, wrapEl);

    expect(mainContent.insertBefore).toHaveBeenCalledTimes(1);
    expect(mainContent.insertBefore).toHaveBeenCalledWith(wrapEl, existingFirst);
    expect(mainContent.removeChild).not.toHaveBeenCalled();
  });

  it('no-ops when mainContent or wrapEl is missing', () => {
    const main = { insertBefore: vi.fn() };
    insertBarAsFirstChildOfMainContent(null, {});
    insertBarAsFirstChildOfMainContent(main, null);
    expect(main.insertBefore).not.toHaveBeenCalled();
  });

  it('prepends the bar in a real DOM: existing first child stays a direct child of #main-content', () => {
    const dom = new JSDOM(
      '<!DOCTYPE html><div id="main-content"><div id="react-root"></div></div>'
    );
    const { document } = dom.window;
    const main = document.getElementById('main-content');
    const reactRoot = document.getElementById('react-root');
    const wrap = document.createElement('div');
    wrap.id = 'aichad-autodelete-top-bar-wrap';

    insertBarAsFirstChildOfMainContent(main, wrap);

    expect(main.firstElementChild).toBe(wrap);
    expect(main.children[1]).toBe(reactRoot);
    expect(reactRoot.parentElement).toBe(main);
    expect(main.childElementCount).toBe(2);
  });
});
