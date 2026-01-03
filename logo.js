document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = "logo.png";
    document.getElementById("logo-canvas").appendChild(canvas);

    let particles = [];
    const threshold = 20;
    const maxDistSq = 10000;
    const speed = 1.2;
    const maxParticles = 5000; // Ліміт частинок для економії пам'яті

    let step = 5; // Initial step value
    let time = 0; // Time variable for animation

    img.onload = () => {
        canvas.width = 500;
        canvas.height = 500;

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 300;
        tempCanvas.height = 300;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(img, 0, 0, 300, 300);

        const imageData = tempCtx.getImageData(0, 0, 300, 300).data;

        function createParticles() {
            let tempParticles = [];
            for (let y = 0; y < 300; y += step) {
                for (let x = 0; x < 300; x += step) {
                    let index = (x + y * 300) * 4;
                    let brightness = (imageData[index] + imageData[index + 1] + imageData[index + 2]) / 3;

                    if (brightness < threshold) {
                        tempParticles.push(new Particle(x + 100, y + 100)); // Center the logo within the canvas
                    }
                }
            }
            particles = tempParticles.slice(0, maxParticles);
        }

        createParticles();
        requestAnimationFrame(draw);

        // Видаляємо тимчасовий canvas
        tempCanvas.remove();
    };

    // Placeholder if logo image fails to load
    img.onerror = () => {
        canvas.width = 500;
        canvas.height = 500;
        ctx.fillStyle = '#f3f3f3';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(40, 40);
        ctx.lineTo(canvas.width - 40, canvas.height - 40);
        ctx.moveTo(canvas.width - 40, 40);
        ctx.lineTo(40, canvas.height - 40);
        ctx.stroke();
        ctx.fillStyle = '#333';
        ctx.font = '20px Arial';
        ctx.fillText('Logo unavailable', 60, canvas.height / 2 - 10);
    };

    class Particle {
        constructor(x, y) {
            this.originX = x;
            this.originY = y;
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * speed;
            this.vy = (Math.random() - 0.5) * speed;
            this.noiseOffsetX = Math.random() * 1000;
            this.noiseOffsetY = Math.random() * 1000;
        }

        update(mouseX, mouseY) {
            let dx = mouseX - this.x;
            let dy = mouseY - this.y;
            let dSq = dx * dx + dy * dy;

            if (dSq < maxDistSq) {
                let angle = Math.atan2(dy, dx);
                this.vx -= Math.cos(angle) * 0.05; // Reduced influence of cursor
                this.vy -= Math.sin(angle) * 0.05; // Reduced influence of cursor
            }

            this.x += this.vx + (noise(this.noiseOffsetX + time) - 0.5) * 0.015; // Reduced noise influence
            this.y += this.vy + (noise(this.noiseOffsetY + time) - 0.5) * 0.015; // Reduced noise influence

            let dxO = this.originX - this.x;
            let dyO = this.originY - this.y;
            this.vx += dxO * 0.005; // Reduced return force
            this.vy += dyO * 0.005; // Reduced return force

            this.vx *= 0.95; // Increased damping
            this.vy *= 0.95; // Increased damping

            // Ensure particles stay within the canvas boundaries
            this.x = Math.max(0, Math.min(canvas.width, this.x));
            this.y = Math.max(0, Math.min(canvas.height, this.y));
        }

        show() {
            ctx.fillStyle = "black";
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update(mouseX, mouseY);
            p.show();
        });

        // Animate the step value
        time += 0.01;
        step = 8 + 7 * Math.sin(time); // Oscillate step between 8 and 15

        requestAnimationFrame(draw);
    }

    let mouseX = 0, mouseY = 0;
    document.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    // Simplex noise function for generating noise values
    function noise(x) {
        return Math.sin(x * 2.0 * Math.PI);
    }
});

// --- Shader background initialization ---
function initShaderBackground() {
    const bg = document.getElementById('shader-bg') || (() => {
        const c = document.createElement('canvas');
        c.id = 'shader-bg';
        document.body.appendChild(c);
        return c;
    })();

    const gl = bg.getContext('webgl') || bg.getContext('experimental-webgl');
    if (!gl) return;

    // canvas is visually behind content (pointer events handled on document)

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        bg.width = Math.floor(window.innerWidth * dpr);
        bg.height = Math.floor(window.innerHeight * dpr);
        bg.style.width = window.innerWidth + 'px';
        bg.style.height = window.innerHeight + 'px';
        gl.viewport(0, 0, bg.width, bg.height);
    }
    window.addEventListener('resize', resize);
    resize();

    const vertSrc = '\nattribute vec2 position;\nvarying vec2 vUv;\nvoid main(){ vUv = position * 0.5 + 0.5; gl_Position = vec4(position,0.,1.); }\n';

    const fragSrc = `
    precision mediump float;
    varying vec2 vUv;
    uniform float time;
    uniform vec2 resolution;

    const int MAX_BLOBS = 8;
    uniform vec2 blobPos[MAX_BLOBS];
    uniform vec3 blobColor[MAX_BLOBS];
    uniform float blobStart[MAX_BLOBS];
    uniform float blobActive[MAX_BLOBS];

    // simple pseudo-random
    float rand(vec2 co){ return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453); }

    // value noise
    float noise(vec2 p){
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = rand(i);
        float b = rand(i + vec2(1.0, 0.0));
        float c = rand(i + vec2(0.0, 1.0));
        float d = rand(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.6;
        for(int i=0;i<4;i++){
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
        }
        return v;
    }

    void main(){
        vec2 uv = vUv * resolution.xy / min(resolution.x, resolution.y);
        float t = time * 0.12;

        // three layers with different scales and offsets (softer blends)
        float l1 = smoothstep(0.25, 0.75, fbm(uv * 0.5 + vec2(t * 0.06, t * 0.03)));
        float l2 = smoothstep(0.25, 0.75, fbm(uv * 1.0 + vec2(-t * 0.08, t * 0.05)));
        float l3 = smoothstep(0.2, 0.8, fbm(uv * 1.6 + vec2(t * 0.12, -t * 0.03)));

        vec3 c1 = vec3(0.0, 1.0, 1.0); // cyan
        vec3 c2 = vec3(1.0, 0.0, 1.0); // magenta
        vec3 c3 = vec3(1.0, 1.0, 0.0); // yellow

        // reduce overall brightness to avoid too much white
        vec3 col = l1 * 0.45 * c1 + l2 * 0.4 * c2 + l3 * 0.35 * c3;

        // blobs
        for(int i=0;i<MAX_BLOBS;i++){
            if(blobActive[i] > 0.5){
                float age = time - blobStart[i];
                float life = 6.0;
                if(age >= 0.0 && age < life){
                    // convert normalized blob pos to uv space used above
                    vec2 bpos = blobPos[i] * resolution.xy / min(resolution.x, resolution.y);
                    float d = length(uv - bpos);
                    float fall = exp(-d * d * 30.0 * (1.0 - age / life * 0.6));
                    // add flow by sampling fbm around the blob
                    float wob = 0.5 + 0.5 * fbm((uv - bpos) * 2.0 + vec2(t * 0.3));
                    float intensity = fall * (1.0 - age / life) * wob;
                    col += blobColor[i] * intensity * 0.9;
                }
            }
        }

        float vign = smoothstep(0.8, 0.0, length((vUv - 0.5) * vec2(resolution.x/resolution.y,1.0)));
        col *= mix(0.95, 1.0, vign);

        // apply slight desaturation/darken to avoid blown-out whites
        col *= 0.85;
        col = pow(col, vec3(0.92));

        gl_FragColor = vec4(col, 1.0);
    }
    `;

    function compile(type, src){
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
            console.error('Shader compile error:', gl.getShaderInfoLog(s));
        }
        return s;
    }

    const v = compile(gl.VERTEX_SHADER, vertSrc);
    const f = compile(gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, v);
    gl.attachShader(prog, f);
    gl.bindAttribLocation(prog, 0, 'position');
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const posLoc = gl.getAttribLocation(prog, 'position');
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const verts = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(prog, 'time');
    const resLoc = gl.getUniformLocation(prog, 'resolution');

    // Blob uniforms setup
    const MAX_BLOBS = 8;
    const blobPosLoc = gl.getUniformLocation(prog, 'blobPos');
    const blobColorLoc = gl.getUniformLocation(prog, 'blobColor');
    const blobStartLoc = gl.getUniformLocation(prog, 'blobStart');
    const blobActiveLoc = gl.getUniformLocation(prog, 'blobActive');

    const blobPosArr = new Float32Array(2 * MAX_BLOBS);
    const blobColorArr = new Float32Array(3 * MAX_BLOBS);
    const blobStartArr = new Float32Array(MAX_BLOBS);
    const blobActiveArr = new Float32Array(MAX_BLOBS);
    let nextBlobIndex = 0;

    // Click handler on document: compute position relative to bg and add a blob
    document.addEventListener('click', (e) => {
        const rect = bg.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = 1.0 - (e.clientY - rect.top) / rect.height; // map to shader vUv (0..1, bottom->top)
        if (nx < 0 || nx > 1 || ny < 0 || ny > 1) {
            // click outside canvas area (e.g., over scrollbars) — still allow but clamp
        }
        const colors = [[0.0,1.0,1.0],[1.0,0.0,1.0],[1.0,1.0,0.0]]; // cyan, magenta, yellow
        const c = colors[Math.floor(Math.random() * colors.length)];
        const i = nextBlobIndex;
        blobPosArr[i * 2] = Math.max(0, Math.min(1, nx));
        blobPosArr[i * 2 + 1] = Math.max(0, Math.min(1, ny));
        blobColorArr[i * 3] = c[0];
        blobColorArr[i * 3 + 1] = c[1];
        blobColorArr[i * 3 + 2] = c[2];
        blobStartArr[i] = (performance.now() - start) / 1000;
        blobActiveArr[i] = 1.0;
        nextBlobIndex = (nextBlobIndex + 1) % MAX_BLOBS;
    });

    let start = performance.now();

    function render(){
        const now = performance.now();
        gl.uniform1f(timeLoc, (now - start) / 1000);
        gl.uniform2f(resLoc, bg.width, bg.height);
        // upload blob uniforms each frame
        if (blobPosLoc) gl.uniform2fv(blobPosLoc, blobPosArr);
        if (blobColorLoc) gl.uniform3fv(blobColorLoc, blobColorArr);
        if (blobStartLoc) gl.uniform1fv(blobStartLoc, blobStartArr);
        if (blobActiveLoc) gl.uniform1fv(blobActiveLoc, blobActiveArr);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

initShaderBackground();
