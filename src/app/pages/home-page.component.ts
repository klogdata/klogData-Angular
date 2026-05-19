import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  OnDestroy,
  OnInit,
  ViewContainerRef,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import type { ConsultationDialogComponent } from '../components/consultation-dialog.component';
import { ArrowRight, LucideAngularModule, LucideIconProvider, LUCIDE_ICONS } from 'lucide-angular';
import { FooterComponent } from '../components/footer.component';
import { HomeDeferredSectionsComponent } from '../components/home-deferred-sections.component';
import { NavbarComponent } from '../components/navbar.component';
import { ScrollProgressComponent } from '../components/scroll-progress.component';
import { ToastHostComponent } from '../components/toast-host.component';
import { scrollToSection } from '../shared/navigation';
import { scheduleIdleWork } from '../shared/schedule';
import { SectionActivityDirective } from '../shared/section-activity.directive';

const ICONS = { ArrowRight };

type ParticleSpec = {
  delay: number;
  duration: number;
  left: number;
  scale: number;
  top: number;
  x: number;
};

const MOBILE_BREAKPOINT = 768;

const createParticleSpecs = (
  count: number,
  maxOffset = 60,
  maxScale = 1.8,
  position = { leftStart: 0, leftSpan: 100, topStart: 0, topSpan: 100 },
): ParticleSpec[] =>
  Array.from({ length: count }, () => ({
    delay: Math.random() * 3,
    duration: 3 + Math.random() * 4,
    left: position.leftStart + Math.random() * position.leftSpan,
    scale: 1 + Math.random() * (maxScale - 1),
    top: position.topStart + Math.random() * position.topSpan,
    x: Math.random() < 0.5 ? maxOffset : -maxOffset,
  }));

const HERO_PARTICLES = createParticleSpecs(12, 60, 1.8, {
  leftStart: 24,
  leftSpan: 52,
  topStart: 26,
  topSpan: 34,
});

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    NavbarComponent,
    ScrollProgressComponent,
    SectionActivityDirective,
    HomeDeferredSectionsComponent,
    FooterComponent,
    ToastHostComponent,
  ],
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({ ArrowRight }) }],
})
export class HomePageComponent implements OnInit, OnDestroy {
  protected readonly icons = ICONS;

  protected readonly overlayDetailsReady = signal(false);
  protected readonly decorativeEffectsReady = signal(false);
  protected readonly deferredSectionsReady = signal(false);
  protected readonly isMobile = signal(typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false);
  protected readonly isSmallScreen = computed(() => this.isMobile());
  protected readonly heroParticles = computed(() => (this.isSmallScreen() ? HERO_PARTICLES.slice(0, 6) : HERO_PARTICLES));
  protected readonly heroStreamIndexes = computed(() => Array.from({ length: this.isSmallScreen() ? 2 : 4 }, (_, index) => index));
  protected readonly heroRings = computed(() => (this.isSmallScreen() ? [1] : [1, 2]));

  private overlayCleanup: () => void = () => {};
  private deferredCleanup: () => void = () => {};
  private mediaQueryList: MediaQueryList | null = null;
  private removeMediaListener: () => void = () => {};

  private readonly consultationOutlet = viewChild('consultationOutlet', { read: ViewContainerRef });
  private consultationRef: ComponentRef<ConsultationDialogComponent> | null = null;
  private lastConsultationClosedAt = 0;
  private readonly consultationReopenGuardMs = 300;

  ngOnInit() {
    this.mediaQueryList = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handleMediaChange = () => {
      this.isMobile.set(window.innerWidth < MOBILE_BREAKPOINT);
      this.configureOverlayTiming();
      this.configureDeferredSections();
    };

    this.mediaQueryList.addEventListener('change', handleMediaChange);
    this.removeMediaListener = () => this.mediaQueryList?.removeEventListener('change', handleMediaChange);

    this.configureOverlayTiming();
    this.configureDeferredSections();
  }

  ngOnDestroy() {
    this.overlayCleanup();
    this.deferredCleanup();
    this.removeMediaListener();
    this.destroyConsultationDialog();
  }

  protected scrollToSection = scrollToSection;

  protected async openConsultation() {
    if (Date.now() - this.lastConsultationClosedAt < this.consultationReopenGuardMs || this.consultationRef) {
      return;
    }

    const outlet = this.consultationOutlet();
    if (!outlet) {
      return;
    }

    const { ConsultationDialogComponent } = await import('../components/consultation-dialog.component');
    this.consultationRef = outlet.createComponent(ConsultationDialogComponent);
    this.consultationRef.instance.openChange.subscribe((open) => {
      if (!open) {
        this.destroyConsultationDialog();
      }
    });
  }

  private destroyConsultationDialog() {
    this.consultationRef?.destroy();
    this.consultationRef = null;
    this.lastConsultationClosedAt = Date.now();
  }

  private configureOverlayTiming() {
    this.overlayCleanup();

    const overlayDelay = 250;
    const effectsDelay = 700;
    const idleTimeout = 1200;

    this.overlayDetailsReady.set(false);
    this.decorativeEffectsReady.set(false);

    const overlayTimeoutId = window.setTimeout(() => this.overlayDetailsReady.set(true), overlayDelay);
    const cancelIdleWork = scheduleIdleWork(() => this.decorativeEffectsReady.set(true), {
      fallbackDelay: effectsDelay,
      preferTimeout: false,
      timeout: idleTimeout,
    });

    this.overlayCleanup = () => {
      window.clearTimeout(overlayTimeoutId);
      cancelIdleWork();
    };
  }

  private configureDeferredSections() {
    this.deferredCleanup();
    // Sections render as soon as this signal is true; below-the-fold images load
    // when the deferred chunk paints (no global preload — avoids competing with
    // first-party JS/CSS on the critical path).
    this.deferredSectionsReady.set(true);
    this.deferredCleanup = () => {};
  }
}