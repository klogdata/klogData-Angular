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
import { Color, Mesh, Program, Renderer, RenderTarget, Triangle } from 'ogl';

const MAX_STRANDS = 12;
const MAX_COLORS = 8;

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColors[${MAX_COLORS}];
uniform int uColorCount;
uniform int uStrandCount;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaviness;
uniform float uThickness;
uniform float uGlow;
uniform float uTaper;
uniform float uSpread;
uniform float uHueShift;
uniform float uIntensity;
uniform float uOpacity;
uniform float uScale;
uniform float uSaturation;
uniform float uYBias;
uniform float uXBias;
uniform float uXScaleMul;
uniform float uEnvX0;
uniform float uEnvX1;
uniform float uEnvX2;
uniform float uEnvX3;
uniform float uBeadDensity;
uniform float uBeadSharp;

out vec4 fragColor;

const float PI = 3.14159265;

float hash11(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.00, 0.33, 0.67)));
}

vec3 samplePalette(float t) {
  t = fract(t);
  float scaled = t * float(uColorCount);
  int idx = int(floor(scaled));
  float blend = fract(scaled);
  int nextIdx = idx + 1;
  if (nextIdx >= uColorCount) nextIdx = 0;
  return mix(uColors[idx], uColors[nextIdx], blend);
}

vec3 strandColor(float t) {
  if (uColorCount > 0) return samplePalette(t);
  return spectrum(t);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  // Vertical scale stays locked; horizontal can loosen on narrow screens without shifting Y
  uv.x /= max(uScale * uXScaleMul, 0.0001);
  uv.y /= max(uScale, 0.0001);

  // Bias field upward and slightly right so bottom-left copy stays clear
  uv.y -= uYBias;
  uv.x -= uXBias;

  // Spatial + gently oscillating shear (must stay bounded — linear uTime drift escapes the envelope)
  float shear = uv.x * 0.08 + sin(uTime * uSpeed * 0.18) * 0.025;
  uv.y -= shear * 0.35;

  float e = 0.06 + uIntensity * 0.94;

  // Asymmetric envelope: start/end tunable per viewport width
  float envX = smoothstep(uEnvX0, uEnvX1, uv.x) * (1.0 - smoothstep(uEnvX2, uEnvX3, uv.x));
  float envY = smoothstep(-0.55, 0.05, uv.y) * (1.0 - smoothstep(0.55, 1.05, uv.y));
  float env = pow(max(envX * (0.55 + 0.45 * envY), 0.0), uTaper);

  vec3 col = vec3(0.0);

  for (int i = 0; i < ${MAX_STRANDS}; i++) {
    if (i >= uStrandCount) break;

    float fi = float(i);
    float n0 = hash11(fi * 13.17 + 0.7);
    float n1 = hash11(fi * 29.31 + 2.1);
    float n2 = hash11(fi * 47.91 + 4.3);

    float ph = (fi * 1.55 + n0 * 2.4) * uSpread;
    float freq = (1.55 + fi * 0.28 + n1 * 0.55) * uWaviness;
    float spd = 0.75 + fi * 0.55 + n2 * 0.45;
    float yOff = (fi - float(uStrandCount - 1) * 0.5) * 0.035 * uSpread;

    float tt = uTime * uSpeed;
    float drift = tt * 0.22 + ph * 0.15;
    float w = sin(uv.x * freq + tt * spd + ph + drift) * 0.55
            + sin(uv.x * freq * 0.72 - tt * spd * 0.35 + ph * 1.9 + n1) * 0.30
            + sin(uv.x * (freq * 0.35) + tt * 0.4 + n0 * 6.0) * 0.15;

    float amp = (0.085 + 0.02 * e) * env * uAmplitude;
    float y = w * amp + yOff;

    float d = abs(uv.y - y);
    float thick = (0.0012 + 0.048 * e) * (0.4 + env) * uThickness;
    float g = thick / (d + thick * 0.5);
    g = g * g;

    float h = fi / max(float(uStrandCount), 1.0) + uv.x * 0.22 + uTime * 0.015 + uHueShift;
    vec3 base = strandColor(h);

    // Sparse telemetry beads traveling along each strand
    float beadPhase = uv.x * uBeadDensity - tt * (0.55 + n1 * 0.35) + ph * 0.6;
    float beadCell = fract(beadPhase);
    float beadId = floor(beadPhase);
    float packet = step(0.72, hash11(beadId + fi * 19.0)); // occasional brighter packet
    float beadCore = pow(1.0 - abs(beadCell * 2.0 - 1.0), uBeadSharp);
    float bead = beadCore * (0.35 + 0.65 * packet) * g * env;

    vec3 hot = mix(base, vec3(0.85, 0.95, 1.0), 0.45);
    col += base * g * env;
    col += hot * bead * 1.35;
  }

  col *= 0.42 + 0.65 * e;
  col = 1.0 - exp(-col * uGlow);

  float gray = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(gray), col, uSaturation), 0.0);

  float lum = max(max(col.r, col.g), col.b);
  float alpha = clamp(lum, 0.0, 1.0) * uOpacity;

  fragColor = vec4(col * uOpacity, alpha);
}
`;

const GLASS_FRAG = `#version 300 es
precision highp float;

uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uRadius;
uniform float uRefraction;
uniform float uDispersion;

out vec4 fragColor;

vec2 toUv(vec2 p) {
  return p * (uResolution.y / uResolution) + 0.5;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float d = length(p);
  float r = uRadius;

  float edge = fwidth(d) * 1.5;
  float mask = 1.0 - smoothstep(r - edge, r + edge, d);
  if (mask <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }

  float z = sqrt(max(r * r - d * d, 0.0)) / r;
  float nd = d / r;

  vec2 dir = d > 0.0 ? p / d : vec2(0.0);
  float lens = smoothstep(0.85, 1.0, nd) * pow(nd, 6.0);
  vec2 offset = -dir * lens * uRefraction * 0.15;
  vec2 disp = -dir * lens * uDispersion * 0.012;

  vec3 light;
  light.r = texture(uScene, toUv(p + offset - disp)).r;
  light.g = texture(uScene, toUv(p + offset)).g;
  light.b = texture(uScene, toUv(p + offset + disp)).b;

  float fres = pow(1.0 - z, 3.0);
  vec3 rim = vec3(1.0) * fres * 0.18;

  vec2 lightDir = normalize(vec2(-0.55, 0.6));
  float spec = pow(max(dot(p / max(r, 1e-4), lightDir), 0.0), 6.0);
  spec *= smoothstep(r, r * 0.55, d);

  vec3 emissive = light + rim + vec3(spec) * 0.4;
  float emissiveA = clamp(max(max(emissive.r, emissive.g), emissive.b), 0.0, 1.0);

  float bodyA = 0.05 + fres * 0.05;

  float outA = emissiveA + bodyA * (1.0 - emissiveA);
  vec3 outRGB = emissive;

  outRGB *= mask;
  outA *= mask;

  fragColor = vec4(outRGB, outA);
}
`;

function buildPalette(colors: string[]): number[][] {
  const filled = colors?.length ? colors : ['#ffffff'];
  const padded: number[][] = [];
  for (let i = 0; i < MAX_COLORS; i++) {
    const hex = filled[i] ?? filled[filled.length - 1];
    const c = new Color(hex);
    padded.push([c.r, c.g, c.b]);
  }
  return padded;
}

/**
 * Klogdata hybrid signal-weave hero backdrop (ogl).
 * Brand cyan→orange strands with sparse telemetry beads; CSS fallback when WebGL/motion unavailable.
 */
@Component({
  selector: 'app-strands-hero-bg',
  standalone: true,
  host: {
    '[class.is-active]': 'active()',
  },
  template: `
    <div class="strands-hero-bg" aria-hidden="true">
      <div class="strands-hero-bg__fallback"></div>
      <div #container class="strands-hero-bg__stage"></div>
      <div class="strands-hero-bg__veil"></div>
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

      .strands-hero-bg {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: transparent;
      }

      .strands-hero-bg__stage {
        position: absolute;
        left: 0;
        right: 0;
        /* Keep strands above bottom-left hero copy, but show the full wave field */
        top: -8%;
        height: 94%;
        width: 100%;
        background: transparent;
        opacity: 0;
        transition: opacity 0.6s ease;
      }

      .strands-hero-bg__stage.is-ready {
        opacity: 1;
      }

      .strands-hero-bg__stage canvas {
        display: block;
        width: 100%;
        height: 100%;
      }

      .strands-hero-bg__fallback {
        position: absolute;
        inset: -30%;
        background:
          radial-gradient(ellipse 55% 50% at 72% 28%, rgba(6, 182, 212, 0.34), transparent 68%),
          radial-gradient(ellipse 48% 44% at 58% 42%, rgba(237, 58, 220, 0.26), transparent 66%),
          radial-gradient(ellipse 42% 38% at 78% 58%, rgba(249, 115, 22, 0.2), transparent 70%),
          radial-gradient(ellipse 36% 32% at 65% 48%, rgba(234, 179, 8, 0.14), transparent 72%),
          #020617;
        filter: blur(52px) saturate(0.9);
        animation: none;
        transform: translateZ(0);
      }

      :host.is-active .strands-hero-bg__fallback {
        animation: strandsDrift 28s ease-in-out infinite alternate;
      }

      .strands-hero-bg__veil {
        position: absolute;
        inset: 0;
        z-index: 2;
        background:
          linear-gradient(
            to bottom,
            rgba(2, 6, 23, 0.12) 0%,
            rgba(2, 6, 23, 0.2) 35%,
            rgba(2, 6, 23, 0.55) 68%,
            rgba(2, 6, 23, 0.72) 100%
          ),
          radial-gradient(
            ellipse 75% 58% at 10% 90%,
            rgba(2, 6, 23, 0.62),
            transparent 72%
          );
      }

      @keyframes strandsDrift {
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
        :host.is-active .strands-hero-bg__fallback {
          animation: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrandsHeroBgComponent implements AfterViewInit, OnDestroy {
  readonly active = input(true);
  readonly colors = input<string[]>(['#06B6D4', '#ed3adc', '#06d4ae', '#EAB308']);
  readonly count = input(4);
  readonly speed = input(0.28);
  readonly amplitude = input(0.9);
  readonly waviness = input(1.4);
  readonly thickness = input(0.85);
  readonly glow = input(1.8);
  readonly taper = input(2.4);
  readonly spread = input(1.35);
  readonly hueShift = input(0);
  readonly intensity = input(0.45);
  readonly saturation = input(1.05);
  readonly opacity = input(1);
  readonly scale = input(1.55);
  readonly yBias = input(0.17);
  readonly beadDensity = input(4.5);
  readonly beadSharp = input(14);
  readonly glass = input(false);
  readonly refraction = input(1);
  readonly dispersion = input(1);
  readonly glassSize = input(1);

  private readonly containerRef = viewChild.required<ElementRef<HTMLDivElement>>('container');

  private renderer: Renderer | null = null;
  private program: Program | null = null;
  private mesh: Mesh | null = null;
  private glassProgram: Program | null = null;
  private glassMesh: Mesh | null = null;
  private renderTarget: RenderTarget | null = null;
  private frameId = 0;
  private destroyed = false;
  private reducedMotion = false;
  private running = false;
  private ready = false;

  private readonly onVisibility = () => {
    this.syncPlayback();
  };

  private readonly onResize = () => {
    this.resize();
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

    try {
      this.initGl();
    } catch {
      this.teardownGl();
      return;
    }

    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('resize', this.onResize);
    this.containerRef().nativeElement.classList.add('is-ready');
    this.ready = true;
    this.syncPlayback();
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.stopLoop();
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('resize', this.onResize);
    this.teardownGl();
  }

  private syncPlayback() {
    if (this.destroyed || !this.ready || this.reducedMotion) {
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
    const tick = (t: number) => {
      if (!this.running || this.destroyed) {
        return;
      }
      this.draw(t);
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

  private initGl() {
    const ctn = this.containerRef().nativeElement;
    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.backgroundColor = 'transparent';

    const geometry = new Triangle(gl);
    if (geometry.attributes['uv']) {
      delete geometry.attributes['uv'];
    }

    const palette = buildPalette(this.colors());
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
        uColors: { value: palette },
        uColorCount: { value: Math.min(this.colors().length, MAX_COLORS) },
        uStrandCount: { value: Math.min(this.count(), MAX_STRANDS) },
        uSpeed: { value: this.speed() },
        uAmplitude: { value: this.amplitude() },
        uWaviness: { value: this.waviness() },
        uThickness: { value: this.thickness() },
        uGlow: { value: this.glow() },
        uTaper: { value: this.taper() },
        uSpread: { value: this.spread() },
        uHueShift: { value: this.hueShift() },
        uIntensity: { value: this.intensity() },
        uOpacity: { value: this.opacity() },
        uScale: { value: this.scale() },
        uSaturation: { value: this.saturation() },
        uYBias: { value: this.yBias() },
        uXBias: { value: 0.12 },
        uXScaleMul: { value: 1 },
        uEnvX0: { value: -1.15 },
        uEnvX1: { value: 0.55 },
        uEnvX2: { value: 0.85 },
        uEnvX3: { value: 1.55 },
        uBeadDensity: { value: this.beadDensity() },
        uBeadSharp: { value: this.beadSharp() },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const renderTarget = new RenderTarget(gl, {
      width: Math.max(1, ctn.offsetWidth),
      height: Math.max(1, ctn.offsetHeight),
    });

    const glassProgram = new Program(gl, {
      vertex: VERT,
      fragment: GLASS_FRAG,
      uniforms: {
        uScene: { value: renderTarget.texture },
        uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
        uRadius: { value: 0.46 * this.glassSize() },
        uRefraction: { value: this.refraction() },
        uDispersion: { value: this.dispersion() },
      },
    });
    const glassMesh = new Mesh(gl, { geometry, program: glassProgram });

    ctn.appendChild(gl.canvas);

    this.renderer = renderer;
    this.program = program;
    this.mesh = mesh;
    this.glassProgram = glassProgram;
    this.glassMesh = glassMesh;
    this.renderTarget = renderTarget;

    this.resize();
  }

  private resize() {
    const ctn = this.containerRef().nativeElement;
    const renderer = this.renderer;
    const program = this.program;
    const glassProgram = this.glassProgram;
    const renderTarget = this.renderTarget;
    if (!renderer || !program || !glassProgram || !renderTarget) {
      return;
    }

    const width = Math.max(1, ctn.offsetWidth);
    const height = Math.max(1, ctn.offsetHeight);
    renderer.setSize(width, height);
    program.uniforms['uResolution'].value = [width, height];
    renderTarget.setSize(width, height);
    glassProgram.uniforms['uResolution'].value = [width, height];
  }

  /** Horizontal-only fit. Desktop (≥1024) is exact; smaller screens retarget start/end + closer spread. Never touches Y. */
  private horizontalFit() {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    if (w < 768) {
      return {
        xBias: 0.04,
        xScaleMul: 0.68,
        envX0: -0.85,
        envX1: 0.2,
        envX2: 0.35,
        envX3: 0.95,
        spread: this.spread() * 0.72,
      };
    }
    if (w < 1024) {
      return {
        xBias: 0.08,
        xScaleMul: 0.84,
        envX0: -1.0,
        envX1: 0.4,
        envX2: 0.65,
        envX3: 1.25,
        spread: this.spread() * 0.88,
      };
    }
    return {
      xBias: 0.12,
      xScaleMul: 1,
      envX0: -1.15,
      envX1: 0.55,
      envX2: 0.85,
      envX3: 1.55,
      spread: this.spread(),
    };
  }

  private draw(t: number) {
    const renderer = this.renderer;
    const program = this.program;
    const mesh = this.mesh;
    const glassProgram = this.glassProgram;
    const glassMesh = this.glassMesh;
    const renderTarget = this.renderTarget;
    if (!renderer || !program || !mesh || !glassProgram || !glassMesh || !renderTarget) {
      return;
    }

    const colors = this.colors();
    const fit = this.horizontalFit();
    program.uniforms['uTime'].value = t * 0.001;
    program.uniforms['uColors'].value = buildPalette(colors);
    program.uniforms['uColorCount'].value = Math.min(colors.length, MAX_COLORS);
    program.uniforms['uStrandCount'].value = Math.min(Math.max(Math.round(this.count()), 1), MAX_STRANDS);
    program.uniforms['uSpeed'].value = this.speed();
    program.uniforms['uAmplitude'].value = this.amplitude();
    program.uniforms['uWaviness'].value = this.waviness();
    program.uniforms['uThickness'].value = this.thickness();
    program.uniforms['uGlow'].value = this.glow();
    program.uniforms['uTaper'].value = this.taper();
    program.uniforms['uSpread'].value = fit.spread;
    program.uniforms['uHueShift'].value = this.hueShift();
    program.uniforms['uIntensity'].value = this.intensity();
    program.uniforms['uOpacity'].value = this.opacity();
    program.uniforms['uScale'].value = this.scale();
    program.uniforms['uSaturation'].value = this.saturation();
    program.uniforms['uYBias'].value = this.yBias();
    program.uniforms['uXBias'].value = fit.xBias;
    program.uniforms['uXScaleMul'].value = fit.xScaleMul;
    program.uniforms['uEnvX0'].value = fit.envX0;
    program.uniforms['uEnvX1'].value = fit.envX1;
    program.uniforms['uEnvX2'].value = fit.envX2;
    program.uniforms['uEnvX3'].value = fit.envX3;
    program.uniforms['uBeadDensity'].value = this.beadDensity();
    program.uniforms['uBeadSharp'].value = this.beadSharp();

    if (this.glass()) {
      renderer.render({ scene: mesh, target: renderTarget });
      glassProgram.uniforms['uScene'].value = renderTarget.texture;
      glassProgram.uniforms['uRefraction'].value = this.refraction();
      glassProgram.uniforms['uDispersion'].value = this.dispersion();
      glassProgram.uniforms['uRadius'].value = 0.46 * this.glassSize();
      renderer.render({ scene: glassMesh });
    } else {
      renderer.render({ scene: mesh });
    }
  }

  private teardownGl() {
    try {
      const ctn = this.containerRef().nativeElement;
      const gl = this.renderer?.gl;
      if (gl?.canvas && gl.canvas.parentNode === ctn) {
        ctn.removeChild(gl.canvas);
      }
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      // View may already be torn down
    }
    this.renderer = null;
    this.program = null;
    this.mesh = null;
    this.glassProgram = null;
    this.glassMesh = null;
    this.renderTarget = null;
    this.ready = false;
  }
}
