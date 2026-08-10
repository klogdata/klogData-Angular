import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';

/**
 * Full-bleed liquid hero backdrop in brand colors (cyan → indigo → violet → coral).
 * WebGL2 oil-on-water field; CSS fallback when WebGL or motion is unavailable.
 */
@Component({
  selector: 'app-iridescent-hero-bg',
  standalone: true,
  host: {
    '[class.is-active]': 'active()',
  },
  template: `
    <div class="iridescent-hero-bg" aria-hidden="true">
      <div class="iridescent-hero-bg__fallback"></div>
      <canvas #canvas class="iridescent-hero-bg__canvas"></canvas>
      <div class="iridescent-hero-bg__veil"></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
      }

      .iridescent-hero-bg {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: transparent;
        /* Hold through the hero, dissolve across the bleed into the next section */
        -webkit-mask-image: linear-gradient(
          to bottom,
          #000 0%,
          #000 58%,
          rgba(0, 0, 0, 0.75) 72%,
          rgba(0, 0, 0, 0.35) 84%,
          rgba(0, 0, 0, 0.1) 93%,
          transparent 100%
        );
        mask-image: linear-gradient(
          to bottom,
          #000 0%,
          #000 58%,
          rgba(0, 0, 0, 0.75) 72%,
          rgba(0, 0, 0, 0.35) 84%,
          rgba(0, 0, 0, 0.1) 93%,
          transparent 100%
        );
      }

      .iridescent-hero-bg__canvas {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 0.6s ease;
      }

      .iridescent-hero-bg__canvas.is-ready {
        opacity: 1;
      }

      .iridescent-hero-bg__fallback {
        position: absolute;
        inset: -30%;
        background:
          radial-gradient(ellipse 60% 55% at 22% 38%, rgba(79, 140, 180, 0.42), transparent 68%),
          radial-gradient(ellipse 52% 48% at 70% 42%, rgba(99, 102, 200, 0.46), transparent 66%),
          radial-gradient(ellipse 56% 50% at 52% 74%, rgba(140, 110, 210, 0.4), transparent 70%),
          radial-gradient(ellipse 40% 34% at 46% 52%, rgba(180, 100, 140, 0.12), transparent 72%),
          #020617;
        filter: blur(52px) saturate(0.88);
        animation: none;
        transform: translateZ(0);
      }

      /* Re-applying animation when .is-active returns restarts it from 0% */
      :host.is-active .iridescent-hero-bg__fallback {
        animation: iridescentDrift 28s ease-in-out infinite alternate;
      }

      .iridescent-hero-bg__veil {
        position: absolute;
        inset: 0;
        z-index: 2;
        background: linear-gradient(
          to bottom,
          rgba(2, 6, 23, 0.2) 0%,
          rgba(2, 6, 23, 0.35) 40%,
          rgba(2, 6, 23, 0.55) 70%,
          rgba(2, 6, 23, 0) 100%
        );
      }

      @keyframes iridescentDrift {
        0% {
          transform: translate3d(-1%, -0.5%, 0) scale(1.04) rotate(-0.4deg);
        }
        50% {
          transform: translate3d(1%, 0.8%, 0) scale(1.07) rotate(0.4deg);
        }
        100% {
          transform: translate3d(-0.5%, 1%, 0) scale(1.05) rotate(-0.2deg);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        :host.is-active .iridescent-hero-bg__fallback {
          animation: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IridescentHeroBgComponent implements AfterViewInit, OnDestroy {
  readonly active = input(true);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private frameId = 0;
  private startTime = 0;
  private destroyed = false;
  private reducedMotion = false;
  private running = false;

  private mouse: [number, number] = [0.5, 0.5];
  private target: [number, number] = [0.5, 0.5];

  private uRes: WebGLUniformLocation | null = null;
  private uTime: WebGLUniformLocation | null = null;
  private uMouse: WebGLUniformLocation | null = null;

  private readonly onPointerMove = (event: PointerEvent) => {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    this.target = [
      (event.clientX - rect.left) / rect.width,
      1 - (event.clientY - rect.top) / rect.height,
    ];
  };

  private readonly onVisibility = () => {
    this.syncPlayback();
  };

  constructor() {
    effect(() => {
      this.active();
      this.syncPlayback();
    });
  }

  ngAfterViewInit() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.reducedMotion) {
      return;
    }

    const canvas = this.canvasRef().nativeElement;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      return;
    }

    this.gl = gl;
    try {
      this.initProgram(gl);
    } catch {
      this.teardownGl();
      return;
    }

    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);
    canvas.classList.add('is-ready');
    this.syncPlayback();
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.stopLoop();
    window.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.teardownGl();
  }

  private syncPlayback() {
    if (this.destroyed || !this.gl || this.reducedMotion) {
      return;
    }

    const shouldRun = this.active() && document.visibilityState === 'visible';
    if (shouldRun) {
      this.startLoop();
    } else {
      this.stopLoop();
    }
  }

  private startLoop() {
    if (this.running) {
      return;
    }
    this.running = true;
    // Fresh cycle each time the hero comes back into view
    this.startTime = performance.now();
    this.mouse = [0.5, 0.5];
    this.target = [0.5, 0.5];
    const tick = (now: number) => {
      if (!this.running || this.destroyed) {
        return;
      }
      this.draw(now);
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private stopLoop() {
    this.running = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  private teardownGl() {
    const gl = this.gl;
    if (gl && this.program) {
      gl.deleteProgram(this.program);
    }
    this.program = null;
    this.gl = null;
  }

  private initProgram(gl: WebGL2RenderingContext) {
    const vert = `#version 300 es
void main(){
  vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2);
  gl_Position = vec4(p*2.0-1.0, 0.0, 1.0);
}`;

    // Brand palette: cyan-400 → indigo-500 → purple-400 → brand coral
    const frag = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;

mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float hash(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v=0.0, amp=0.55;
  for(int i=0;i<5;i++){ v+=amp*noise(p); p=rot(0.6)*p*1.9+11.0; amp*=0.55; }
  return v;
}

vec3 iridescent(float t){
  // Tight indigo family — similar luminance so no single stop pops
  vec3 slateTeal = vec3(0.059, 0.392, 0.431); //vec3(0.008, 0.024, 0.090); // #4D6B94
  vec3 indigo = vec3(0.008, 0.024, 0.090);    // #575C9E
  vec3 violet = vec3(0.043, 0.247, 0.388);    // #7561A3
  vec3 rose = vec3(0.051, 0.216, 0.341);      // #85577A
  float x = fract(t);
  if (x < 0.4) {
    return mix(slateTeal, indigo, smoothstep(0.0, 0.4, x));
  }
  if (x < 0.78) {
    return mix(indigo, violet, smoothstep(0.4, 0.78, x));
  }
  return mix(violet, mix(violet, rose, 0.4), smoothstep(0.78, 1.0, x));
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*u_res) / u_res.y;
  float t = u_time*0.032;

  vec2 m = (u_mouse - 0.5) * vec2(u_res.x/u_res.y, 1.0);
  vec2 pull = (m - uv);
  float grab = 0.16/(dot(pull,pull)+0.5);

  vec2 q = vec2(
    fbm(uv*1.05 + vec2(0.0, t)),
    fbm(uv*1.05 + vec2(5.2,-t))
  );
  vec2 r = vec2(
    fbm(uv*1.05 + 2.1*q + vec2(1.7, 9.2) + grab*pull),
    fbm(uv*1.05 + 2.1*q + vec2(8.3, 2.8) - grab*pull)
  );
  float f = fbm(uv*1.05 + 2.5*r + t);

  float ridge = abs(fract(f*1.9 + length(r)*0.65 + t*0.9)*2.0 - 1.0);
  ridge = pow(1.0 - ridge, 1.75);

  float hue = f*0.55 + length(r)*0.22 + u_time*0.008;
  vec3 col = iridescent(hue);
  col = mix(col*0.4, col, ridge*0.7 + 0.3);
  // Neutral soft highlight — avoids icy blue hotspots
  col += vec3(0.72, 0.74, 0.82)*pow(ridge, 2.4)*0.14;

  float vig = smoothstep(1.4, 0.25, length(uv*vec2(0.85, 1.0)));
  col *= 0.36 + 0.62*vig;
  col = mix(vec3(0.02, 0.03, 0.08), col, 0.74);

  col = col/(col+0.65);
  col += (hash(gl_FragCoord.xy + floor(u_time*10.0)) - 0.5)*0.01;

  outColor = vec4(pow(max(col,0.0), vec3(0.98)), 1.0);
}`;

    const program = gl.createProgram();
    if (!program) {
      throw new Error('Unable to create WebGL program');
    }

    const vs = this.compile(gl, gl.VERTEX_SHADER, vert);
    const fs = this.compile(gl, gl.FRAGMENT_SHADER, frag);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(info || 'Program link failed');
    }

    gl.useProgram(program);
    this.program = program;
    this.uRes = gl.getUniformLocation(program, 'u_res');
    this.uTime = gl.getUniformLocation(program, 'u_time');
    this.uMouse = gl.getUniformLocation(program, 'u_mouse');
  }

  private compile(gl: WebGL2RenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Unable to create shader');
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(info || 'Shader compile failed');
    }
    return shader;
  }

  private resize() {
    const gl = this.gl;
    const canvas = this.canvasRef().nativeElement;
    if (!gl) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, this.isSmallViewport() ? 1.25 : 1.75);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width === w && canvas.height === h) {
      return;
    }
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }

  private isSmallViewport() {
    return window.innerWidth < 768;
  }

  private draw(now: number) {
    const gl = this.gl;
    if (!gl || !this.program) {
      return;
    }

    this.resize();
    this.mouse[0] += (this.target[0] - this.mouse[0]) * 0.025;
    this.mouse[1] += (this.target[1] - this.mouse[1]) * 0.025;

    gl.uniform2f(this.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(this.uTime, (now - this.startTime) / 1000);
    gl.uniform2f(this.uMouse, this.mouse[0], this.mouse[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
