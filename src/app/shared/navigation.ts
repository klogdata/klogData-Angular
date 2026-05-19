import { requestDeferredSections } from './deferred-sections';

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function scrollToSection(sectionId: string) {
  const tryScroll = () => {
    const element = document.getElementById(sectionId);
    if (!element) {
      return false;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  };

  if (tryScroll()) {
    return;
  }

  requestDeferredSections();

  let attempts = 0;
  const waitForTarget = () => {
    if (tryScroll() || attempts >= 20) {
      return;
    }

    attempts += 1;
    window.setTimeout(waitForTarget, 50);
  };

  window.setTimeout(waitForTarget, 0);
}