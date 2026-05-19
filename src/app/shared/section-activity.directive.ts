import { Directive, ElementRef, OnDestroy, OnInit, inject, signal } from '@angular/core';

type ObserverCallback = (entry: IntersectionObserverEntry) => void;

function createObserverManager(options: IntersectionObserverInit) {
  let observer: IntersectionObserver | null = null;
  const listeners = new Map<Element, Set<ObserverCallback>>();

  const getObserver = () => {
    if (observer || typeof IntersectionObserver === 'undefined') {
      return observer;
    }

    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        listeners.get(entry.target)?.forEach((listener) => listener(entry));
      }
    }, options);

    return observer;
  };

  return {
    observe(node: Element, callback: ObserverCallback) {
      const currentObserver = getObserver();
      if (!currentObserver) {
        return () => undefined;
      }

      const nodeListeners = listeners.get(node) ?? new Set<ObserverCallback>();
      const isFirstListener = nodeListeners.size === 0;

      nodeListeners.add(callback);
      listeners.set(node, nodeListeners);

      if (isFirstListener) {
        currentObserver.observe(node);
      }

      return () => {
        const activeListeners = listeners.get(node);
        if (!activeListeners) {
          return;
        }

        activeListeners.delete(callback);
        if (activeListeners.size > 0) {
          return;
        }

        listeners.delete(node);
        currentObserver.unobserve(node);
      };
    },
  };
}

const nearObserverManager = createObserverManager({
  rootMargin: '35% 0px 35% 0px',
  threshold: 0.01,
});

const activeObserverManager = createObserverManager({
  rootMargin: '-15% 0px -15% 0px',
  threshold: 0.15,
});

@Directive({
  selector: '[appSectionActivity]',
  exportAs: 'sectionActivity',
  standalone: true,
})
export class SectionActivityDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private stopNearObservation: () => void = () => {};
  private stopActiveObservation: () => void = () => {};

  readonly isNear = signal(false);
  readonly isActive = signal(false);
  readonly hasEntered = signal(false);

  ngOnInit() {
    const node = this.elementRef.nativeElement;

    this.stopNearObservation = nearObserverManager.observe(node, (entry) => {
      this.isNear.set(entry.isIntersecting);
      if (entry.isIntersecting) {
        this.hasEntered.set(true);
      }
    });

    this.stopActiveObservation = activeObserverManager.observe(node, (entry) => {
      this.isActive.set(entry.isIntersecting);
      if (entry.isIntersecting) {
        this.hasEntered.set(true);
      }
    });
  }

  ngOnDestroy() {
    this.stopNearObservation();
    this.stopActiveObservation();
  }
}