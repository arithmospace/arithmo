/**
 * ARITHMO TOAST NOTIFICATION SYSTEM
 * Lightweight notification system for progress feedback
 */

(function () {
    'use strict';

    class ToastManager {
        constructor() {
            this.container = null;
            this.init();
        }

        init() {
            // Create toast container
            this.container = document.createElement('div');
            this.container.id = 'arithmo-toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 100px; /* MOVED DOWN to avoid navbar overlap */
                right: 20px;
                z-index: 2147483647; /* MAX Z-INDEX to ensure it's always on top */
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }

        show(message, type = 'info', duration = 4000) {
            const toast = document.createElement('div');
            toast.className = 'arithmo-toast';

            // Set styles based on type
            const colors = {
                success: { bg: 'rgba(16, 185, 129, 0.95)', icon: '✅' },
                error: { bg: 'rgba(239, 68, 68, 0.95)', icon: '❌' },
                warning: { bg: 'rgba(245, 158, 11, 0.95)', icon: '⚠️' },
                info: { bg: 'rgba(59, 130, 246, 0.95)', icon: 'ℹ️' }
            };

            const style = colors[type] || colors.info;

            toast.style.cssText = `
                background: ${style.bg};
                color: white;
                padding: 12px 20px;
                border-radius: 12px;
                font-family: 'Lexend', sans-serif;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 10px;
                pointer-events: auto;
                cursor: pointer;
                animation: slideInRight 0.3s ease;
                max-width: 350px;
                word-wrap: break-word;
            `;

            toast.innerHTML = `
                <span style="font-size: 20px;">${style.icon}</span>
                <span>${message}</span>
            `;

            // Click to dismiss
            toast.onclick = () => {
                this.remove(toast);
            };

            // Add to container
            this.container.appendChild(toast);

            // Auto-remove after duration
            setTimeout(() => {
                this.remove(toast);
            }, duration);

            return toast;
        }

        remove(toast) {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }

        success(message, duration) {
            return this.show(message, 'success', duration);
        }

        error(message, duration) {
            return this.show(message, 'error', duration);
        }

        warning(message, duration) {
            return this.show(message, 'warning', duration);
        }

        info(message, duration) {
            return this.show(message, 'info', duration);
        }
    }

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100px);
            }
        }

        .arithmo-toast:hover {
            opacity: 0.9;
        }
    `;
    document.head.appendChild(style);

    // Create global instance
    window.ArithmoToast = new ToastManager();
    console.log('✅ Toast Notification System Ready');
})();