import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, output } from '@angular/core';
import { ChevronDown, LucideAngularModule, X } from 'lucide-angular';
import { ToastService } from '../shared/toast.service';

const ICONS = { ChevronDown, X };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_ALLOWED_PATTERN = /^[+\d\s()-]+$/;

type RuntimeEnv = {
  web3formsAccessKey?: string;
  web3formsEndpoint?: string;
  web3formsSiteUrl?: string;
};

function getRuntimeEnv(): RuntimeEnv {
  return (globalThis as { __env__?: RuntimeEnv }).__env__ ?? {};
}

function getWeb3FormsAccessKey() {
  const value = getRuntimeEnv().web3formsAccessKey?.trim() ?? '';
  return value && value !== 'YOUR_WEB3FORMS_ACCESS_KEY' ? value : '';
}

function getWeb3FormsEndpoint() {
  return getRuntimeEnv().web3formsEndpoint?.trim() || 'https://api.web3forms.com/submit';
}

const SERVICE_OPTIONS = [
  { label: 'Eduklog', value: 'eduklog' },
  { label: 'Caklog', value: 'caklog' },
  { label: 'System Integration', value: 'system-integration' },
  { label: 'Data Analytics', value: 'data-analytics' },
  { label: 'Custom Architecture', value: 'custom-architecture' },
  { label: 'Cloud Migration', value: 'cloud-migration' },
];

function getEmailError(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  return EMAIL_PATTERN.test(trimmedValue) ? '' : 'Please enter a valid email address.';
}

function getPhoneError(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  if (!PHONE_ALLOWED_PATTERN.test(trimmedValue)) {
    return 'Please enter a valid phone number.';
  }

  const digitsOnly = trimmedValue.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return 'Please enter a valid phone number.';
  }

  return '';
}

@Component({
  selector: 'app-consultation-dialog',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './consultation-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultationDialogComponent implements OnInit, OnDestroy {
  readonly openChange = output<boolean>();
  protected readonly icons = ICONS;
  protected readonly serviceOptions = SERVICE_OPTIONS;
  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;

  protected name = '';
  protected serviceNeeded = '';
  protected email = '';
  protected phone = '';
  protected brief = '';
  protected nameError = '';
  protected serviceError = '';
  protected emailError = '';
  protected phoneError = '';
  protected contactError = '';
  protected submitError = '';
  protected serviceMenuOpen = false;
  protected isSubmitting = false;
  private previousBodyOverflow = '';
  private previousFocusedElement: HTMLElement | null = null;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly toastService: ToastService,
  ) {}

  ngOnInit() {
    this.previousBodyOverflow = document.body.style.overflow;
    this.previousFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';

    window.setTimeout(() => {
      this.closeButton?.nativeElement.focus();
    }, 0);
  }

  ngOnDestroy() {
    document.body.style.overflow = this.previousBodyOverflow;
    this.previousFocusedElement?.focus();
  }

  @HostListener('document:keydown.escape')
  protected handleEscape() {
    if (this.serviceMenuOpen) {
      this.serviceMenuOpen = false;
      return;
    }

    this.close();
  }

  @HostListener('document:keydown.tab', ['$event'])
  protected handleTabKey(event: KeyboardEvent) {
    const focusableElements = this.getFocusableElements();
    if (!focusableElements.length) {
      return;
    }

    const activeElement = document.activeElement;
    const currentIndex = activeElement instanceof HTMLElement ? focusableElements.indexOf(activeElement) : -1;

    if (currentIndex === -1) {
      event.preventDefault();
      focusableElements[0].focus();
      return;
    }

    const nextIndex = event.shiftKey
      ? (currentIndex - 1 + focusableElements.length) % focusableElements.length
      : (currentIndex + 1) % focusableElements.length;

    if ((!event.shiftKey && currentIndex === focusableElements.length - 1) || (event.shiftKey && currentIndex === 0)) {
      event.preventDefault();
      focusableElements[nextIndex].focus();
    }
  }

  @HostListener('document:mousedown', ['$event'])
  protected handleDocumentMousedown(event: MouseEvent) {
    if (!this.serviceMenuOpen) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (!this.elementRef.nativeElement.contains(target)) {
      this.serviceMenuOpen = false;
      return;
    }

    const serviceField = this.elementRef.nativeElement.querySelector('[data-service-field]');
    if (serviceField && !serviceField.contains(target)) {
      this.serviceMenuOpen = false;
    }
  }

  protected close() {
    this.serviceMenuOpen = false;
    this.openChange.emit(false);
  }

  protected async submitForm(event: Event) {
    event.preventDefault();
    if (this.isSubmitting) {
      return;
    }

    this.submitError = '';
    let hasError = false;

    if (!this.name.trim()) {
      this.nameError = 'Please add your name.';
      hasError = true;
    } else {
      this.nameError = '';
    }

    if (!this.serviceNeeded.trim()) {
      this.serviceError = 'Please select a service.';
      hasError = true;
    } else {
      this.serviceError = '';
    }

    this.emailError = getEmailError(this.email);
    this.phoneError = getPhoneError(this.phone);
    if (this.emailError || this.phoneError) {
      hasError = true;
    }

    if (!this.email.trim() && !this.phone.trim()) {
      this.contactError = 'Please add an email address or phone number.';
      hasError = true;
    } else {
      this.contactError = '';
    }

    if (hasError) {
      return;
    }

    const accessKey = getWeb3FormsAccessKey();
    if (!accessKey) {
      this.submitError = 'The enquiry form is not configured yet. Please try again later.';
      return;
    }

    const message = this.brief.trim() || `Service needed: ${this.serviceNeeded}`;
    this.isSubmitting = true;

    try {
      const response = await fetch(getWeb3FormsEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `New consultation enquiry: ${this.serviceNeeded}`,
          from_name: this.name.trim(),
          name: this.name.trim(),
          email: this.email.trim(),
          phone: this.phone.trim(),
          service_needed: this.serviceNeeded,
          message,
        }),
      });

      const result = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to send your enquiry right now.');
      }

      this.resetForm();
      this.close();
      this.toastService.success('Thank you for your enquiry. Our team will review your requirements and get back to you shortly.', 'Enquiry sent');
    } catch (error) {
      this.submitError = error instanceof Error ? error.message : 'Unable to send your enquiry right now.';
    } finally {
      this.isSubmitting = false;
    }
  }

  protected handleNameChange(value: string) {
    this.name = value;
    this.submitError = '';
    if (value.trim()) {
      this.nameError = '';
    }
  }

  protected handleServiceChange(value: string) {
    this.serviceNeeded = value;
    this.submitError = '';
    if (value.trim()) {
      this.serviceError = '';
    }
  }

  protected toggleServiceMenu() {
    if (this.isSubmitting) {
      return;
    }

    this.serviceMenuOpen = !this.serviceMenuOpen;
  }

  protected selectService(value: string) {
    this.handleServiceChange(value);
    this.serviceMenuOpen = false;
  }

  protected getSelectedServiceLabel() {
    return this.serviceOptions.find((option) => option.value === this.serviceNeeded)?.label ?? 'Select one';
  }

  protected handleEmailChange(value: string) {
    this.email = value;
    this.submitError = '';
    this.emailError = getEmailError(value);
    if (value.trim() || this.phone.trim()) {
      this.contactError = '';
    }
  }

  protected handlePhoneChange(value: string) {
    this.phone = value;
    this.submitError = '';
    this.phoneError = getPhoneError(value);
    if (this.email.trim() || value.trim()) {
      this.contactError = '';
    }
  }

  protected handleBriefChange(value: string) {
    this.brief = value;
    this.submitError = '';
  }

  private resetForm() {
    this.name = '';
    this.serviceNeeded = '';
    this.email = '';
    this.phone = '';
    this.brief = '';
    this.serviceMenuOpen = false;
    this.nameError = '';
    this.serviceError = '';
    this.emailError = '';
    this.phoneError = '';
    this.contactError = '';
    this.submitError = '';
  }

  private getFocusableElements() {
    const selectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(this.elementRef.nativeElement.querySelectorAll<HTMLElement>(selectors)).filter(
      (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
    );
  }
}
