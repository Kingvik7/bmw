// AMD FidelityFX Contrast Adaptive Sharpening (CAS) with alpha preserved

precision mediump float;

uniform sampler2D uColorBuffer;
uniform float uSharpness;
uniform vec2 uScreenSize;

varying vec2 vUv0;

// sRGB to linear conversion
vec3 srgb2lin(vec3 color) {
  return color * color;
}

// Linear to sRGB conversion
vec3 lin2srgb(vec3 color) {
  return sqrt(color);
}

void main(void) {
  vec2 texelSize = 1.0 / uScreenSize;

  // Sample neighbors
  vec4 a = texture2D(uColorBuffer, vUv0 + vec2(0.0, -texelSize.y)); // top
  vec4 b = texture2D(uColorBuffer, vUv0 + vec2(-texelSize.x, 0.0)); // left
  vec4 c = texture2D(uColorBuffer, vUv0);                           // center
  vec4 d = texture2D(uColorBuffer, vUv0 + vec2(texelSize.x, 0.0));  // right
  vec4 e = texture2D(uColorBuffer, vUv0 + vec2(0.0, texelSize.y));  // bottom

  // Convert RGB to linear
  vec3 a_lin = srgb2lin(a.rgb);
  vec3 b_lin = srgb2lin(b.rgb);
  vec3 c_lin = srgb2lin(c.rgb);
  vec3 d_lin = srgb2lin(d.rgb);
  vec3 e_lin = srgb2lin(e.rgb);

  // Compute adaptive sharpening amount
  float min_g = min(a_lin.g, min(b_lin.g, min(c_lin.g, min(d_lin.g, e_lin.g))));
  float max_g = max(a_lin.g, max(b_lin.g, max(c_lin.g, max(d_lin.g, e_lin.g))));

  float sharpening_amount = sqrt(min(1.0 - max_g, min_g) / max_g);

  float w = sharpening_amount * mix(-0.125, -0.2, uSharpness);

  vec3 color_sharpened = (w * (a_lin + b_lin + d_lin + e_lin) + c_lin) / (4.0 * w + 1.0);

  // ✅ Preserve alpha from the center pixel
  // Prevent halos: only sharpen where alpha > 0.0
  float alpha = c.a;
  vec3 finalColor = mix(c.rgb, lin2srgb(color_sharpened), step(0.001, alpha));

  gl_FragColor = vec4(finalColor, alpha);
}
