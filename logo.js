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
