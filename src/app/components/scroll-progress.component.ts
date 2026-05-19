import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';

@Component({
  selector: 'app-scroll-progress',
  standalone: true,
  template: `
    <div
      #progressBar
      class="fixed top-0 left-0 right-0 z-[200] h-1 origin-left bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
      style="transform: scaleX(0)"
    ></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollProgressComponent implements AfterViewInit, OnDestroy {
  @ViewChild('progressBar', { static: true }) private progressBar!: ElementRef<HTMLDivElement>;

  private frameId = 0;
  private readonly queueProgressUpdate = () => {
    if (!this.frameId) {
      this.frameId = window.requestAnimationFrame(() => this.applyProgress());
    }
  };

  ngAfterViewInit() {
    this.applyProgress();
    window.addEventListener('scroll', this.queueProgressUpdate, { passive: true });
    window.addEventListener('resize', this.queueProgressUpdate);
  }

  ngOnDestroy() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
    window.removeEventListener('scroll', this.queueProgressUpdate);
    window.removeEventListener('resize', this.queueProgressUpdate);
  }

  private applyProgress() {
    this.frameId = 0;
    const scrollTop = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0;

    this.progressBar.nativeElement.style.transform = `scaleX(${progress})`;
  }
}