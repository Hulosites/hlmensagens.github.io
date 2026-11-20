document.addEventListener('DOMContentLoaded', () => {
    // ===== PROTEÇÃO CONTRA BOTS =====
    const SECURITY_CONFIG = {
        maxRequests: 10,
        windowMinutes: 60,
        blockDurationMinutes: 30
    };

    let requestLog = [];
    let isBlocked = false;
    let blockUntil = 0;

    function getClientId() {
        let clientId = sessionStorage.getItem('client_id');
        if (!clientId) {
            clientId = Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
            sessionStorage.setItem('client_id', clientId);
        }
        return clientId;
    }

    function checkRateLimit() {
        const now = Date.now();
        const windowMs = SECURITY_CONFIG.windowMinutes * 60 * 1000;

        if (isBlocked && now < blockUntil) {
            return { allowed: false, blocked: true, remaining: Math.ceil((blockUntil - now) / 1000 / 60) };
        }

        if (isBlocked && now >= blockUntil) {
            isBlocked = false;
            requestLog = [];
        }

        requestLog = requestLog.filter(timestamp => now - timestamp < windowMs);

        if (requestLog.length >= SECURITY_CONFIG.maxRequests) {
            isBlocked = true;
            blockUntil = now + SECURITY_CONFIG.blockDurationMinutes * 60 * 1000;
            return { allowed: false, blocked: true, remaining: SECURITY_CONFIG.blockDurationMinutes };
        }

        requestLog.push(now);
        return { allowed: true, blocked: false };
    }

    function showSecurityBlock(remainingMinutes) {
        alert(`⚠️ Segurança: Muitas requisições detectadas.\nTente novamente em ${remainingMinutes} minuto(s).`);
    }

    // ===== OTIMIZAÇÃO DE PERFORMANCE =====
    // Cache de elementos DOM para evitar buscas repetidas
    const DOM = {
        setupScreen: document.getElementById('setup-screen'),
        sendingScreen: document.getElementById('sending-screen'),
        startBtn: document.getElementById('startBtn'),
        backBtn: document.getElementById('backBtn'),
        nextBtn: document.getElementById('nextBtn'),
        numbersInput: document.getElementById('numbers'),
        messageInput: document.getElementById('message'),
        countLabel: document.getElementById('countLabel'),
        currentIndexEl: document.getElementById('currentIndex'),
        totalNumbersEl: document.getElementById('totalNumbers'),
        currentNumberEl: document.getElementById('currentNumber'),
        progressBar: document.getElementById('progressBar'),
        progressPercent: document.getElementById('progressPercent'),
        sendLink: document.getElementById('sendLink'),
        themeToggles: document.querySelectorAll('.theme-toggle'),
        themeIcons: document.querySelectorAll('[id^="themeIcon"]'),
        toastContainer: document.getElementById('toast-container')
    };

    // Debounce para evitar execução excessiva no input
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    let numberList = [];
    let currentIndex = 0;
    let rafId = null;

    // Theme Management
    function setTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark-theme');
            updateThemeIcons('sun');
        } else {
            document.body.classList.remove('dark-theme');
            updateThemeIcons('moon');
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    function updateThemeIcons(type) {
        const sunIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
        const moonIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        
        DOM.themeIcons.forEach(icon => {
            icon.innerHTML = type === 'sun' ? sunIcon : moonIcon;
        });
    }

    // Init Theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme === 'dark');

    DOM.themeToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-theme');
            setTheme(isDark);
        });
    });

    // Toast Notification System
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        DOM.toastContainer.appendChild(toast);
        // Forçar reflow para animação
        toast.offsetHeight;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Update number count com debounce e validação
const updateCountLabel = debounce(() => {
    const rawLines = DOM.numbersInput.value.split('\n').filter(line => line.trim() !== '');
    const validLines = rawLines.filter(line => isValidPhoneNumber(line.trim()));
    const invalidCount = rawLines.length - validLines.length;
    
    DOM.countLabel.textContent = `${validLines.length} / 20 números válidos`;
    DOM.countLabel.style.color = validLines.length > 20 ? 'var(--error-color)' : 'var(--text-muted)';
    
    // Destacar linhas inválidas com vermelho
    if (invalidCount > 0) {
        DOM.countLabel.textContent += ` (${invalidCount} inválido(s))`;
        DOM.countLabel.style.color = 'var(--error-color)';
    }
}, 150);

DOM.numbersInput.addEventListener('input', (e) => {
    // Permitir apenas dígitos, quebras de linha e símbolo +
    let value = e.target.value;
    value = value.replace(/[^0-9\n+]/g, '');
    e.target.value = value;
    updateCountLabel();
});

// Validar se é um número de telefone real
function isValidPhoneNumber(phone) {
    // Remove espaços, parênteses, traços, pontos e +
    const cleaned = phone.replace(/[\s+\-()\.]/g, '');
    
    // Deve conter apenas dígitos
    if (!/^\d+$/.test(cleaned)) {
        return false;
    }
    
    // Mínimo 10 dígitos (DDD + número no Brasil)
    // Máximo 15 dígitos (padrão internacional E.164)
    if (cleaned.length < 10 || cleaned.length > 15) {
        return false;
    }
    
    // Não pode começar com 0
    if (cleaned.startsWith('0')) {
        return false;
    }
    
    // Não pode ser todos dígitos iguais (ex: 1111111111)
    if (/^(\d)\1+$/.test(cleaned)) {
        return false;
    }
    
    return true;
}

// Start flow
DOM.startBtn.addEventListener('click', () => {
    // Verificação de segurança contra bots
    const securityCheck = checkRateLimit();
    if (!securityCheck.allowed) {
        if (securityCheck.blocked) {
            showSecurityBlock(securityCheck.remaining);
        }
        return;
    }

    const rawLines = DOM.numbersInput.value.split('\n').filter(line => line.trim() !== '');
    
    // Validar cada número
    const validNumbers = [];
    const invalidNumbers = [];
    
    rawLines.forEach(line => {
        const trimmed = line.trim();
        if (isValidPhoneNumber(trimmed)) {
            validNumbers.push(trimmed);
        } else {
            invalidNumbers.push(trimmed);
        }
    });

    if (invalidNumbers.length > 0) {
        showToast(`${invalidNumbers.length} número(s) inválido(s) removido(s). Apenas números de telefone válidos são aceitos.`);
    }

    if (validNumbers.length === 0) {
        return showToast('Insira pelo menos um número de telefone válido.');
    }
    if (validNumbers.length > 20) {
        return showToast('Máximo de 20 números permitidos.');
    }
    if (!DOM.messageInput.value.trim()) {
        return showToast('Escreva a mensagem primeiro.');
    }

    numberList = validNumbers.map(n => n.replace(/[\s+\-()\.]/g, ''));
    currentIndex = 0;
    
    switchScreen(DOM.sendingScreen);
    updateDisplay();
});

    // Back button
    DOM.backBtn.addEventListener('click', () => {
        if(confirm('Deseja realmente voltar? O progresso será perdido.')) {
            switchScreen(DOM.setupScreen);
        }
    });

    // Next contact
    DOM.nextBtn.addEventListener('click', () => {
        currentIndex++;
        if (currentIndex < numberList.length) {
            updateDisplay();
            showToast('Próximo contato carregado');
        } else {
            alert('🎉 Todos os envios foram concluídos!');
            switchScreen(DOM.setupScreen);
            DOM.numbersInput.value = '';
            DOM.messageInput.value = '';
            DOM.countLabel.textContent = '0 / 20 números';
        }
    });

    function updateDisplay() {
        // Usar requestAnimationFrame para animações suaves
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            const currentNum = numberList[currentIndex];
            const message = encodeURIComponent(DOM.messageInput.value.trim());
            
            DOM.currentIndexEl.textContent = currentIndex + 1;
            DOM.totalNumbersEl.textContent = numberList.length;
            DOM.currentNumberEl.textContent = currentNum;
            
            DOM.sendLink.href = `https://wa.me/${currentNum}?text=${message}`;
            
            const progress = ((currentIndex + 1) / numberList.length) * 100;
            DOM.progressBar.style.width = `${progress}%`;
            DOM.progressPercent.textContent = `${Math.round(progress)}%`;
        });
    }

    function switchScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }
});
