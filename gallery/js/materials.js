// One lighting model for the whole room. There are no three.js lights: every surface runs the same
// spot-lamp math below, so the art, wall, frame, text, floor and dust all answer to the same lamps.
import * as THREE from 'three';

export const LAMPS = 6; // art + text lamp for the 3 nearest bays
export const SHADOWS = 3;

export const shared = {
    uLampPos: { value: Array.from({ length: LAMPS }, () => new THREE.Vector3()) },
    uLampDir: { value: Array.from({ length: LAMPS }, () => new THREE.Vector3(0, -1, 0)) },
    uLampCone: { value: Array.from({ length: LAMPS }, () => new THREE.Vector3()) }, // cos inner, cos outer, power
    uLightColor: { value: new THREE.Color('#ffe2bd') },
    uAmbient: { value: 0.012 },
    uShadow: { value: Array.from({ length: SHADOWS }, () => new THREE.Vector4()) }, // cx, cy, half w, half h
    uTime: { value: 0 },
};

const LAMP_GLSL = /* glsl */`
    #define LAMPS ${LAMPS}
    uniform vec3 uLampPos[LAMPS];
    uniform vec3 uLampDir[LAMPS];
    uniform vec3 uLampCone[LAMPS];
    uniform vec3 uLightColor;
    uniform float uAmbient;

    // how much of a lamp's cone reaches this point, ignoring surface angle
    float lampReach(int i, vec3 P, out vec3 L, out float dist2) {
        vec3 toPoint = P - uLampPos[i];
        dist2 = dot(toPoint, toPoint);
        L = -toPoint / sqrt(dist2);
        float cone = smoothstep(uLampCone[i].y, uLampCone[i].x, dot(-L, uLampDir[i]));
        return cone * cone * uLampCone[i].z / dist2;
    }

    vec3 lampLight(vec3 P, vec3 N, vec3 V, float shine, float specAmount, out vec3 spec) {
        float diffuse = 0.0;
        float highlight = 0.0;
        for (int i = 0; i < LAMPS; i++) {
            if (uLampCone[i].z <= 0.0) continue;
            vec3 L; float dist2;
            float reach = lampReach(i, P, L, dist2);
            float ndl = max(dot(N, L), 0.0);
            diffuse += reach * ndl;
            if (specAmount > 0.0) {
                highlight += reach * pow(max(dot(N, normalize(L + V)), 0.0), shine);
            }
        }
        spec = uLightColor * highlight * specAmount;
        return uLightColor * diffuse;
    }
`;

const NOISE_GLSL = /* glsl */`
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
                   mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
    }
`;

// dark gradients band badly in 8 bits, so every surface ends with a little noise
const DITHER_GLSL = /* glsl */`
    gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) * (2.0 / 255.0);
`;

const SURFACE_VERT = /* glsl */`
    varying vec3 vP;
    varying vec3 vN;
    varying vec2 vUv;

    void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vP = world.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
    }
`;

const SURFACE_FRAG = /* glsl */`
    varying vec3 vP;
    varying vec3 vN;
    varying vec2 vUv;

    uniform vec3 uAlbedo;
    uniform float uShine;
    uniform float uSpec;
    uniform float uEmissive;
    uniform float uRelief;
    #if defined(ART) || defined(TEXT)
        uniform sampler2D uMap;
        uniform vec2 uTexel;
    #endif
    #ifdef WALL
        uniform vec4 uShadow[${SHADOWS}];
    #endif

    ${LAMP_GLSL}
    ${NOISE_GLSL}

    float sdBox(vec2 p, vec2 halfSize) {
        vec2 d = abs(p) - halfSize;
        return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    }

    float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

    void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vP);
        vec3 albedo = uAlbedo;
        float alpha = 1.0;
        float shade = 1.0;

        #ifdef ART
            albedo = texture2D(uMap, vUv).rgb;
            // read brightness as height, so paint catches the raking light when you step close
            if (uRelief > 0.0) {
                float h = luma(albedo);
                float hx = luma(texture2D(uMap, vUv + vec2(uTexel.x, 0.0)).rgb);
                float hy = luma(texture2D(uMap, vUv + vec2(0.0, uTexel.y)).rgb);
                N = normalize(N + vec3(h - hx, h - hy, 0.0) * uRelief);
            }
        #endif

        #ifdef TEXT
            alpha = texture2D(uMap, vUv).a;
            if (alpha < 0.004) discard;
        #endif

        #ifdef WALL
            albedo *= 0.95 + 0.1 * noise(vP.xy * 2.3) * noise(vP.xy * 9.0 + 4.0);
            N = normalize(N + vec3(noise(vP.xy * 60.0) - 0.5, noise(vP.yx * 60.0) - 0.5, 0.0) * 0.05);
            // lit from above, so each frame drops its shadow down the wall
            for (int i = 0; i < ${SHADOWS}; i++) {
                if (uShadow[i].z <= 0.0) continue;
                float d = sdBox(vP.xy - uShadow[i].xy + vec2(0.0, 0.055), uShadow[i].zw);
                shade *= 1.0 - 0.72 * smoothstep(0.12, -0.03, d);
            }
        #endif

        #ifdef FRAME
            albedo *= 0.8 + 0.4 * noise(vec2(vP.x * 70.0, vP.y * 70.0)) * noise(vP.xy * 9.0);
        #endif

        vec3 spec;
        vec3 light = lampLight(vP, N, V, uShine, uSpec, spec);
        vec3 color = albedo * (light * shade + uAmbient + uEmissive) + spec;

        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
        ${DITHER_GLSL}
    }
`;

function surface(define, { color = '#ffffff', shine = 30, spec = 0, emissive = 0, map = null, relief = 0 } = {})
{
    return new THREE.ShaderMaterial({
        vertexShader: SURFACE_VERT,
        fragmentShader: SURFACE_FRAG,
        defines: define ? { [define]: 1 } : {},
        transparent: define === 'TEXT',
        depthWrite: define !== 'TEXT',
        uniforms: {
            uAlbedo: { value: new THREE.Color(color) },
            uShine: { value: shine },
            uSpec: { value: spec },
            uEmissive: { value: emissive },
            uRelief: { value: relief },
            uMap: { value: map },
            uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
            uLampPos: shared.uLampPos,
            uLampDir: shared.uLampDir,
            uLampCone: shared.uLampCone,
            uLightColor: shared.uLightColor,
            uAmbient: shared.uAmbient,
            uShadow: shared.uShadow,
        },
    });
}

export const wallMaterial = (color) => surface('WALL', { color });
export const plainMaterial = (options) => surface(null, options);
export const frameMaterial = (options) => surface('FRAME', options);
export const textMaterial = (map, color) => surface('TEXT', { map, color });

export function artMaterial(texture, relief)
{
    const material = surface('ART', { map: texture, relief });
    setArtTexture(material, texture);
    return material;
}

export function setArtTexture(material, texture)
{
    const image = texture.image;
    material.uniforms.uMap.value = texture;
    material.uniforms.uTexel.value.set(1 / image.width, 1 / image.height);
}

// Polished concrete. Reflector renders the mirrored room for us; this smears it the way a real floor does.
export const floorShader = {
    name: 'GalleryFloor',
    uniforms: {
        color: { value: null },
        tDiffuse: { value: null },
        textureMatrix: { value: null },
        uFloor: { value: new THREE.Color('#2a211d') },
    },
    vertexShader: /* glsl */`
        uniform mat4 textureMatrix;
        varying vec4 vReflect;
        varying vec3 vP;

        void main() {
            vReflect = textureMatrix * vec4(position, 1.0);
            vec4 world = modelMatrix * vec4(position, 1.0);
            vP = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
        }
    `,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform vec3 uFloor;
        varying vec4 vReflect;
        varying vec3 vP;

        ${LAMP_GLSL}
        ${NOISE_GLSL}

        void main() {
            vec3 N = vec3(0.0, 1.0, 0.0);
            vec3 V = normalize(cameraPosition - vP);

            float mottle = noise(vP.xz * 1.1) * 0.6 + noise(vP.xz * 4.0) * 0.4;
            vec3 albedo = uFloor * (0.7 + 0.6 * mottle);

            // a vertical smear with a little per-pixel jitter reads as polish, not a mirror
            vec2 uv = vReflect.xy / vReflect.w;
            float angle = hash(gl_FragCoord.xy) * 6.2831;
            vec3 reflection = vec3(0.0);
            for (int i = 0; i < 8; i++) {
                float t = (float(i) + 0.5) / 8.0;
                float a = angle + float(i) * 2.399;
                reflection += texture2D(tDiffuse, uv + vec2(cos(a) * 0.006, sin(a) * 0.035) * sqrt(t)).rgb;
            }
            reflection /= 8.0;

            float fresnel = mix(0.22, 0.85, pow(1.0 - max(V.y, 0.0), 3.0));
            fresnel *= 0.75 + 0.5 * mottle;

            vec3 spec;
            vec3 light = lampLight(vP, N, V, 30.0, 0.0, spec);
            vec3 color = albedo * (light * 0.9 + uAmbient) + reflection * fresnel;

            gl_FragColor = vec4(color, 1.0);
            #include <colorspace_fragment>
            ${DITHER_GLSL}
        }
    `,
};

// the floor keeps its own cloned uniforms, so point it back at the shared lamps
export function shareLamps(material)
{
    for (const name of ['uLampPos', 'uLampDir', 'uLampCone', 'uLightColor', 'uAmbient']) {
        material.uniforms[name] = shared[name];
    }
}

// Dust only exists where a lamp's beam crosses it.
export function dustMaterial(pixelRatio)
{
    return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uLampPos: shared.uLampPos,
            uLampDir: shared.uLampDir,
            uLampCone: shared.uLampCone,
            uLightColor: shared.uLightColor,
            uAmbient: shared.uAmbient,
            uTime: shared.uTime,
            uCenterX: { value: 0 },
            uPixelRatio: { value: pixelRatio },
        },
        vertexShader: /* glsl */`
            uniform float uTime;
            uniform float uCenterX;
            uniform float uPixelRatio;
            attribute float aSeed;
            varying float vGlow;

            ${LAMP_GLSL}

            void main() {
                vec3 P = position;
                P.x += sin(uTime * 0.11 + aSeed * 6.0) * 0.25;
                P.y = mod(P.y + sin(uTime * 0.07 + aSeed * 9.0) * 0.3 + uTime * 0.012, 3.3);
                P.z += cos(uTime * 0.09 + aSeed * 4.0) * 0.2;
                P.x = uCenterX + mod(P.x - uCenterX + 7.0, 14.0) - 7.0; // the dust travels with you

                float glow = 0.0;
                for (int i = 0; i < LAMPS; i++) {
                    if (uLampCone[i].z <= 0.0) continue;
                    vec3 L; float dist2;
                    glow += lampReach(i, P, L, dist2);
                }
                vGlow = min(glow, 1.0);

                vec4 view = viewMatrix * vec4(P, 1.0);
                gl_Position = projectionMatrix * view;
                gl_PointSize = uPixelRatio * (1.0 + aSeed * 2.4) * (7.0 / -view.z);
            }
        `,
        fragmentShader: /* glsl */`
            uniform vec3 uLightColor;
            varying float vGlow;

            void main() {
                float d = length(gl_PointCoord - 0.5);
                float a = smoothstep(0.5, 0.05, d) * vGlow * 0.4;
                gl_FragColor = vec4(uLightColor * a, a);
                #include <colorspace_fragment>
            }
        `,
    });
}
