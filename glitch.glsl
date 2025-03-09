#ifdef GL_ES
precision mediump float;
precision mediump int;
#endif

uniform sampler2D texture;
uniform vec2 resolution;
uniform float time;
uniform float intensity;
uniform float waveFreq;
uniform float speed;

varying vec2 vTexCoord;

// Функція швидкого псевдовипадкового шуму
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    // Використовуємо шум лише для y-координати (менше розрахунків)
    float wave = sin(time * speed + uv.y * waveFreq) * intensity;

    // Градієнтний глітч замість різкого step
    float noise = random(vec2(time, uv.y));
    float glitch = mix(0.0, wave, smoothstep(0.7, 1.0, noise));

    // Отримання кольору з текстури
    vec4 color = texture2D(texture, uv + vec2(glitch, 0.0));

    gl_FragColor = color;
}
