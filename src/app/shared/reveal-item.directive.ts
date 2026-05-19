import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';

/**
 * Per-element scroll-reveal directive.
 * All instances share a single IntersectionObserver to avoid the cost of
 * creating one observer per element (30+ on a typical page load).
 * will-change is applied only at reveal time and cleared after the transition
 * so GPU compositor layers are held only as long as needed.
 *
 * Usage:
 *   <h2 appRevealItem="blur-in">…</h2>
 *   <p  appRevealItem="slide-up" [revealDelay]="150">…</p>
 *
 * Animation tokens: slide-up | slide-left | slide-right | zoom-in |
 *                   flip-x | blur-in | pop | draw | glide | drop | rise-fade
 */

const pendingReveal = new Map<Element, () => void>();
let sharedObserver: IntersectionObserver | null = null;

function getSharedObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const reveal = pendingReveal.get(entry.target);
            if (reveal) {
              sharedObserver!.unobserve(entry.target);
              pendingReveal.delete(entry.target);
              reveal();
            }
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
  }
  return sharedObserver;
}

@Directive({
  selector: '[appRevealItem]',
  standalone: true,
})
export class RevealItemDirective implements OnInit, OnDestroy {
  readonly animation = input<string>('slide-up', { alias: 'appRevealItem' });
  readonly revealDelay = input<number>(0);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  ngOnInit(): void {
    const host = this.el.nativeElement;
    host.setAttribute('data-ri', this.animation() || 'slide-up');
    host.style.setProperty('--ri-delay', (this.revealDelay() ?? 0) + 'ms');
    host.classList.add('ri-item');

    const observer = getSharedObserver();
    if (!observer) {
      host.classList.add('ri-visible');
      return;
    }

    pendingReveal.set(host, () => {
      host.style.willChange = 'opacity, transform';
      host.classList.add('ri-visible');
      host.addEventListener('transitionend', () => {
        host.style.willChange = 'auto';
      }, { once: true });
    });
    observer.observe(host);
  }

  ngOnDestroy(): void {
    const host = this.el.nativeElement;
    if (pendingReveal.has(host)) {
      getSharedObserver()?.unobserve(host);
      pendingReveal.delete(host);
    }
  }
}
