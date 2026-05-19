import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  BarChart,
  Building2,
  Calculator,
  CheckCircle2,
  Cpu,
  Database,
  LayoutDashboard,
  Network,
  Rocket,
  ShieldCheck,
  Zap,
  LucideAngularModule,
  LucideIconProvider,
  LUCIDE_ICONS,
} from 'lucide-angular';
import { RevealItemDirective } from '../shared/reveal-item.directive';
import { SectionActivityDirective } from '../shared/section-activity.directive';

const ICONS = {
  BarChart,
  Building2,
  Calculator,
  CheckCircle2,
  Cpu,
  Database,
  LayoutDashboard,
  Network,
  Rocket,
  ShieldCheck,
  Zap,
};

type ParticleSpec = {
  delay: number;
  duration: number;
  left: number;
  scale: number;
  top: number;
  x: number;
};

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

const PRODUCT_PARTICLES = createParticleSpecs(12, 40, 1.35, {
  leftStart: 28,
  leftSpan: 44,
  topStart: 8,
  topSpan: 18,
});

const SERVICE_PARTICLES = createParticleSpecs(12, 40, 1.35, {
  leftStart: 28,
  leftSpan: 44,
  topStart: 8,
  topSpan: 18,
});

const CTA_PARTICLES = createParticleSpecs(14, 40, 1.35, {
  leftStart: 26,
  leftSpan: 48,
  topStart: 10,
  topSpan: 20,
});

const SERVICE_CARDS = [
  { icon: ICONS.Database, title: 'Data Architecture', desc: 'We design highly scalable data systems that structure unstructured inputs into actionable intelligence.' },
  { icon: ICONS.Network, title: 'System Integration', desc: 'Connecting disparate legacy software into a unified, secure, and modern communication layer.' },
  { icon: ICONS.Cpu, title: 'Custom Automation', desc: 'Replacing repetitive manual workflows with bespoke, audit-proof automated pipelines.' },
  { icon: ICONS.ShieldCheck, title: 'Cybersecurity & Audit', desc: 'Ensuring your operational tools meet modern compliance, tracking, and security standards.' },
  { icon: ICONS.BarChart, title: 'Advanced Analytics', desc: 'Implementing real-time dashboards to give stakeholders top-down visibility.' },
  { icon: ICONS.Zap, title: 'Cloud Migration', desc: 'Seamlessly lifting your critical applications to a highly available cloud environment.' },
];

@Component({
  selector: 'app-home-deferred-sections',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SectionActivityDirective, RevealItemDirective],
  templateUrl: './home-deferred-sections.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        BarChart,
        Building2,
        Calculator,
        CheckCircle2,
        Cpu,
        Database,
        LayoutDashboard,
        Network,
        Rocket,
        ShieldCheck,
        Zap,
      }),
    },
  ],
})
export class HomeDeferredSectionsComponent {
  readonly consultationRequested = output<void>();
  readonly ctaImageReady = input.required<boolean>();
  readonly decorativeEffectsReady = input.required<boolean>();
  readonly isSmallScreen = input.required<boolean>();
  readonly overlayDetailsReady = input.required<boolean>();

  protected readonly icons = ICONS;
  protected readonly productImage = '/assets/eduklog_BG.png';
  protected readonly productImageMobile = '/assets/eduklog_BG-mobile.jpg';
  protected readonly financeImage = '/assets/caKlog_BG.webp';
  protected readonly financeImageMobile = '/assets/caKlog_BG-mobile.jpg';
  protected readonly statsBackgroundImage = '/assets/photo-1626908013943-df94de54984c.jpeg';
  protected readonly statsBackgroundImageMobile = '/assets/photo-1626908013943-df94de54984c-mobile.jpg';
  protected readonly productList = ['Academic workflows', 'Finance integration', 'Admin automation'];
  protected readonly caklogList = ['Advanced operational control', 'Simplified reporting', 'Audit-ready tracking'];
  protected readonly serviceCards = SERVICE_CARDS;
  protected readonly productParticles = PRODUCT_PARTICLES;
  protected readonly serviceParticles = SERVICE_PARTICLES;
  protected readonly ctaParticles = CTA_PARTICLES;

  protected getProductImage() {
    return this.isSmallScreen() ? this.productImageMobile : this.productImage;
  }

  protected getFinanceImage() {
    return this.isSmallScreen() ? this.financeImageMobile : this.financeImage;
  }

  protected getStatsBackgroundImage() {
    return this.isSmallScreen() ? this.statsBackgroundImageMobile : this.statsBackgroundImage;
  }

  protected requestConsultation() {
    this.consultationRequested.emit();
  }
}