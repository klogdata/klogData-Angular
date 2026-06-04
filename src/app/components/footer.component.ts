import { RevealItemDirective } from '../shared/reveal-item.directive';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, signal } from '@angular/core';
import { ChevronRight, Github, Linkedin, Lock, LucideAngularModule, Mail, Phone, Users, X } from 'lucide-angular';
import { scrollToSection, scrollToTop } from '../shared/navigation';

const ICONS = { ChevronRight, Github, Linkedin, Lock, Mail, Phone, Users, X };

type FlippedState = 'contact' | 'careers' | 'about' | 'company' | null;

const FOOTER_COLUMNS = [
  { title: 'Services', links: ['System Integration', 'Data Analytics', 'Custom Architecture', 'Cloud Migration'] },
  { title: 'Company', links: ['Contact Us', 'Careers', 'About Klogdata', 'The Team'] },
];

const SOCIALS = [
  { icon: ICONS.Github, href: '#', disabled: true },
  { icon: ICONS.Linkedin, href: 'https://www.linkedin.com/company/kairav-digital', external: true },
  { icon: ICONS.Mail, href: 'mailto:info@klogdata.com' },
  { icon: ICONS.Phone, href: 'tel:+918073338738' },
];

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [LucideAngularModule, RevealItemDirective],
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  @ViewChild('footerRoot') private footerRef!: ElementRef<HTMLElement>;

  protected readonly icons = ICONS;
  protected readonly currentYear = new Date().getFullYear();
  protected readonly footerColumns = FOOTER_COLUMNS;
  protected readonly socials = SOCIALS;
  protected readonly logoSrc = '/assets/Klog_Data_Logo_only.png';
  protected readonly priyaImage = '/assets/Priya.jpg';
  protected readonly soumitraImage = '/assets/Soumitra.jpg';
  protected readonly flippedState = signal<FlippedState>(null);

  protected openFooterPanel(panel: Exclude<FlippedState, null>) {
    this.flippedState.set(panel);

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      requestAnimationFrame(() => {
        if (!this.footerRef) {
          return;
        }

        const footerTop = this.footerRef.nativeElement.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: Math.max(footerTop - 96, 0),
          behavior: 'smooth',
        });
      });
    }
  }

  protected closePanel() {
    this.flippedState.set(null);
  }

  protected handleFooterLink(columnTitle: string, link: string) {
    if (link === 'About Klogdata') {
      this.openFooterPanel('company');
      return;
    }

    if (link === 'Contact Us') {
      this.openFooterPanel('contact');
      return;
    }

    if (link === 'Careers') {
      this.openFooterPanel('careers');
      return;
    }

    if (link === 'The Team') {
      this.openFooterPanel('about');
      return;
    }

    if (columnTitle === 'Services') {
      scrollToSection('services');
    }
  }

  protected scrollToTop = scrollToTop;
}