class HandTracker {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.lastDistance = 0;
        this.currentDistance = 0;
        this.distanceHistory = [];
        this.flapSpeed = 0;
        this.isFlapping = false;
        this.handDetected = false;
        this.landmarks = null;
        this.onFrame = null;
        this.ready = false;
    }

    async init() {
        try {
            const videoElement = document.getElementById('webcam');
            const canvasElement = document.getElementById('cameraCanvas');
            const canvasCtx = canvasElement.getContext('2d');

            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
                }
            });

            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults((results) => {
                this.processResults(results, canvasElement, canvasCtx);
            });

            this.camera = new Camera(videoElement, {
                onFrame: async () => {
                    await this.hands.send({ image: videoElement });
                },
                width: 320,
                height: 240
            });

            await this.camera.start();
            this.ready = true;
        } catch (err) {
            console.error('HandTracker init failed:', err);
        }
    }

    processResults(results, canvas, ctx) {
        canvas.width = 320;
        canvas.height = 240;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            this.handDetected = true;
            this.landmarks = results.multiHandLandmarks[0];

            // Draw hand skeleton on camera canvas
            drawConnectors(ctx, this.landmarks, HAND_CONNECTIONS, {
                color: '#00FF88',
                lineWidth: 2
            });
            drawLandmarks(ctx, this.landmarks, {
                color: '#FF4444',
                lineWidth: 1,
                radius: 3
            });

            // Highlight thumb tip and index tip
            const thumb = this.landmarks[4];
            const index = this.landmarks[8];

            ctx.beginPath();
            ctx.arc(thumb.x * canvas.width, thumb.y * canvas.height, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(index.x * canvas.width, index.y * canvas.height, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw line between thumb and index
            ctx.beginPath();
            ctx.moveTo(thumb.x * canvas.width, thumb.y * canvas.height);
            ctx.lineTo(index.x * canvas.width, index.y * canvas.height);
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Calculate distance
            const dx = thumb.x - index.x;
            const dy = thumb.y - index.y;
            const dz = (thumb.z || 0) - (index.z || 0);
            this.lastDistance = this.currentDistance;
            this.currentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            this.distanceHistory.push(this.currentDistance);
            if (this.distanceHistory.length > 6) {
                this.distanceHistory.shift();
            }

            this.calculateFlapSpeed();
        } else {
            this.handDetected = false;
            this.landmarks = null;
            this.flapSpeed = 0;
            this.isFlapping = false;
        }

        if (this.onFrame) {
            this.onFrame(this.getState());
        }
    }

    calculateFlapSpeed() {
        if (this.distanceHistory.length < 3) {
            this.flapSpeed = 0;
            this.isFlapping = false;
            return;
        }

        // Calculate rate of distance change over recent frames
        let totalChange = 0;
        for (let i = 1; i < this.distanceHistory.length; i++) {
            totalChange += this.distanceHistory[i] - this.distanceHistory[i - 1];
        }
        const avgChange = totalChange / (this.distanceHistory.length - 1);

        // Positive change means fingers spreading (flapping up)
        // Negative or near-zero means closing or stable (no flap)
        this.flapSpeed = Math.max(0, avgChange);

        // Threshold for considering it a flap
        this.isFlapping = this.flapSpeed > 0.005;

        // Boost if we see a clear open-close cycle
        const maxD = Math.max(...this.distanceHistory);
        const minD = Math.min(...this.distanceHistory);
        const range = maxD - minD;
        if (range > 0.06 && this.flapSpeed > 0.002) {
            this.flapSpeed *= 1.5;
            this.isFlapping = true;
        }
    }

    getState() {
        return {
            distance: this.currentDistance,
            flapSpeed: this.flapSpeed,
            isFlapping: this.isFlapping,
            handDetected: this.handDetected,
            normalizedIntensity: Math.min(1, this.flapSpeed / 0.05)
        };
    }
}
