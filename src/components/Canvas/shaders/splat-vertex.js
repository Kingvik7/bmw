import noise from "./noise.js";

export default /* glsl */ `
${noise}
#include "gsplatCommonVS"
varying mediump vec2 gaussianUV;
varying mediump vec4 gaussianColor;

uniform float uTime;
uniform float uSwirlAmount;

#ifndef DITHER_NONE
    varying float id;
#endif

mediump vec4 discardVec = vec4(0.0, 0.0, 2.0, 1.0);

float fade(float radius, float len, float feather){
    float t = len / (radius + 0.0001); // normalize distance, avoid div by 0
    t = clamp(t, 0.0, 1.0);
    float easedT = t * (1.0 + sin(t * 3.141592) * 0.5); // custom easing
    return 1.0 - smoothstep(radius - feather, radius + feather, len * easedT);
}

vec2 transitionInSize(vec3 origin, vec3 center, SplatCorner corner, float speed, float startDelay){

    float firstPower = 1.25;     // base power for the first animation
    float secondPower = 1.25;    // transition curve for full fade animation
    float secondaryFadeDelay = 2.7;
    float pixelSize = 0.015;
    float fadeBlend = 0.05;

    float radius = (uTime - startDelay) * speed;
    float len = length(origin - center);

    // Initial particle transition (uses firstPower)
    vec2 sizeA = normalize(corner.offset) * fade(pow(radius, firstPower), len, fadeBlend) * pixelSize;

    // Secondary full transition (uses secondPower)
    radius = max(0.0, (uTime - startDelay - secondaryFadeDelay)) * speed;
    float fullFade = fade(pow(radius, secondPower), len, fadeBlend);
    vec2 sizeB = corner.offset * fullFade;
    
    // mix between the two
    return mix(sizeA, sizeB, fullFade);
}

vec3 swirl(vec3 pos, float amount) {
    float noiseScale = 5.0;
    float timeScale = 2.5;
    vec3 curlVelocity = BitangentNoise4D(vec4(pos * noiseScale, uTime * timeScale));

    // The noise returns a 3D vector you can treat as velocity or offset.
    return pos + (curlVelocity * 0.16 * amount);
}

void main(void) {
    // read gaussian details
    SplatSource source;
    if (!initSource(source)) {
        gl_Position = discardVec;
        return;
    }

    // Get the splat center
    vec3 modelCenter = readCenter(source);

    // Add some swirly motion
    modelCenter = swirl(modelCenter, uSwirlAmount);

    SplatCenter center;
    if (!initCenter(modelCenter, center)) {
        gl_Position = discardVec;
        return;
    }

    // project center to screen space
    SplatCorner corner;
    if (!initCorner(source, center, corner)) {
        gl_Position = discardVec;
        return;
    }

    // read color
    vec4 clr = readColor(source);

    // evaluate spherical harmonics
    #if SH_BANDS > 0
        // calculate the model-space view direction
        vec3 dir = normalize(center.view * mat3(center.modelView));
        clr.xyz += evalSH(source, dir);
    #endif

    clipCorner(corner, clr.w);

    // animate
    float speed = 0.75;
    float transitionDelay = 0.0;
    vec3 origin = vec3(-2.0);

    vec2 size = transitionInSize(origin, modelCenter, corner, speed, transitionDelay);

    // Make the splats smaller when swirling
    size = mix(size, normalize(corner.offset) * 0.08, uSwirlAmount); 

    // write output
    gl_Position = center.proj + vec4(size, 0, 0);
    gaussianUV = corner.uv;
    gaussianColor = vec4(prepareOutputFromGamma(max(clr.xyz, 0.0)), clr.w);

    #ifndef DITHER_NONE
        id = float(source.id);
    #endif
}
`;
