type ThemeMode = 'night' | 'midnight' | 'day' | 'rain' | 'snow';

type Star = {
    x: number;
    y: number;
    radius: number;
    alpha: number;
    phase: number;
    speed: number;
    glow: number;
    color: string;
};

type MoonSurfaceTone = 'lit' | 'shadow';

type MoonSurfacePalette = {
    center: string;
    middle: string;
    edge: string;
    maria: string;
    crater: string;
    craterRim: string;
    hazeStart: string;
    hazeMiddle: string;
    hazeEnd: string;
};

class MoonOverlay {
    private overlay: HTMLElement | null;
    private moonCanvas: HTMLCanvasElement | null;
    private starsCanvas: HTMLCanvasElement | null;
    private starsContext: CanvasRenderingContext2D | null = null;
    private stars: Star[] = [];
    private animationFrame: number | null = null;
    private phaseRefreshTimer: number | null = null;
    private isActive = false;
    private isPrepared = false;

    constructor() {
        this.overlay = document.querySelector<HTMLElement>('.site-moon-overlay');
        this.moonCanvas = document.getElementById('site-moon-canvas') as HTMLCanvasElement | null;
        this.starsCanvas = document.getElementById('site-stars-canvas') as HTMLCanvasElement | null;

        if (!this.overlay || !this.moonCanvas || !this.starsCanvas) {
            return;
        }

        this.bindEvents();
        this.syncTheme(document.documentElement.dataset.themeMode as ThemeMode | undefined);
    }

    private bindEvents() {
        window.addEventListener('resize', () => {
            if (!this.isActive) return;

            this.drawMoon();
            this.resizeStars();
            this.schedulePhaseRefresh();
        });

        window.addEventListener('onThemeModeChange', event => {
            const mode = (event as CustomEvent<ThemeMode>).detail;
            this.syncTheme(mode);
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden || !this.isActive) return;

            this.drawMoon();
            this.schedulePhaseRefresh();
        });

        window.addEventListener('beforeunload', () => {
            this.stopStars();
            this.stopPhaseRefresh();
        });
    }

    private prepare() {
        if (this.isPrepared) return;

        if (!this.starsCanvas) return;

        this.starsContext = this.starsCanvas.getContext('2d');
        if (!this.starsContext) return;

        this.isPrepared = true;
        this.drawMoon();
        this.resizeStars();
        this.schedulePhaseRefresh();
    }

    private syncTheme(mode?: ThemeMode) {
        const currentMode = document.body.classList.contains('links-page')
            ? (document.documentElement.dataset.linksMode as ThemeMode | undefined)
            : (mode ?? (document.documentElement.dataset.themeMode as ThemeMode | undefined));
        const shouldActivate = currentMode === 'midnight';
        this.isActive = shouldActivate;

        if (shouldActivate) {
            this.prepare();
            this.drawMoon();
            this.startStars();
            return;
        }

        this.stopStars();
        this.stopPhaseRefresh();
    }

    private startStars() {
        if (this.animationFrame !== null || !this.starsContext || !this.starsCanvas) return;
        this.renderStars(0);
    }

    private stopStars() {
        if (this.animationFrame !== null) {
            window.cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        if (!this.starsContext || !this.starsCanvas) return;

        this.starsContext.clearRect(0, 0, this.starsCanvas.width, this.starsCanvas.height);
    }

    private resizeStars() {
        if (!this.starsCanvas || !this.starsContext) return;

        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.starsCanvas.width = width * dpr;
        this.starsCanvas.height = height * dpr;
        this.starsCanvas.style.width = `${width}px`;
        this.starsCanvas.style.height = `${height}px`;
        this.starsContext.setTransform(dpr, 0, 0, dpr, 0, 0);

        const starCount = Math.max(72, Math.min(156, Math.round((width * height) / 18000)));
        const palette = [
            'rgba(220, 228, 240, 1)',
            'rgba(255, 245, 222, 1)',
            'rgba(192, 214, 250, 1)',
            'rgba(243, 222, 198, 1)',
        ];

        this.stars = Array.from({ length: starCount }, (_, index) => {
            const seed = index + 1;
            const rand = (offset: number) => {
                const value = Math.sin(seed * 127.1 + offset * 311.7) * 43758.5453123;
                return value - Math.floor(value);
            };

            const bright = rand(1) > 0.88;

            return {
                x: rand(2) * width,
                y: rand(3) * height * 0.72,
                radius: bright ? 1.5 + rand(4) * 1.6 : 0.45 + rand(4) * 0.95,
                alpha: bright ? 0.46 + rand(5) * 0.3 : 0.12 + rand(5) * 0.22,
                phase: rand(6) * Math.PI * 2,
                speed: 0.24 + rand(7) * 0.9,
                glow: bright ? 7 + rand(8) * 10 : 0,
                color: palette[Math.floor(rand(9) * palette.length)],
            };
        });
    }

    private renderStars(time: number) {
        if (!this.isActive || !this.starsContext || !this.starsCanvas) {
            this.animationFrame = null;
            return;
        }

        const width = this.starsCanvas.width / (window.devicePixelRatio || 1);
        const height = this.starsCanvas.height / (window.devicePixelRatio || 1);
        const t = time * 0.001;

        this.starsContext.clearRect(0, 0, width, height);

        for (const star of this.stars) {
            const flicker = Math.sin(star.phase + t * star.speed);
            const shimmer = Math.sin(star.phase * 1.9 + t * (star.speed * 2.1)) * 0.35;
            const alpha = Math.max(0.04, star.alpha + flicker * 0.08 + shimmer * 0.04);

            this.starsContext.save();
            this.starsContext.globalAlpha = alpha;
            this.starsContext.fillStyle = star.color;
            if (star.glow > 0) {
                this.starsContext.shadowBlur = star.glow;
                this.starsContext.shadowColor = star.color;
            }
            this.starsContext.beginPath();
            this.starsContext.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            this.starsContext.fill();
            this.starsContext.restore();
        }

        this.animationFrame = window.requestAnimationFrame(nextTime => this.renderStars(nextTime));
    }

    private getMoonPhase() {
        const lunarDay = this.getChineseLunarDay();
        if (lunarDay !== null) {
            const phase = lunarDay <= 15
                ? ((lunarDay - 1) / 14) * 0.5
                : 0.5 + ((lunarDay - 15) / 15) * 0.5;
            const illumination = 0.5 * (1 - Math.cos(phase * Math.PI * 2));

            return {
                phase,
                illumination,
            };
        }

        const synodicMonth = 29.530588853;
        const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
        const now = Date.now();
        const daysSinceNewMoon = (now - knownNewMoon) / 86400000;
        const lunarAge = ((daysSinceNewMoon % synodicMonth) + synodicMonth) % synodicMonth;
        const phase = lunarAge / synodicMonth;
        const illumination = 0.5 * (1 - Math.cos(phase * Math.PI * 2));

        return {
            phase,
            illumination,
        };
    }

    private getChineseLunarDay() {
        try {
            const formatter = new Intl.DateTimeFormat('zh-Hans-u-ca-chinese', {
                day: 'numeric',
            });
            const lunarDayValue = formatter.formatToParts(new Date()).find(part => part.type === 'day')?.value;
            const lunarDay = Number.parseInt(lunarDayValue ?? '', 10);

            if (Number.isInteger(lunarDay) && lunarDay >= 1 && lunarDay <= 30) {
                return lunarDay;
            }
        } catch (error) {
            return null;
        }

        return null;
    }

    private getMoonTilt(phase: number) {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
        const localHour = now.getHours() + now.getMinutes() / 60;

        const seasonalTilt = Math.sin((dayOfYear / 365.2422) * Math.PI * 2 - Math.PI / 3) * 18;
        const hourlyTilt = Math.sin(((localHour - 21) / 24) * Math.PI * 2) * 6;
        const lunationTilt = Math.sin(phase * Math.PI * 2 - Math.PI / 2) * 7;
        const waxingBias = phase <= 0.5 ? -4 : 4;

        const totalTilt = Math.max(-28, Math.min(28, seasonalTilt + hourlyTilt + lunationTilt + waxingBias));
        return (totalTilt * Math.PI) / 180;
    }

    private schedulePhaseRefresh() {
        if (!this.isActive) return;

        this.stopPhaseRefresh();

        const now = new Date();
        const nextRefresh = new Date(now);
        nextRefresh.setHours(24, 5, 0, 0);

        this.phaseRefreshTimer = window.setTimeout(() => {
            if (!this.isActive) return;

            this.drawMoon();
            this.schedulePhaseRefresh();
        }, Math.max(1000, nextRefresh.getTime() - now.getTime()));
    }

    private stopPhaseRefresh() {
        if (this.phaseRefreshTimer === null) return;

        window.clearTimeout(this.phaseRefreshTimer);
        this.phaseRefreshTimer = null;
    }

    private clipMoonDisc(context: CanvasRenderingContext2D, radius: number) {
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.clip();
    }

    private sampleNoise(seedA: number, seedB: number, offset: number) {
        const value = Math.sin(seedA * 12.9898 + seedB * 78.233 + offset * 37.719) * 43758.5453123;
        return value - Math.floor(value);
    }

    private paintSurfaceGranulation(
        context: CanvasRenderingContext2D,
        radius: number,
        tone: MoonSurfaceTone,
        palette: MoonSurfacePalette
    ) {
        const darkPassCount = tone === 'lit' ? 96 : 78;
        const lightPassCount = tone === 'lit' ? 42 : 28;
        const darkBaseAlpha = tone === 'lit' ? 0.045 : 0.068;
        const lightBaseAlpha = tone === 'lit' ? 0.018 : 0.024;

        for (let index = 0; index < darkPassCount; index += 1) {
            const angle = this.sampleNoise(index, 2.1, 11.7) * Math.PI * 2;
            const distance = Math.sqrt(this.sampleNoise(index, 5.4, 23.1)) * radius * 0.97;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const rx = radius * (0.012 + this.sampleNoise(index, 9.2, 17.4) * 0.03);
            const ry = rx * (0.5 + this.sampleNoise(index, 13.6, 19.9) * 1.1);
            const rotation = this.sampleNoise(index, 7.7, 29.3) * Math.PI;
            const alpha = darkBaseAlpha
                * (0.48 + this.sampleNoise(index, 14.8, 31.7))
                * (1 - distance / (radius * 1.15));

            context.save();
            context.filter = `blur(${1.2 + this.sampleNoise(index, 18.2, 7.3) * 3.6}px)`;
            context.globalCompositeOperation = 'multiply';
            context.fillStyle = `rgba(${palette.crater}, ${Math.max(0.008, alpha)})`;
            context.beginPath();
            context.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
            context.fill();
            context.restore();
        }

        for (let index = 0; index < lightPassCount; index += 1) {
            const angle = this.sampleNoise(index, 4.9, 41.5) * Math.PI * 2;
            const distance = Math.sqrt(this.sampleNoise(index, 8.3, 53.9)) * radius * 0.95;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const size = radius * (0.004 + this.sampleNoise(index, 12.4, 67.1) * 0.011);
            const alpha = lightBaseAlpha
                * (0.45 + this.sampleNoise(index, 15.2, 79.8))
                * (1 - distance / (radius * 1.12));

            context.save();
            context.filter = `blur(${0.3 + this.sampleNoise(index, 20.1, 83.3) * 1.8}px)`;
            context.globalCompositeOperation = tone === 'lit' ? 'screen' : 'lighter';
            context.fillStyle = `rgba(${palette.craterRim}, ${Math.max(0.006, alpha)})`;
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
            context.restore();
        }
    }

    private paintMoonSurface(
        context: CanvasRenderingContext2D,
        radius: number,
        tone: MoonSurfaceTone,
        opacity = 1
    ) {
        const palette: MoonSurfacePalette = tone === 'lit'
            ? {
                center: '#fbf7ef',
                middle: '#e7dfd2',
                edge: '#bbae9d',
                maria: '132, 124, 114',
                crater: '118, 110, 100',
                craterRim: '255, 248, 236',
                hazeStart: 'rgba(255, 255, 255, 0.24)',
                hazeMiddle: 'rgba(255, 255, 255, 0.02)',
                hazeEnd: 'rgba(58, 54, 51, 0.16)',
            }
            : {
                center: '#6c7484',
                middle: '#48505f',
                edge: '#232a35',
                maria: '56, 63, 76',
                crater: '28, 34, 46',
                craterRim: '216, 224, 240',
                hazeStart: 'rgba(255, 255, 255, 0.055)',
                hazeMiddle: 'rgba(255, 255, 255, 0)',
                hazeEnd: 'rgba(6, 8, 14, 0.24)',
            };
        const textureOpacity = tone === 'lit' ? 1 : 0.72;
        const craterOpacity = tone === 'lit' ? 1 : 0.64;
        const discGradient = context.createRadialGradient(
            -radius * 0.22,
            -radius * 0.28,
            radius * 0.08,
            0,
            0,
            radius * 1.04
        );

        discGradient.addColorStop(0, palette.center);
        discGradient.addColorStop(0.38, palette.middle);
        discGradient.addColorStop(1, palette.edge);

        context.save();
        context.globalAlpha = opacity;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.closePath();
        context.fillStyle = discGradient;
        context.fill();

        context.save();
        this.clipMoonDisc(context, radius);

        const maria = [
            { x: -0.28, y: -0.16, rx: 0.19, ry: 0.13, alpha: 0.094, blur: 15, rotation: -0.48 },
            { x: -0.34, y: 0.02, rx: 0.17, ry: 0.11, alpha: 0.082, blur: 18, rotation: -0.24 },
            { x: -0.09, y: 0.18, rx: 0.14, ry: 0.1, alpha: 0.078, blur: 13, rotation: 0.18 },
            { x: 0.12, y: -0.14, rx: 0.12, ry: 0.085, alpha: 0.074, blur: 11, rotation: 0.3 },
            { x: 0.23, y: -0.02, rx: 0.1, ry: 0.07, alpha: 0.07, blur: 10, rotation: -0.08 },
            { x: 0.18, y: 0.18, rx: 0.09, ry: 0.065, alpha: 0.068, blur: 9, rotation: 0.42 },
            { x: 0.03, y: 0.3, rx: 0.08, ry: 0.055, alpha: 0.06, blur: 8, rotation: -0.26 },
        ];

        for (const patch of maria) {
            context.save();
            context.filter = `blur(${patch.blur}px)`;
            context.globalCompositeOperation = 'multiply';
            context.fillStyle = `rgba(${palette.maria}, ${patch.alpha * textureOpacity})`;
            context.beginPath();
            context.ellipse(
                patch.x * radius,
                patch.y * radius,
                patch.rx * radius,
                patch.ry * radius,
                patch.rotation,
                0,
                Math.PI * 2
            );
            context.fill();

            context.fillStyle = `rgba(${palette.maria}, ${patch.alpha * textureOpacity * 0.58})`;
            context.beginPath();
            context.ellipse(
                (patch.x + patch.rx * 0.18) * radius,
                (patch.y + patch.ry * 0.12) * radius,
                patch.rx * radius * 0.56,
                patch.ry * radius * 0.48,
                patch.rotation * 1.15,
                0,
                Math.PI * 2
            );
            context.fill();
            context.restore();
        }

        this.paintSurfaceGranulation(context, radius, tone, palette);

        const craters = [
            { x: -0.28, y: -0.16, r: 0.095, alpha: 0.12 },
            { x: 0.14, y: -0.11, r: 0.075, alpha: 0.12 },
            { x: -0.04, y: 0.17, r: 0.082, alpha: 0.14 },
            { x: 0.24, y: 0.21, r: 0.05, alpha: 0.1 },
            { x: 0.02, y: -0.32, r: 0.06, alpha: 0.08 },
        ];

        for (const crater of craters) {
            const x = crater.x * radius;
            const y = crater.y * radius;
            const craterRadius = crater.r * radius;

            context.save();
            context.globalCompositeOperation = 'multiply';
            context.fillStyle = `rgba(${palette.crater}, ${crater.alpha * craterOpacity})`;
            context.beginPath();
            context.arc(x, y, craterRadius, 0, Math.PI * 2);
            context.fill();

            context.strokeStyle = `rgba(${palette.craterRim}, ${0.14 * craterOpacity})`;
            context.lineWidth = radius * 0.012;
            context.beginPath();
            context.arc(x - craterRadius * 0.1, y - craterRadius * 0.08, craterRadius * 0.9, 0, Math.PI * 2);
            context.stroke();
            context.restore();
        }

        const haze = context.createLinearGradient(-radius * 0.76, -radius * 0.26, radius * 0.98, radius * 0.72);
        haze.addColorStop(0, palette.hazeStart);
        haze.addColorStop(0.48, palette.hazeMiddle);
        haze.addColorStop(1, palette.hazeEnd);
        context.fillStyle = haze;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();

        context.restore();
        context.restore();
    }

    private getEarthshineOpacity(illumination: number) {
        if (illumination >= 0.995) {
            return 0;
        }

        const crescentStrength = Math.pow(Math.max(0, 1 - illumination), 1.35);
        const midpointPenalty = 1 - Math.min(1, Math.abs(illumination - 0.5) * 1.55);

        return Math.max(
            0.004,
            Math.min(0.045, 0.004 + crescentStrength * 0.034 - midpointPenalty * 0.006)
        );
    }

    private paintEarthshine(
        context: CanvasRenderingContext2D,
        radius: number,
        phase: number,
        illumination: number
    ) {
        if (illumination >= 0.24) {
            return;
        }

        const earthshineOpacity = this.getEarthshineOpacity(illumination);
        if (earthshineOpacity <= 0) {
            return;
        }

        const litOnRight = phase <= 0.5;
        this.paintMoonSurface(context, radius, 'shadow', earthshineOpacity);

        context.save();
        this.clipMoonDisc(context, radius);

        const directionalFade = litOnRight
            ? context.createLinearGradient(radius * 1.08, 0, -radius * 1.08, 0)
            : context.createLinearGradient(-radius * 1.08, 0, radius * 1.08, 0);

        directionalFade.addColorStop(0, 'rgba(255, 255, 255, 0)');
        directionalFade.addColorStop(0.18, 'rgba(255, 255, 255, 0)');
        directionalFade.addColorStop(0.52, 'rgba(10, 14, 22, 0.14)');
        directionalFade.addColorStop(1, 'rgba(6, 8, 12, 0.34)');

        context.fillStyle = directionalFade;
        context.fillRect(-radius * 1.2, -radius * 1.2, radius * 2.4, radius * 2.4);

        const earthshineGlow = context.createRadialGradient(
            litOnRight ? -radius * 0.18 : radius * 0.18,
            -radius * 0.14,
            radius * 0.12,
            0,
            0,
            radius * 1.05
        );

        earthshineGlow.addColorStop(0, 'rgba(205, 218, 238, 0.035)');
        earthshineGlow.addColorStop(0.36, 'rgba(158, 176, 210, 0.018)');
        earthshineGlow.addColorStop(1, 'rgba(158, 176, 210, 0)');

        context.fillStyle = earthshineGlow;
        context.fillRect(-radius * 1.2, -radius * 1.2, radius * 2.4, radius * 2.4);
        context.restore();
    }

    private paintFullMoonHalo(context: CanvasRenderingContext2D, radius: number, illumination: number) {
        if (illumination < 0.92) {
            return;
        }

        const strength = Math.min(1, (illumination - 0.92) / 0.08);
        const outerHalo = context.createRadialGradient(0, 0, radius * 0.58, 0, 0, radius * (2.05 + strength * 0.2));
        outerHalo.addColorStop(0, `rgba(255, 250, 240, ${0.07 + strength * 0.07})`);
        outerHalo.addColorStop(0.32, `rgba(232, 238, 252, ${0.08 + strength * 0.09})`);
        outerHalo.addColorStop(0.62, `rgba(188, 206, 235, ${0.03 + strength * 0.04})`);
        outerHalo.addColorStop(1, 'rgba(188, 206, 235, 0)');

        context.save();
        context.fillStyle = outerHalo;
        context.beginPath();
        context.arc(0, 0, radius * (2.05 + strength * 0.2), 0, Math.PI * 2);
        context.fill();

        const innerGlow = context.createRadialGradient(0, 0, radius * 0.18, 0, 0, radius * 1.22);
        innerGlow.addColorStop(0, `rgba(255, 252, 245, ${0.08 + strength * 0.12})`);
        innerGlow.addColorStop(0.48, `rgba(255, 247, 232, ${0.025 + strength * 0.035})`);
        innerGlow.addColorStop(1, 'rgba(255, 247, 232, 0)');
        context.fillStyle = innerGlow;
        context.beginPath();
        context.arc(0, 0, radius * 1.22, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    private paintLimbScattering(
        context: CanvasRenderingContext2D,
        radius: number,
        phase: number,
        illumination: number
    ) {
        if (illumination <= 0.01) {
            return;
        }

        const outerOnRight = phase <= 0.5;
        const brightStart = outerOnRight ? -Math.PI / 2 : Math.PI / 2;
        const brightEnd = outerOnRight ? Math.PI / 2 : Math.PI * 1.5;
        const crescentBoost = 1 + Math.abs(0.5 - illumination) * 0.7;
        const outerGlowAlpha = (0.075 + illumination * 0.04) * crescentBoost;

        context.save();
        context.strokeStyle = `rgba(233, 240, 252, ${outerGlowAlpha})`;
        context.lineWidth = radius * (0.052 + (1 - illumination) * 0.018);
        context.filter = 'blur(6px)';
        context.beginPath();
        context.arc(0, 0, radius * 1.03, brightStart, brightEnd);
        context.stroke();
        context.restore();

        context.save();
        this.clipMoonDisc(context, radius);
        const rimGradient = outerOnRight
            ? context.createLinearGradient(radius * 1.04, 0, -radius * 0.3, 0)
            : context.createLinearGradient(-radius * 1.04, 0, radius * 0.3, 0);

        if (outerOnRight) {
            rimGradient.addColorStop(0, 'rgba(255, 252, 244, 0.24)');
            rimGradient.addColorStop(0.14, 'rgba(255, 249, 238, 0.13)');
            rimGradient.addColorStop(0.34, 'rgba(255, 249, 238, 0.03)');
            rimGradient.addColorStop(0.58, 'rgba(255, 249, 238, 0)');
            rimGradient.addColorStop(1, 'rgba(255, 249, 238, 0)');
        } else {
            rimGradient.addColorStop(0, 'rgba(255, 252, 244, 0.24)');
            rimGradient.addColorStop(0.14, 'rgba(255, 249, 238, 0.13)');
            rimGradient.addColorStop(0.34, 'rgba(255, 249, 238, 0.03)');
            rimGradient.addColorStop(0.58, 'rgba(255, 249, 238, 0)');
            rimGradient.addColorStop(1, 'rgba(255, 249, 238, 0)');
        }

        context.fillStyle = rimGradient;
        context.fillRect(-radius * 1.2, -radius * 1.2, radius * 2.4, radius * 2.4);
        context.restore();

        context.save();
        context.strokeStyle = `rgba(255, 250, 238, ${0.08 + illumination * 0.06})`;
        context.lineWidth = radius * 0.012;
        context.filter = 'blur(0.8px)';
        context.beginPath();
        context.arc(0, 0, radius * 0.988, brightStart, brightEnd);
        context.stroke();
        context.restore();
    }

    private traceIlluminatedArea(context: CanvasRenderingContext2D, radius: number, phase: number) {
        const phaseAngle = phase * Math.PI * 2;
        const outerOnRight = phase <= 0.5;
        const illumination = 0.5 * (1 - Math.cos(phaseAngle));
        const phaseTension = illumination < 0.2 || illumination > 0.8 ? 1.18 : 1.06;
        const terminatorRadiusX = Math.max(
            radius * 0.008,
            Math.pow(Math.abs(Math.cos(phaseAngle)), phaseTension) * radius
        );
        const terminatorOnRight = outerOnRight === (Math.cos(phaseAngle) >= 0);

        context.beginPath();

        if (outerOnRight) {
            context.arc(0, 0, radius, Math.PI / 2, -Math.PI / 2, true);
            context.ellipse(
                0,
                0,
                terminatorRadiusX,
                radius,
                0,
                -Math.PI / 2,
                Math.PI / 2,
                !terminatorOnRight
            );
        } else {
            context.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2, true);
            context.ellipse(
                0,
                0,
                terminatorRadiusX,
                radius,
                0,
                Math.PI / 2,
                -Math.PI / 2,
                terminatorOnRight
            );
        }

        context.closePath();
    }

    private paintTerminatorGlow(
        context: CanvasRenderingContext2D,
        radius: number,
        phase: number,
        illumination: number
    ) {
        if (illumination <= 0.04 || illumination >= 0.985) {
            return;
        }

        const phaseAngle = phase * Math.PI * 2;
        const outerOnRight = phase <= 0.5;
        const terminatorOnRight = outerOnRight === (Math.cos(phaseAngle) >= 0);
        const phaseTension = illumination < 0.2 || illumination > 0.8 ? 1.18 : 1.06;
        const terminatorRadiusX = Math.max(
            radius * 0.012,
            Math.pow(Math.abs(Math.cos(phaseAngle)), phaseTension) * radius
        );

        context.save();
        this.clipMoonDisc(context, radius);
        context.strokeStyle = `rgba(255, 247, 232, ${0.08 + illumination * 0.07})`;
        context.lineWidth = radius * 0.012;
        context.filter = `blur(${illumination < 0.18 ? 0.9 : 1.4}px)`;
        context.beginPath();
        context.ellipse(
            0,
            0,
            terminatorRadiusX,
            radius * 0.99,
            0,
            -Math.PI / 2,
            Math.PI / 2,
            !terminatorOnRight
        );
        context.stroke();
        context.restore();
    }

    private drawMoon() {
        if (!this.moonCanvas) return;

        const context = this.moonCanvas.getContext('2d');
        if (!context) return;

        const size = this.moonCanvas.width;
        const center = size / 2;
        const radius = size * 0.34;
        const { phase, illumination } = this.getMoonPhase();
        const tilt = this.getMoonTilt(phase);

        context.clearRect(0, 0, size, size);
        context.save();
        context.translate(center, center);

        const aura = context.createRadialGradient(0, 0, radius * 0.35, 0, 0, radius * 1.8);
        aura.addColorStop(0, `rgba(246, 243, 234, ${0.08 + illumination * 0.14})`);
        aura.addColorStop(0.45, `rgba(205, 220, 241, ${0.05 + illumination * 0.08})`);
        aura.addColorStop(1, 'rgba(205, 220, 241, 0)');
        context.fillStyle = aura;
        context.beginPath();
        context.arc(0, 0, radius * 1.8, 0, Math.PI * 2);
        context.fill();
        this.paintFullMoonHalo(context, radius, illumination);

        context.save();
        context.rotate(tilt);

        this.paintEarthshine(context, radius, phase, illumination);

        if (illumination > 0.004) {
            context.save();
            this.traceIlluminatedArea(context, radius, phase);
            context.clip();
            this.paintMoonSurface(context, radius, 'lit');

            const bloom = context.createRadialGradient(
                phase <= 0.5 ? radius * 0.22 : -radius * 0.22,
                -radius * 0.16,
                radius * 0.04,
                0,
                0,
                radius * 1.08
            );
            bloom.addColorStop(0, `rgba(255, 251, 242, ${0.08 + illumination * 0.1})`);
            bloom.addColorStop(0.36, `rgba(255, 246, 230, ${0.02 + illumination * 0.035})`);
            bloom.addColorStop(1, 'rgba(255, 246, 230, 0)');
            context.fillStyle = bloom;
            context.fillRect(-radius * 1.2, -radius * 1.2, radius * 2.4, radius * 2.4);
            context.restore();
            this.paintTerminatorGlow(context, radius, phase, illumination);
        }

        this.paintLimbScattering(context, radius, phase, illumination);

        if (illumination > 0.93) {
            context.strokeStyle = `rgba(255, 249, 238, ${0.03 + (illumination - 0.93) * 0.24})`;
            context.lineWidth = radius * 0.01;
            context.beginPath();
            context.arc(0, 0, radius * 0.985, 0, Math.PI * 2);
            context.stroke();
        }

        context.restore();
        context.restore();
    }
}

export default MoonOverlay;
