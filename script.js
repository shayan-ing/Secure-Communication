document.addEventListener('DOMContentLoaded', function() {
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleAuth = document.getElementById('theme-toggle-auth');
    let currentTheme = localStorage.getItem('theme') || 'light';

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        const icon = theme === 'dark' ? 'fa-sun' : 'fa-moon';
        if (themeToggle) themeToggle.innerHTML = `<i class="fas ${icon}"></i>`;
        if (themeToggleAuth) themeToggleAuth.innerHTML = `<i class="fas ${icon}"></i>`;
    }

    setTheme(currentTheme);

    function toggleTheme() {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(currentTheme);
    }

    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (themeToggleAuth) themeToggleAuth.addEventListener('click', toggleTheme);

    // Authentication System
    const authScreen = document.getElementById('auth-screen');
    const mainApp = document.getElementById('main-app');
    const pinDigits = document.querySelectorAll('.pin-digit');
    const pinError = document.getElementById('pin-error');
    const attemptsDisplay = document.getElementById('attempts');
    const submitPinBtn = document.getElementById('submit-pin');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Correct PIN (for demo purposes)
    const CORRECT_PIN = '1971'; // DRDO founding year
    let attemptsLeft = 3;
    let isAuthenticated = false;

    // Check if already authenticated
    if (sessionStorage.getItem('authenticated') === 'true') {
        authenticateSuccess();
    }

    // PIN input handling
    pinDigits.forEach((digit, index) => {
        digit.addEventListener('input', function() {
            if (this.value.length === 1) {
                if (index < pinDigits.length - 1) {
                    pinDigits[index + 1].focus();
                }
            }
        });
        
        digit.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value.length === 0 && index > 0) {
                pinDigits[index - 1].focus();
            }
        });
    });

    submitPinBtn.addEventListener('click', verifyPin);

    function verifyPin() {
        const enteredPin = Array.from(pinDigits).map(d => d.value).join('');
        
        if (enteredPin.length !== 4) {
            pinError.textContent = 'Please enter 4-digit PIN';
            return;
        }
        
        if (enteredPin === CORRECT_PIN) {
            authenticateSuccess();
        } else {
            attemptsLeft--;
            attemptsDisplay.textContent = attemptsLeft;
            pinError.textContent = 'Incorrect PIN. Please try again.';
            
            // Clear PIN fields
            pinDigits.forEach(d => d.value = '');
            pinDigits[0].focus();
            
            if (attemptsLeft <= 0) {
                pinError.textContent = 'Maximum attempts reached. Closing application.';
                setTimeout(() => {
                    // In a real app, you would redirect or close the window
                    alert('Application locked. Please contact administrator.');
                }, 1000);
            }
        }
    }

    function authenticateSuccess() {
        isAuthenticated = true;
        sessionStorage.setItem('authenticated', 'true');
        authScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        initMainApp();
    }

    // Logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            sessionStorage.removeItem('authenticated');
            localStorage.removeItem('kavachEncryptedMessage');
            sessionStorage.removeItem('kavachAESKey');
            location.reload();
        });
    }

    // Mobile Menu
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('nav ul');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            this.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking a link
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        });
    });

    // Main Application Functions
    function initMainApp() {
        // Encryption Demo
        const originalMessage = document.getElementById('original-message');
        const encryptedOutput = document.getElementById('encrypted-output');
        const encryptedInput = document.getElementById('encrypted-input');
        const decryptedMessage = document.getElementById('decrypted-message');
        const encryptBtn = document.getElementById('encrypt-btn');
        const decryptBtn = document.getElementById('decrypt-btn');
        const copyEncrypted = document.getElementById('copy-encrypted');
        const copyDecrypted = document.getElementById('copy-decrypted');
        const clearOriginal = document.getElementById('clear-original');
        const clearEncrypted = document.getElementById('clear-encrypted');
        const pasteEncrypted = document.getElementById('paste-encrypted');
        const decryptTime = document.getElementById('decrypt-time');

        // Load saved encrypted message if it exists
        const savedEncryptedMessage = localStorage.getItem('kavachEncryptedMessage');
        if (savedEncryptedMessage) {
            encryptedInput.value = savedEncryptedMessage;
        }

        // Generate a random AES key for the session
        let aesKey;

        async function generateAESKey() {
            try {
                // Try to load the key from sessionStorage
                const savedKey = sessionStorage.getItem('kavachAESKey');
                if (savedKey) {
                    const keyData = Uint8Array.from(JSON.parse(savedKey));
                    aesKey = await window.crypto.subtle.importKey(
                        'raw',
                        keyData,
                        { name: "AES-GCM" },
                        true,
                        ["encrypt", "decrypt"]
                    );
                } else {
                    // Generate new key if none exists
                    aesKey = await window.crypto.subtle.generateKey(
                        { name: "AES-GCM", length: 256 },
                        true,
                        ["encrypt", "decrypt"]
                    );
                    
                    // Export and save the key
                    const exportedKey = await window.crypto.subtle.exportKey('raw', aesKey);
                    sessionStorage.setItem('kavachAESKey', JSON.stringify(Array.from(new Uint8Array(exportedKey))));
                }
            } catch (err) {
                console.error("Key generation error:", err);
                showAlert("Encryption system failure", "error");
            }
        }

        // Initialize crypto
        generateAESKey();

        // Encrypt function
        async function encryptMessage() {
            if (!originalMessage.value.trim()) {
                showAlert("Please enter a message to encrypt", "error");
                return;
            }

            encryptBtn.disabled = true;
            encryptBtn.innerHTML = `<span>Encrypting...</span> <i class="fas fa-spinner fa-spin"></i>`;
            
            try {
                // Generate IV (Initialization Vector)
                const iv = window.crypto.getRandomValues(new Uint8Array(12));
                
                // Encrypt the message
                const encoded = new TextEncoder().encode(originalMessage.value);
                const ciphertext = await window.crypto.subtle.encrypt(
                    { name: "AES-GCM", iv },
                    aesKey,
                    encoded
                );
                
                // Create encrypted package (IV + ciphertext)
                const encryptedPackage = {
                    iv: Array.from(iv),
                    ciphertext: Array.from(new Uint8Array(ciphertext)),
                    timestamp: new Date().toISOString()
                };
                
                // Convert to base64
                const encryptedString = btoa(JSON.stringify(encryptedPackage));
                encryptedOutput.value = encryptedString;
                
                // Save to localStorage
                localStorage.setItem('kavachEncryptedMessage', encryptedString);
                
                showAlert("Message encrypted successfully", "success");
                
            } catch (err) {
                console.error("Encryption error:", err);
                showAlert("Encryption failed", "error");
            } finally {
                encryptBtn.innerHTML = `<span>Encrypt</span> <i class="fas fa-lock"></i>`;
                encryptBtn.disabled = false;
            }
        }

        // Decrypt function
        async function decryptMessage() {
            if (!encryptedInput.value.trim()) {
                showAlert("No encrypted message to decrypt", "error");
                return;
            }

            const startTime = performance.now();
            decryptBtn.disabled = true;
            decryptBtn.innerHTML = `<span>Decrypting...</span> <i class="fas fa-spinner fa-spin"></i>`;
            
            try {
                // Parse the encrypted package
                const encryptedPackage = JSON.parse(atob(encryptedInput.value));
                
                // Convert back to ArrayBuffers
                const iv = new Uint8Array(encryptedPackage.iv).buffer;
                const ciphertext = new Uint8Array(encryptedPackage.ciphertext).buffer;
                
                // Decrypt the message
                const decrypted = await window.crypto.subtle.decrypt(
                    { name: "AES-GCM", iv },
                    aesKey,
                    ciphertext
                );
                
                // Convert to text
                const decoded = new TextDecoder().decode(decrypted);
                decryptedMessage.value = decoded;
                
                // Calculate decryption time
                const endTime = performance.now();
                const timeTaken = Math.round(endTime - startTime);
                decryptTime.textContent = `${timeTaken}ms`;
                
                showAlert("Message decrypted successfully", "success");
                
            } catch (err) {
                console.error("Decryption error:", err);
                decryptedMessage.value = "";
                showAlert("Decryption failed - invalid message", "error");
            } finally {
                decryptBtn.innerHTML = `<span>Decrypt</span> <i class="fas fa-unlock"></i>`;
                decryptBtn.disabled = false;
            }
        }

        // Copy functions
        copyEncrypted.addEventListener('click', () => {
            encryptedOutput.select();
            document.execCommand('copy');
            showAlert("Copied to clipboard", "success");
        });

        copyDecrypted.addEventListener('click', () => {
            decryptedMessage.select();
            document.execCommand('copy');
            showAlert("Copied to clipboard", "success");
        });

        // Paste function
        pasteEncrypted.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                encryptedInput.value = text;
                showAlert("Pasted from clipboard", "success");
            } catch (err) {
                showAlert("Failed to paste from clipboard", "error");
            }
        });

        // Clear functions
        clearOriginal.addEventListener('click', () => {
            originalMessage.value = '';
        });

        clearEncrypted.addEventListener('click', () => {
            encryptedInput.value = '';
            localStorage.removeItem('kavachEncryptedMessage');
        });

        // Event listeners
        encryptBtn.addEventListener('click', encryptMessage);
        decryptBtn.addEventListener('click', decryptMessage);

        // Alert function
        function showAlert(message, type = "success") {
            const alertBox = document.createElement('div');
            alertBox.className = `alert ${type}`;
            alertBox.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            `;
            
            document.body.appendChild(alertBox);
            
            setTimeout(() => {
                alertBox.classList.add('fade-out');
                setTimeout(() => alertBox.remove(), 500);
            }, 3000);
        }

        // Create particles for auth screen
        createParticles();

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // Create particles for auth screen
    function createParticles() {
        const particlesContainer = document.querySelector('.particles');
        if (!particlesContainer) return;
        
        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Random properties
            const size = Math.random() * 5 + 2;
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const delay = Math.random() * 5;
            const duration = Math.random() * 10 + 10;
            const opacity = Math.random() * 0.5 + 0.1;
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${posX}%`;
            particle.style.top = `${posY}%`;
            particle.style.animationDelay = `${delay}s`;
            particle.style.animationDuration = `${duration}s`;
            particle.style.opacity = opacity;
            particle.style.backgroundColor = `var(--primary-blue)`;
            
            particlesContainer.appendChild(particle);
        }
    }
});