import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import { Uniform } from 'three'

// Full-screen glitch burst used for chapter transitions: horizontal bands tear sideways,
// RGB channels split, the odd band flips its colors. `amount` (0..1) is driven from outside
// and the pass reduces to a single texture fetch while it is 0.

const fragment = /* glsl */ `
uniform float uAmount;
uniform float uTime;

float gh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uAmount <= 0.001) {
    outputColor = inputColor;
    return;
  }
  float tick = floor(uTime * 24.0);
  float band = floor(uv.y * 16.0 + gh(vec2(tick, 3.0)) * 8.0);
  float on = step(1.0 - uAmount * 0.55, gh(vec2(band, tick)));

  // coarse band tear + fine slice jitter
  vec2 q = uv;
  q.x += (gh(vec2(tick, band)) - 0.5) * 0.14 * uAmount * on;
  q.x += (gh(vec2(floor(uv.y * 140.0), tick)) - 0.5) * 0.008 * uAmount;

  float split = 0.014 * uAmount * (0.4 + on);
  vec3 c = vec3(
    texture2D(inputBuffer, q + vec2(split, 0.0)).r,
    texture2D(inputBuffer, q).g,
    texture2D(inputBuffer, q - vec2(split, 0.0)).b
  );
  // a few bands flip channels and brighten, like a bad signal
  float flip = on * step(0.75, gh(vec2(band, tick + 1.0))) * uAmount;
  c = mix(c, vec3(c.b, c.r, c.g) * 1.4, flip);
  outputColor = vec4(min(c, vec3(24.0)), inputColor.a);
}
`

export class GlitchPulseEffect extends Effect {
  constructor() {
    super('GlitchPulseEffect', fragment, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([
        ['uAmount', new Uniform(0)],
        ['uTime', new Uniform(0)],
      ]),
    })
  }

  set amount(v: number) {
    this.uniforms.get('uAmount')!.value = v
  }

  set time(v: number) {
    this.uniforms.get('uTime')!.value = v
  }
}
