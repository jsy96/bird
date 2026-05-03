class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.W = 0;
        this.H = 0;
        this.time = 0;
        this.bgOffset = 0;
        this.groundOffset = 0;
        this.cloudOffset = 0;
        this.mountainOffset = 0;

        this.clouds = [];
        this.stars = [];
        this.obstacleTextures = {};
        this.particles = [];

        this.initClouds();
        this.initStars();
    }

    resize(w, h) {
        this.W = w;
        this.H = h;
        this.canvas.width = w;
        this.canvas.height = h;
        this.groundY = h * 0.85;
    }

    initClouds() {
        for (let i = 0; i < 12; i++) {
            this.clouds.push({
                x: Math.random() * 2000,
                y: 30 + Math.random() * 200,
                w: 60 + Math.random() * 120,
                h: 25 + Math.random() * 35,
                speed: 0.2 + Math.random() * 0.5,
                opacity: 0.15 + Math.random() * 0.25
            });
        }
    }

    initStars() {
        for (let i = 0; i < 50; i++) {
            this.stars.push({
                x: Math.random() * 2000,
                y: Math.random() * 300,
                size: 0.5 + Math.random() * 2,
                twinkle: Math.random() * Math.PI * 2
            });
        }
    }

    addParticle(x, y, type) {
        const count = type === 'score' ? 8 : 15;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6 - 2,
                life: 1,
                decay: 0.02 + Math.random() * 0.03,
                size: 2 + Math.random() * 4,
                color: type === 'score'
                    ? `hsl(${50 + Math.random() * 20}, 100%, ${60 + Math.random() * 30}%)`
                    : `hsl(${Math.random() * 40}, 100%, ${50 + Math.random() * 30}%)`
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }

    drawBackground(gameSpeed) {
        const ctx = this.ctx;
        const W = this.W;
        const H = this.H;

        // Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
        skyGrad.addColorStop(0, '#0a0a2e');
        skyGrad.addColorStop(0.3, '#1a1a4e');
        skyGrad.addColorStop(0.6, '#2d1b69');
        skyGrad.addColorStop(0.85, '#4a2080');
        skyGrad.addColorStop(1, '#6b3fa0');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, this.groundY);

        // Stars
        this.mountainOffset += gameSpeed * 0.3;
        this.stars.forEach(s => {
            const sx = ((s.x - this.mountainOffset * 0.05) % W + W) % W;
            const twinkle = Math.sin(this.time * 0.03 + s.twinkle) * 0.5 + 0.5;
            ctx.globalAlpha = twinkle * 0.7;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(sx, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Far mountains (parallax layer 1)
        this.drawMountains(ctx, W, 0.1, 'rgba(30, 20, 60, 0.8)', 0.15);

        // Mid mountains
        this.drawMountains(ctx, W, 0.3, 'rgba(40, 25, 70, 0.7)', 0.35);

        // Clouds (parallax layer 2)
        this.cloudOffset += gameSpeed * 0.8;
        this.clouds.forEach(c => {
            const cx = ((c.x - this.cloudOffset * c.speed) % (W + 300)) - 150;
            ctx.globalAlpha = c.opacity;
            ctx.fillStyle = 'rgba(200, 180, 255, 0.3)';
            this.drawCloudShape(ctx, cx, c.y, c.w, c.h);
        });
        ctx.globalAlpha = 1;
    }

    drawMountains(ctx, W, speedFactor, color, scale) {
        const y = this.groundY;
        const offset = this.mountainOffset * speedFactor;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= W; x += 3) {
            const nx = x + offset;
            const h = Math.sin(nx * 0.003) * 80 * scale
                + Math.sin(nx * 0.007 + 1) * 50 * scale
                + Math.sin(nx * 0.015 + 2) * 25 * scale;
            ctx.lineTo(x, y - 40 - h);
        }
        ctx.lineTo(W, y);
        ctx.closePath();
        ctx.fill();
    }

    drawCloudShape(ctx, x, y, w, h) {
        ctx.beginPath();
        ctx.ellipse(x, y, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x - w * 0.25, y + h * 0.1, w * 0.35, h * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + w * 0.3, y + h * 0.05, w * 0.3, h * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawGround(gameSpeed) {
        const ctx = this.ctx;
        const W = this.W;
        const H = this.H;
        const gy = this.groundY;

        this.groundOffset += gameSpeed;

        // Ground body with perspective
        const groundGrad = ctx.createLinearGradient(0, gy, 0, H);
        groundGrad.addColorStop(0, '#2d5a27');
        groundGrad.addColorStop(0.3, '#1a4a1a');
        groundGrad.addColorStop(1, '#0d2b0d');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, gy, W, H - gy);

        // Top edge - grass line
        ctx.fillStyle = '#4a8a3a';
        ctx.fillRect(0, gy, W, 4);
        ctx.fillStyle = '#3a7a2a';
        ctx.fillRect(0, gy + 4, W, 2);

        // Perspective grid lines
        const gridSpacing = 60;
        const offset = this.groundOffset % gridSpacing;
        ctx.strokeStyle = 'rgba(60, 120, 50, 0.25)';
        ctx.lineWidth = 1;

        for (let i = -1; i < W / gridSpacing + 2; i++) {
            const x = i * gridSpacing - offset;
            ctx.beginPath();
            ctx.moveTo(x, gy);
            ctx.lineTo(x + 15, H);
            ctx.stroke();
        }

        // Horizontal depth lines
        for (let d = 0; d < 4; d++) {
            const ly = gy + (H - gy) * (d / 4) + 5;
            ctx.beginPath();
            ctx.moveTo(0, ly);
            ctx.lineTo(W, ly);
            ctx.stroke();
        }
    }

    drawBird(bird) {
        const ctx = this.ctx;
        const { x, y, wingAngle, rotation } = bird;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Shadow
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(5, 5, 20, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Tail feathers
        ctx.fillStyle = '#cc6600';
        ctx.beginPath();
        ctx.moveTo(-15, -3);
        ctx.lineTo(-30, -10);
        ctx.lineTo(-28, 0);
        ctx.lineTo(-30, 10);
        ctx.lineTo(-15, 5);
        ctx.closePath();
        ctx.fill();

        // Body
        const bodyGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
        bodyGrad.addColorStop(0, '#ffcc00');
        bodyGrad.addColorStop(0.7, '#ff9900');
        bodyGrad.addColorStop(1, '#e67300');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 17, 0, 0, Math.PI * 2);
        ctx.fill();

        // Belly
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.ellipse(2, 5, 14, 10, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Wing (animated)
        ctx.save();
        ctx.translate(-2, -2);
        ctx.rotate(wingAngle * Math.PI / 180);
        const wingGrad = ctx.createLinearGradient(0, 0, -5, -30);
        wingGrad.addColorStop(0, '#ff9900');
        wingGrad.addColorStop(1, '#cc6600');
        ctx.fillStyle = wingGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-10, -25, 5, -30);
        ctx.quadraticCurveTo(12, -20, 8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Eye white
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(10, -5, 8, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye pupil
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.ellipse(12, -5, 4, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye highlight
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(13, -7, 2, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(18, -1);
        ctx.lineTo(30, 2);
        ctx.lineTo(18, 5);
        ctx.closePath();
        ctx.fill();

        // Beak line
        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(18, 2);
        ctx.lineTo(28, 2);
        ctx.stroke();

        // Cheek blush
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ff6666';
        ctx.beginPath();
        ctx.ellipse(6, 6, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    drawObstacle(obs) {
        const ctx = this.ctx;
        const { x, gapY, gapHeight, width, type } = obs;
        const W = this.W;

        // 2.5D perspective factor based on x position
        const perspective = 1 - (W - x) / W * 0.15;

        switch (type) {
            case 'stone': this.drawStonePillar(ctx, obs, perspective); break;
            case 'ice': this.drawIceCrystal(ctx, obs, perspective); break;
            case 'tree': this.drawTreeTrunk(ctx, obs, perspective); break;
            case 'fire': this.drawFirePillar(ctx, obs, perspective); break;
            case 'metal': this.drawMetalPipe(ctx, obs, perspective); break;
        }
    }

    drawStonePillar(ctx, obs, p) {
        const { x, gapY, gapHeight, width } = obs;
        const topH = gapY - gapHeight / 2;
        const botY = gapY + gapHeight / 2;
        const botH = this.groundY - botY;
        const depth = 12 * p;

        // Top pillar
        if (topH > 0) {
            // Side face
            ctx.fillStyle = '#5a5a6a';
            ctx.fillRect(x + width - 2, 0, depth, topH);
            // Main face
            const grad1 = ctx.createLinearGradient(x, 0, x + width, 0);
            grad1.addColorStop(0, '#8a8a9a');
            grad1.addColorStop(0.5, '#7a7a8a');
            grad1.addColorStop(1, '#6a6a7a');
            ctx.fillStyle = grad1;
            ctx.fillRect(x, 0, width, topH);
            // Stone texture lines
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;
            for (let ly = 20; ly < topH; ly += 30) {
                ctx.beginPath();
                ctx.moveTo(x, ly);
                ctx.lineTo(x + width, ly);
                ctx.stroke();
            }
            // Bottom cap
            ctx.fillStyle = '#9a9aaa';
            ctx.fillRect(x - 4, topH - 12, width + 8, 12);
            ctx.fillStyle = '#7a7a8a';
            ctx.fillRect(x - 4, topH - 12, width + 8, 3);
        }

        // Bottom pillar
        if (botH > 0) {
            ctx.fillStyle = '#5a5a6a';
            ctx.fillRect(x + width - 2, botY, depth, botH);
            const grad2 = ctx.createLinearGradient(x, botY, x + width, botY);
            grad2.addColorStop(0, '#8a8a9a');
            grad2.addColorStop(0.5, '#7a7a8a');
            grad2.addColorStop(1, '#6a6a7a');
            ctx.fillStyle = grad2;
            ctx.fillRect(x, botY, width, botH);
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;
            for (let ly = botY + 20; ly < botY + botH; ly += 30) {
                ctx.beginPath();
                ctx.moveTo(x, ly);
                ctx.lineTo(x + width, ly);
                ctx.stroke();
            }
            // Top cap
            ctx.fillStyle = '#9a9aaa';
            ctx.fillRect(x - 4, botY, width + 8, 12);
            ctx.fillStyle = '#7a7a8a';
            ctx.fillRect(x - 4, botY, width + 8, 3);
        }
    }

    drawIceCrystal(ctx, obs, p) {
        const { x, gapY, gapHeight, width } = obs;
        const topH = gapY - gapHeight / 2;
        const botY = gapY + gapHeight / 2;
        const botH = this.groundY - botY;
        const depth = 10 * p;
        const cx = x + width / 2;

        // Top crystal
        if (topH > 0) {
            ctx.globalAlpha = 0.8;
            const grad = ctx.createLinearGradient(x, 0, x + width, 0);
            grad.addColorStop(0, '#88ccff');
            grad.addColorStop(0.5, '#aaeeff');
            grad.addColorStop(1, '#66aadd');

            // Icicle shape
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + width, 0);
            ctx.lineTo(cx + 10, topH);
            ctx.lineTo(cx, topH + 20);
            ctx.lineTo(cx - 10, topH);
            ctx.closePath();
            ctx.fill();

            // Side face
            ctx.fillStyle = 'rgba(100,180,240,0.5)';
            ctx.fillRect(x + width - 3, 0, depth, topH);

            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.moveTo(x + 5, 0);
            ctx.lineTo(x + 15, 0);
            ctx.lineTo(cx, topH);
            ctx.closePath();
            ctx.fill();

            ctx.globalAlpha = 1;
        }

        // Bottom crystal
        if (botH > 0) {
            ctx.globalAlpha = 0.8;
            const grad = ctx.createLinearGradient(x, botY, x + width, botY);
            grad.addColorStop(0, '#88ccff');
            grad.addColorStop(0.5, '#aaeeff');
            grad.addColorStop(1, '#66aadd');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(cx - 10, botY);
            ctx.moveTo(cx - 15, botY);
            ctx.lineTo(cx + 15, botY);
            ctx.lineTo(x + width, botY + botH);
            ctx.lineTo(x, botY + botH);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(100,180,240,0.5)';
            ctx.fillRect(x + width - 3, botY, depth, botH);

            // Crystal tip
            ctx.fillStyle = 'rgba(200,240,255,0.6)';
            ctx.beginPath();
            ctx.moveTo(cx - 8, botY);
            ctx.lineTo(cx + 8, botY);
            ctx.lineTo(cx, botY - 15);
            ctx.closePath();
            ctx.fill();

            ctx.globalAlpha = 1;
        }
    }

    drawTreeTrunk(ctx, obs, p) {
        const { x, gapY, gapHeight, width } = obs;
        const topH = gapY - gapHeight / 2;
        const botY = gapY + gapHeight / 2;
        const botH = this.groundY - botY;
        const depth = 14 * p;

        // Top trunk
        if (topH > 0) {
            ctx.fillStyle = '#5a3a20';
            ctx.fillRect(x + width - 2, 0, depth, topH);

            const grad = ctx.createLinearGradient(x, 0, x + width, 0);
            grad.addColorStop(0, '#8B6914');
            grad.addColorStop(0.3, '#7a5a2a');
            grad.addColorStop(0.7, '#6a4a1a');
            grad.addColorStop(1, '#5a3a10');
            ctx.fillStyle = grad;
            ctx.fillRect(x, 0, width, topH);

            // Bark texture
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            for (let ly = 10; ly < topH; ly += 15) {
                const bx = x + 5 + Math.sin(ly * 0.3) * 5;
                ctx.beginPath();
                ctx.moveTo(bx, ly);
                ctx.quadraticCurveTo(bx + 8, ly + 5, bx + 3, ly + 12);
                ctx.stroke();
            }

            // Knot
            ctx.fillStyle = '#4a2a10';
            ctx.beginPath();
            ctx.ellipse(x + width * 0.4, topH * 0.6, 6, 8, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Bottom cap with leaves
            ctx.fillStyle = '#3a7a2a';
            ctx.beginPath();
            ctx.ellipse(x + width / 2, topH, width * 0.8, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2a6a1a';
            ctx.beginPath();
            ctx.ellipse(x + width / 2 + 5, topH - 3, width * 0.6, 12, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Bottom trunk
        if (botH > 0) {
            ctx.fillStyle = '#5a3a20';
            ctx.fillRect(x + width - 2, botY, depth, botH);

            const grad = ctx.createLinearGradient(x, botY, x + width, botY);
            grad.addColorStop(0, '#8B6914');
            grad.addColorStop(0.3, '#7a5a2a');
            grad.addColorStop(0.7, '#6a4a1a');
            grad.addColorStop(1, '#5a3a10');
            ctx.fillStyle = grad;
            ctx.fillRect(x, botY, width, botH);

            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            for (let ly = botY + 10; ly < botY + botH; ly += 15) {
                const bx = x + 5 + Math.sin(ly * 0.3) * 5;
                ctx.beginPath();
                ctx.moveTo(bx, ly);
                ctx.quadraticCurveTo(bx + 8, ly + 5, bx + 3, ly + 12);
                ctx.stroke();
            }

            // Top cap with leaves
            ctx.fillStyle = '#3a7a2a';
            ctx.beginPath();
            ctx.ellipse(x + width / 2, botY, width * 0.8, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2a6a1a';
            ctx.beginPath();
            ctx.ellipse(x + width / 2 - 5, botY + 3, width * 0.6, 12, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawFirePillar(ctx, obs, p) {
        const { x, gapY, gapHeight, width } = obs;
        const topH = gapY - gapHeight / 2;
        const botY = gapY + gapHeight / 2;
        const botH = this.groundY - botY;

        // Top pillar
        if (topH > 0) {
            const grad = ctx.createLinearGradient(x, 0, x, topH);
            grad.addColorStop(0, '#cc2200');
            grad.addColorStop(0.5, '#ff4400');
            grad.addColorStop(1, '#ff6600');
            ctx.fillStyle = grad;
            ctx.fillRect(x, 0, width, topH);

            // Side glow
            ctx.fillStyle = 'rgba(255,100,0,0.4)';
            ctx.fillRect(x + width, 0, 8 * p, topH);

            // Lava cracks
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            for (let ly = 20; ly < topH; ly += 40) {
                ctx.beginPath();
                ctx.moveTo(x + 5, ly);
                ctx.quadraticCurveTo(x + width / 2, ly + 10 + Math.sin(this.time * 0.05 + ly) * 5, x + width - 5, ly + 5);
                ctx.stroke();
            }

            // Flame particles at bottom
            for (let i = 0; i < 5; i++) {
                const fx = x + Math.random() * width;
                const fy = topH - Math.random() * 20;
                const fs = 3 + Math.random() * 8;
                ctx.globalAlpha = 0.5 + Math.random() * 0.5;
                ctx.fillStyle = `hsl(${20 + Math.random() * 30}, 100%, ${50 + Math.random() * 30}%)`;
                ctx.beginPath();
                ctx.ellipse(fx, fy, fs, fs * 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // Bottom pillar
        if (botH > 0) {
            const grad = ctx.createLinearGradient(x, botY, x, this.groundY);
            grad.addColorStop(0, '#ff6600');
            grad.addColorStop(0.5, '#ff4400');
            grad.addColorStop(1, '#cc2200');
            ctx.fillStyle = grad;
            ctx.fillRect(x, botY, width, botH);

            ctx.fillStyle = 'rgba(255,100,0,0.4)';
            ctx.fillRect(x + width, botY, 8 * p, botH);

            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            for (let ly = botY + 20; ly < botY + botH; ly += 40) {
                ctx.beginPath();
                ctx.moveTo(x + 5, ly);
                ctx.quadraticCurveTo(x + width / 2, ly + 10 + Math.sin(this.time * 0.05 + ly) * 5, x + width - 5, ly + 5);
                ctx.stroke();
            }

            for (let i = 0; i < 5; i++) {
                const fx = x + Math.random() * width;
                const fy = botY + Math.random() * 20;
                const fs = 3 + Math.random() * 8;
                ctx.globalAlpha = 0.5 + Math.random() * 0.5;
                ctx.fillStyle = `hsl(${20 + Math.random() * 30}, 100%, ${50 + Math.random() * 30}%)`;
                ctx.beginPath();
                ctx.ellipse(fx, fy, fs, fs * 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }

    drawMetalPipe(ctx, obs, p) {
        const { x, gapY, gapHeight, width } = obs;
        const topH = gapY - gapHeight / 2;
        const botY = gapY + gapHeight / 2;
        const botH = this.groundY - botY;
        const depth = 16 * p;

        // Top pipe
        if (topH > 0) {
            // Side face
            ctx.fillStyle = '#8a8a8a';
            ctx.fillRect(x + width, 0, depth, topH);

            // Main body
            const grad = ctx.createLinearGradient(x, 0, x + width, 0);
            grad.addColorStop(0, '#c0c0c0');
            grad.addColorStop(0.3, '#e0e0e0');
            grad.addColorStop(0.7, '#b0b0b0');
            grad.addColorStop(1, '#909090');
            ctx.fillStyle = grad;
            ctx.fillRect(x, 0, width, topH);

            // Rivets
            ctx.fillStyle = '#707070';
            for (let ry = 20; ry < topH; ry += 50) {
                ctx.beginPath();
                ctx.arc(x + 8, ry, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x + width - 8, ry, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Bottom flange
            ctx.fillStyle = '#a0a0a0';
            ctx.fillRect(x - 6, topH - 16, width + 12, 16);
            ctx.fillStyle = '#d0d0d0';
            ctx.fillRect(x - 6, topH - 16, width + 12, 4);
            ctx.fillStyle = '#808080';
            ctx.fillRect(x - 6, topH - 4, width + 12, 4);
        }

        // Bottom pipe
        if (botH > 0) {
            ctx.fillStyle = '#8a8a8a';
            ctx.fillRect(x + width, botY, depth, botH);

            const grad = ctx.createLinearGradient(x, botY, x + width, botY);
            grad.addColorStop(0, '#c0c0c0');
            grad.addColorStop(0.3, '#e0e0e0');
            grad.addColorStop(0.7, '#b0b0b0');
            grad.addColorStop(1, '#909090');
            ctx.fillStyle = grad;
            ctx.fillRect(x, botY, width, botH);

            ctx.fillStyle = '#707070';
            for (let ry = botY + 20; ry < botY + botH; ry += 50) {
                ctx.beginPath();
                ctx.arc(x + 8, ry, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x + width - 8, ry, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Top flange
            ctx.fillStyle = '#a0a0a0';
            ctx.fillRect(x - 6, botY, width + 12, 16);
            ctx.fillStyle = '#d0d0d0';
            ctx.fillRect(x - 6, botY, width + 12, 4);
            ctx.fillStyle = '#808080';
            ctx.fillRect(x - 6, botY + 12, width + 12, 4);
        }
    }

    drawObstacles(obstacles) {
        // Sort by x for proper layering
        obstacles.forEach(obs => this.drawObstacle(obs));
    }

    drawUI(score, gameState, handState) {
        const ctx = this.ctx;

        // Vignette effect
        const vignette = ctx.createRadialGradient(
            this.W / 2, this.H / 2, this.W * 0.3,
            this.W / 2, this.H / 2, this.W * 0.8
        );
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, this.W, this.H);

        // Flash effect on game over
        if (gameState === 'GAME_OVER' && this.gameOverFlash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${this.gameOverFlash})`;
            ctx.fillRect(0, 0, this.W, this.H);
            this.gameOverFlash -= 0.05;
        }
    }

    render(bird, obstacles, gameSpeed, score, gameState, handState) {
        this.time++;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, this.W, this.H);

        this.drawBackground(gameSpeed);
        this.drawObstacles(obstacles);
        this.drawBird(bird);
        this.drawGround(gameSpeed);
        this.updateParticles();
        this.drawParticles();
        this.drawUI(score, gameState, handState);
    }
}
