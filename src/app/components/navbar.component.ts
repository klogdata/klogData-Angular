import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, output, signal } from '@angular/core';
import { LucideAngularModule, LucideIconProvider, LUCIDE_ICONS, Menu, X } from 'lucide-angular';
import { scrollToSection, scrollToTop } from '../shared/navigation';

const ICONS = { Menu, X };

const NAV_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'Products', href: '#products' },
  { name: 'Services', href: '#services' },
];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({ Menu, X }) }],
})
export class NavbarComponent implements OnInit, OnDestroy {
  readonly consultationRequested = output<void>();
  protected readonly icons = ICONS;
  protected readonly navLinks = NAV_LINKS;
  protected readonly consultationButtonClassName = 'inline-flex items-center justify-center rounded-full border border-cyan-400/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(99,102,241,0.2)_55%,rgba(244,63,94,0.14))] px-5 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_24px_rgba(8,47,73,0.3)] transition-all duration-300 hover:border-cyan-300/50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_14px_30px_rgba(8,47,73,0.38)]';
  protected readonly logoSrc = '/assets/Klog_Data_Logo_only.png';

  protected readonly scrolled = signal(false);
  protected readonly mobileMenuOpen = signal(false);
  protected readonly mobileMenuMounted = signal(false);

  private closeTimerId: number | null = null;
  private removeScrollListener: () => void = () => {};

  ngOnInit() {
    const handleScroll = () => {
      this.scrolled.set(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    this.removeScrollListener = () => window.removeEventListener('scroll', handleScroll);
  }

  ngOnDestroy() {
    if (this.closeTimerId) {
      window.clearTimeout(this.closeTimerId);
    }

    this.removeScrollListener();
  }

  protected toggleMobileMenu() {
    this.setMobileMenuOpen(!this.mobileMenuOpen());
  }

  protected handleNavClick(href: string) {
    this.setMobileMenuOpen(false);

    if (href === '/') {
      scrollToTop();
      return;
    }

    if (href.startsWith('#')) {
      scrollToSection(href.slice(1));
    }
  }

  protected openConsultation() {
    this.consultationRequested.emit();
  }

  protected handleMobileConsultation() {
    this.setMobileMenuOpen(false);
    this.consultationRequested.emit();
  }

  protected scrollToTop = scrollToTop;

  private setMobileMenuOpen(open: boolean) {
    if (this.closeTimerId) {
      window.clearTimeout(this.closeTimerId);
      this.closeTimerId = null;
    }

    this.mobileMenuOpen.set(open);

    if (open) {
      this.mobileMenuMounted.set(true);
      return;
    }

    if (this.mobileMenuMounted()) {
      this.closeTimerId = window.setTimeout(() => {
        this.mobileMenuMounted.set(false);
        this.closeTimerId = null;
      }, 220);
    }
  }
}