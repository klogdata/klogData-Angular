export const REQUEST_DEFERRED_SECTIONS_EVENT = 'klogdata:request-deferred-sections';

export function requestDeferredSections() {
  window.dispatchEvent(new Event(REQUEST_DEFERRED_SECTIONS_EVENT));
}