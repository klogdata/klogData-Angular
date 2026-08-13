import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  output,
  signal,
} from '@angular/core';
import { LucideAngularModule, Menu, X } from 'lucide-angular';
import { scrollToSection, scrollToTop } from '../shared/navigation';

const ICONS = { Menu, X };

const NAV_LINKS = [
  { name: 'Products', href: '#products' },
  { name: 'Services', href: '#services' },
];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [NgClass, LucideAngularModule],
  templateUrl: './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly consultationRequested = output<void>();
  protected readonly icons = ICONS;
  protected readonly navLinks = NAV_LINKS;
  protected readonly logoSrc = '/assets/Klog_Data_Logo_only.png';

  protected readonly scrolled = signal(false);
  protected readonly mobileMenuOpen = signal(false);
  protected readonly mobileMenuMounted = signal(false);

  private closeTimerId: number | null = null;
  private removeScrollListener: () => void = () => {};

  ngOnInit() {
    const handleScroll = () => {
      // Solid bar once the sticky navbar has reached (or passed) the viewport top
      this.scrolled.set(this.host.nativeElement.getBoundingClientRect().top <= 1);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    this.removeScrollListener = () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
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