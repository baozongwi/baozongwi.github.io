type ThemeMode = 'night' | 'midnight' | 'day' | 'sunny' | 'rain' | 'snow';
type RainLayer = 'far' | 'mid' | 'near';
type SpawnMode = 'viewport' | 'top';

type RainDrop = {
    alpha: number;
    length: number;
    lineWidth: number;
    layer: RainLayer;
    vx: number;
    vy: number;
    x: number;
    y: number;
};

class RainOverlay {
    private overlay: HTMLElement | null;
    private canvas: HTMLCanvasElement | null;
    private context: CanvasRenderingContext2D | null = null;
    private drops: RainDrop[] = [];
    private animationFrame: number | null = null;
    private lastFrameTime = 0;
    private isActive = false;
    private isPrepared = false;
    private viewportHeight = 0;
    private viewportWidth = 0;
    private reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    private handleReducedMotionChange = () => {
        if (!this.isActive) return;

        if (this.prefersReducedMotion()) {
            this.pause();
            this.renderStaticFrame();
            return;
        }

        this.start();
    };

    constructor() {
        this.overlay = document.querySelector<HTMLElement>('.site-rain-overlay');
        this.canvas = document.getElementById('site-rain-canvas') as HTMLCanvasElement | null;

        if (!this.overlay || !this.canvas) {
            return;
        }

        this.bindEvents();
        this.syncTheme(document.documentElement.dataset.themeMode as ThemeMode | undefined);
    }

    private bindEvents() {
        window.addEventListener('resize', () => {
            if (!this.isPrepared) return;

            this.resizeCanvas();

            if (this.isActive && this.prefersReducedMotion()) {
                this.renderStaticFrame();
            }
        });

        window.addEventListener('onThemeModeChange', event => {
            const mode = (event as CustomEvent<ThemeMode>).detail;
            this.syncTheme(mode);
        });

        document.addEventListener('visibilitychange', () => {
            if (!this.isActive) return;

            if (document.hidden) {
                this.pause();
                return;
            }

            if (this.prefersReducedMotion()) {
                this.renderStaticFrame();
                return;
            }

            this.start();
        });

        if ('addEventListener' in this.reducedMotionQuery) {
            this.reducedMotionQuery.addEventListener('change', this.handleReducedMotionChange);
        } else {
            this.reducedMotionQuery.addListener(this.handleReducedMotionChange);
        }

        window.addEventListener('beforeunload', () => {
            this.stop();
        });
    }

    private prefersReducedMotion() {
        return this.reducedMotionQuery.matches;
    }

    private prepare() {
        if (this.isPrepared) return;

        if (!this.canvas) return;

        this.context = this.canvas.getContext('2d');
        if (!this.context) return;

        this.isPrepared = true;
        this.resizeCanvas();
    }

    private syncTheme(mode?: ThemeMode) {
        const currentMode = document.body.classList.contains('links-page')
            ? (document.documentElement.dataset.linksMode as ThemeMode | undefined)
            : (mode ?? (document.documentElement.dataset.themeMode as ThemeMode | undefined));

        this.isActive = currentMode === 'rain';

        if (!this.isActive) {
            this.stop();
            return;
        }

        this.prepare();

        if (!this.isPrepared) return;

        if (this.prefersReducedMotion()) {
            this.pause();
            this.renderStaticFrame();
            return;
        }

        if (document.hidden) return;

        this.start();
    }

    private start() {
        if (!this.context || !this.canvas || this.animationFrame !== null) return;

        this.lastFrameTime = 0;
        this.animationFrame = window.requestAnimationFrame(time => this.render(time));
    }

    private pause() {
        if (this.animationFrame === null) return;

        window.cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
        this.lastFrameTime = 0;
    }

    private stop() {
        this.pause();
        this.clearCanvas();
    }

    private clearCanvas() {
        if (!this.context) return;

        this.context.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
    }

    private resizeCanvas() {
        if (!this.canvas || !this.context) return;

        const dpr = window.devicePixelRatio || 1;
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;

        this.canvas.width = this.viewportWidth * dpr;
        this.canvas.height = this.viewportHeight * dpr;
        this.canvas.style.width = `${this.viewportWidth}px`;
        this.canvas.style.height = `${this.viewportHeight}px`;
        this.context.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.buildDrops();
    }

    private buildDrops() {
        const area = this.viewportWidth * this.viewportHeight;
        const mobileDensity = this.viewportWidth < 768 ? 0.72 : 1;
        const motionDensity = this.prefersReducedMotion() ? 0.35 : 1;
        const scale = mobileDensity * motionDensity;

        const farCount = this.scaleDropCount(Math.round(area / 18000), 16, 116, scale);
        const midCount = this.scaleDropCount(Math.round(area / 27000), 12, 78, scale);
        const nearCount = this.scaleDropCount(Math.round(area / 62000), 6, 30, scale);

        this.drops = [
            ...Array.from({ length: farCount }, () => this.createDrop('far')),
            ...Array.from({ length: midCount }, () => this.createDrop('mid')),
            ...Array.from({ length: nearCount }, () => this.createDrop('near')),
        ];
    }

    private scaleDropCount(value: number, min: number, max: number, scale: number) {
        return Math.max(min, Math.min(max, Math.round(value * scale)));
    }

    private random(min: number, max: number) {
        return min + Math.random() * (max - min);
    }

    private createDrop(layer: RainLayer, spawnMode: SpawnMode = 'viewport'): RainDrop {
        const presets = {
            far: {
                alpha: [0.08, 0.16],
                length: [10, 18],
                speed: [540, 780],
                width: [0.6, 0.95],
            },
            mid: {
                alpha: [0.14, 0.24],
                length: [18, 30],
                speed: [820, 1180],
                width: [0.9, 1.4],
            },
            near: {
                alpha: [0.18, 0.32],
                length: [24, 42],
                speed: [1220, 1680],
                width: [1.2, 2.1],
            },
        } satisfies Record<RainLayer, {
            alpha: [number, number];
            length: [number, number];
            speed: [number, number];
            width: [number, number];
        }>;

        const config = presets[layer];
        const vy = this.random(config.speed[0], config.speed[1]);
        const vx = -vy * this.random(0.1, 0.17);
        const sidePadding = this.viewportWidth * 0.18;
        const topPadding = Math.max(180, this.viewportHeight * 0.38);

        return {
            alpha: this.random(config.alpha[0], config.alpha[1]),
            length: this.random(config.length[0], config.length[1]),
            lineWidth: this.random(config.width[0], config.width[1]),
            layer,
            vx,
            vy,
            x: this.random(-sidePadding, this.viewportWidth + sidePadding),
            y: spawnMode === 'top'
                ? this.random(-topPadding, -24)
                : this.random(-topPadding * 0.2, this.viewportHeight + 40),
        };
    }

    private renderStaticFrame() {
        this.paintDrops();
    }

    private render(time: number) {
        if (!this.isActive) {
            this.animationFrame = null;
            return;
        }

        const deltaSeconds = this.lastFrameTime === 0
            ? 1 / 60
            : Math.min(0.04, (time - this.lastFrameTime) / 1000);
        this.lastFrameTime = time;

        this.updateDrops(deltaSeconds);
        this.paintDrops();

        this.animationFrame = window.requestAnimationFrame(nextTime => this.render(nextTime));
    }

    private updateDrops(deltaSeconds: number) {
        const horizontalBounds = this.viewportWidth * 0.22;
        const verticalBounds = Math.max(120, this.viewportHeight * 0.12);

        this.drops = this.drops.map(drop => {
            const nextDrop = {
                ...drop,
                x: drop.x + drop.vx * deltaSeconds,
                y: drop.y + drop.vy * deltaSeconds,
            };

            const isOutOfViewport = nextDrop.y - nextDrop.length > this.viewportHeight + verticalBounds
                || nextDrop.x < -horizontalBounds
                || nextDrop.x > this.viewportWidth + horizontalBounds;

            return isOutOfViewport ? this.createDrop(drop.layer, 'top') : nextDrop;
        });
    }

    private paintDrops() {
        if (!this.context) return;

        this.clearCanvas();

        for (const drop of this.drops) {
            const magnitude = Math.hypot(drop.vx, drop.vy);
            const unitX = drop.vx / magnitude;
            const unitY = drop.vy / magnitude;
            const tailX = drop.x - unitX * drop.length;
            const tailY = drop.y - unitY * drop.length;

            this.context.save();
            this.context.globalAlpha = drop.alpha;
            this.context.lineWidth = drop.lineWidth;
            this.context.lineCap = 'round';
            this.context.strokeStyle = drop.layer === 'near'
                ? 'rgba(228, 237, 246, 0.95)'
                : (drop.layer === 'mid'
                    ? 'rgba(220, 231, 241, 0.9)'
                    : 'rgba(212, 225, 238, 0.76)');

            if (drop.layer === 'near') {
                this.context.shadowBlur = 4;
                this.context.shadowColor = 'rgba(231, 238, 246, 0.2)';
            } else if (drop.layer === 'mid') {
                this.context.shadowBlur = 2;
                this.context.shadowColor = 'rgba(226, 234, 243, 0.14)';
            }

            this.context.beginPath();
            this.context.moveTo(drop.x, drop.y);
            this.context.lineTo(tailX, tailY);
            this.context.stroke();
            this.context.restore();
        }
    }
}

export default RainOverlay;
