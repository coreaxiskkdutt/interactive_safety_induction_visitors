var currentScreen = 1;
var selectedLanguage = { code: 'en', name: 'English' };
var currentRegistration = null;
var selectedVisitorType = 'visitor';
var cameraStream = null;
var capturedPhoto = null;
var translations = {};
var totalScreens = 6;
var isNarrating = false;
var isNarrationPaused = false;
var currentNarratingIndex = 0;
var narrationUtterances = [];

function enterFullscreen() {
    var el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
}

function exitFullscreen() {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
}

function updateFullscreenUI() {
    var isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
    document.getElementById('fullscreen-exit').classList.toggle('hidden', !isFS);
    document.getElementById('fullscreen-enter').classList.toggle('hidden', isFS);
}

function goToScreen(target) {
    if (target === currentScreen) return;

    var currentEl = document.getElementById('screen-' + currentScreen);
    var targetEl = document.getElementById('screen-' + target);
    if (!currentEl || !targetEl) return;
    var goingForward = target > currentScreen;

    currentEl.classList.remove('active');
    currentEl.style.transform = goingForward ? 'translateX(-40px)' : 'translateX(40px)';
    currentEl.style.opacity = '0';

    targetEl.style.transform = goingForward ? 'translateX(40px)' : 'translateX(-40px)';
    targetEl.style.opacity = '0';
    targetEl.style.visibility = 'visible';

    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            targetEl.classList.add('active');
            targetEl.style.transform = '';
            targetEl.style.opacity = '';
        });
    });

    setTimeout(function () {
        currentEl.style.visibility = '';
        currentEl.style.transform = '';
        currentEl.style.opacity = '';
    }, 500);

    currentScreen = target;
    updateProgress();
    updateLangDisplay();
}

function updateProgress() {
    var bar = document.getElementById('progress-bar');
    var steps = document.querySelectorAll('.progress-step');
    var percent = (currentScreen / totalScreens) * 100;
    bar.style.width = percent + '%';
    steps.forEach(function(step) {
        var stepNum = parseInt(step.getAttribute('data-step'));
        step.classList.toggle('active', stepNum === currentScreen);
        step.classList.toggle('completed', stepNum < currentScreen);
        step.querySelector('.step-circle').textContent = stepNum < currentScreen ? '\u2713' : stepNum;
    });
}

function selectLanguage(card) {
    document.querySelectorAll('.language-card').forEach(function (c) {
        c.classList.remove('selected');
    });
    card.classList.add('selected');
    selectedLanguage = {
        code: card.getAttribute('data-code'),
        name: card.getAttribute('data-name')
    };
}

function updateLangDisplay() {
    var el = document.getElementById('selected-lang-text');
    if (el) el.textContent = selectedLanguage.name;
}

function showError(msg) {
    var toast = document.getElementById('error-toast');
    var messageEl = document.getElementById('error-message');
    if (!toast || !messageEl) return;
    messageEl.textContent = msg;
    toast.classList.remove('hidden');

    requestAnimationFrame(function () {
        toast.classList.add('show');
    });

    setTimeout(function () {
        toast.classList.remove('show');
        setTimeout(function () {
            toast.classList.add('hidden');
        }, 400);
    }, 3500);
}

function selectVisitorType(el) {
    document.querySelectorAll('.visitor-type-option').forEach(function(o) {
        o.classList.remove('selected');
    });
    el.classList.add('selected');
    el.querySelector('input[type="radio"]').checked = true;
    selectedVisitorType = el.getAttribute('data-value');
}

function submitRegistration(e) {
    e.preventDefault();

    var name = document.getElementById('full-name').value.trim();
    var govId = document.getElementById('gov-id').value.trim();
    var btn = document.getElementById('submit-btn');

    if (!name || !govId) {
        showError('Please fill in all fields');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div><span>Registering...</span>';

    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            gov_id: govId,
            language: selectedLanguage.code,
            visitor_type: selectedVisitorType
        })
    })
        .then(function (res) {
            return res.json().then(function (data) {
                return { ok: res.ok, data: data };
            });
        })
        .then(function (result) {
            if (!result.ok) {
                showError(result.data.error || 'Registration failed');
                return;
            }

            currentRegistration = result.data;

            return fetch('/api/translations?lang=' + encodeURIComponent(selectedLanguage.code));
        })
        .then(function (res) {
            if (!res) return;
            return res.json();
        })
        .then(function (data) {
            if (!data) return;
            translations = data;
            renderSafetyGuidelines();
            goToScreen(3);
        })
        .catch(function () {
            showError('Network error. Please try again.');
        })
        .finally(function () {
            btn.disabled = false;
            btn.innerHTML = '<span>Complete Registration</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
        });
}

function renderSafetyGuidelines() {
    var list = document.getElementById('safety-rules-list');
    list.innerHTML = '';
    document.getElementById('safety-title').textContent = translations.title || 'Safety Guidelines for Visitors';
    document.getElementById('safety-subtitle').textContent = translations.subtitle || '';

    (translations.rules || []).forEach(function(rule, index) {
        var item = document.createElement('div');
        item.className = 'safety-rule-item';
        item.id = 'safety-rule-' + index;
        item.innerHTML = '<span class="rule-number">' + (index + 1) + '</span><span class="rule-text">' + rule + '</span>';
        list.appendChild(item);
    });

    document.getElementById('continue-to-declaration-btn').disabled = true;
}

function narrateSafetyRules() {
    if (!window.speechSynthesis) {
        document.getElementById('continue-to-declaration-btn').disabled = false;
        return;
    }
    window.speechSynthesis.cancel();

    var langMap = {
        'en': 'en-US', 'hi': 'hi-IN', 'bn': 'bn-IN', 'te': 'te-IN',
        'mr': 'mr-IN', 'ta': 'ta-IN', 'gu': 'gu-IN', 'kn': 'kn-IN',
        'ml': 'ml-IN', 'or': 'or-IN', 'pa': 'pa-IN', 'as': 'as-IN',
        'ne': 'ne-IN', 'sd': 'sd-IN', 'ur': 'ur-IN', 'mai': 'hi-IN',
        'sat': 'hi-IN', 'ks': 'hi-IN', 'doi': 'hi-IN', 'kok': 'hi-IN',
        'mni': 'hi-IN', 'brx': 'hi-IN'
    };
    var voiceLang = langMap[selectedLanguage.code] || 'en-US';

    var rules = translations.rules || [];
    isNarrating = true;
    isNarrationPaused = false;
    currentNarratingIndex = 0;
    narrationUtterances = [];

    document.getElementById('narration-btn-text').textContent = 'Pause';
    document.getElementById('narration-status').textContent = 'Playing...';

    function speakNext(index) {
        if (index >= rules.length || !isNarrating) {
            isNarrating = false;
            document.getElementById('narration-btn-text').textContent = 'Play';
            document.getElementById('narration-status').textContent = 'Complete';
            document.getElementById('continue-to-declaration-btn').disabled = false;
            return;
        }

        document.querySelectorAll('.safety-rule-item').forEach(function(el, i) {
            el.classList.toggle('narrating', i === index);
        });

        var utterance = new SpeechSynthesisUtterance(rules[index]);
        utterance.lang = voiceLang;
        utterance.rate = 0.75;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = function() {
            currentNarratingIndex = index + 1;
            document.getElementById('narration-status').textContent = 'Rule ' + (index + 1) + '/' + rules.length;
            if (isNarrating && !isNarrationPaused) {
                speakNext(index + 1);
            }
        };

        utterance.onerror = function() {
            currentNarratingIndex = index + 1;
            if (isNarrating && !isNarrationPaused) {
                speakNext(index + 1);
            }
        };

        narrationUtterances.push(utterance);
        window.speechSynthesis.speak(utterance);
        document.getElementById('narration-status').textContent = 'Rule ' + (index + 1) + '/' + rules.length;
    }

    setTimeout(function() { speakNext(0); }, 500);
}

function toggleNarration() {
    if (!isNarrating && !isNarrationPaused) {
        narrateSafetyRules();
    } else if (isNarrationPaused) {
        isNarrationPaused = false;
        isNarrating = true;
        document.getElementById('narration-btn-text').textContent = 'Pause';
        document.getElementById('narration-status').textContent = 'Playing...';
        window.speechSynthesis.resume();
    } else if (isNarrating) {
        isNarrationPaused = true;
        isNarrating = false;
        document.getElementById('narration-btn-text').textContent = 'Resume';
        document.getElementById('narration-status').textContent = 'Paused';
        window.speechSynthesis.pause();
    }
}

function stopNarration() {
    isNarrating = false;
    isNarrationPaused = false;
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    document.getElementById('narration-btn-text').textContent = 'Play';
    document.getElementById('narration-status').textContent = 'Stopped';
    document.querySelectorAll('.safety-rule-item').forEach(function(el) {
        el.classList.remove('narrating');
    });
}

function goToDeclaration() {
    stopNarration();
    document.getElementById('declaration-text').textContent = translations.declaration_text || '';
    document.getElementById('declaration-title').textContent = translations.declaration_title || 'Declaration';
    document.getElementById('declaration-accept-label').textContent = translations.accept_label || 'I accept';
    document.getElementById('accept-declaration-checkbox').checked = false;
    document.getElementById('accept-declaration-btn').disabled = true;
    goToScreen(4);
}

function onDeclarationCheckChange(checkbox) {
    document.getElementById('accept-declaration-btn').disabled = !checkbox.checked;
}

function acceptDeclaration() {
    var checkbox = document.getElementById('accept-declaration-checkbox');
    if (!checkbox.checked) {
        showError('Please accept the declaration to continue');
        return;
    }
    goToScreen(5);
    setTimeout(function() { initCamera(); }, 500);
}

function initCamera() {
    var video = document.getElementById('camera-video');
    var placeholder = document.getElementById('camera-placeholder');

    capturedPhoto = null;
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('camera-view').classList.remove('hidden');
    document.getElementById('capture-photo-btn').style.display = '';
    document.getElementById('continue-to-pass-btn').style.display = 'none';
    document.getElementById('retake-photo-btn').style.display = 'none';

    document.getElementById('photo-title').textContent = translations.photo_title || 'Capture Your Photo';
    document.getElementById('photo-subtitle').textContent = translations.photo_subtitle || '';
    document.getElementById('capture-btn-text').textContent = translations.capture_btn || 'Take Photo';
    document.getElementById('retake-btn-text').textContent = translations.retake_btn || 'Retake';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        placeholder.innerHTML = '<p>Camera not available on this device.</p>';
        document.getElementById('capture-photo-btn').style.display = 'none';
        document.getElementById('continue-to-pass-btn').style.display = '';
        document.getElementById('continue-to-pass-btn').onclick = function() { goToPassScreen(); };
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
        .then(function(stream) {
            cameraStream = stream;
            video.srcObject = stream;
            placeholder.style.display = 'none';
            video.style.display = 'block';
        })
        .catch(function(err) {
            console.error('Camera error:', err);
            placeholder.innerHTML = '<p>Could not access camera. Please allow camera access.</p>';
            document.getElementById('capture-photo-btn').style.display = 'none';
            document.getElementById('continue-to-pass-btn').style.display = '';
            document.getElementById('continue-to-pass-btn').onclick = function() { goToPassScreen(); };
        });
}

function capturePhoto() {
    if (!cameraStream) {
        showError('Camera not available. Please continue without photo.');
        goToPassScreen();
        return;
    }
    var video = document.getElementById('camera-video');
    var canvas = document.getElementById('photo-canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    capturedPhoto = canvas.toDataURL('image/jpeg', 0.8);

    document.getElementById('captured-photo-img').src = capturedPhoto;
    document.getElementById('photo-preview').classList.remove('hidden');
    document.getElementById('camera-view').classList.add('hidden');

    if (cameraStream) {
        cameraStream.getTracks().forEach(function(t) { t.stop(); });
        cameraStream = null;
    }

    document.getElementById('capture-photo-btn').style.display = 'none';
    document.getElementById('retake-photo-btn').style.display = '';
    document.getElementById('continue-to-pass-btn').style.display = '';
    document.getElementById('continue-to-pass-btn').onclick = function() { goToPassScreen(); };
}

function retakePhoto() {
    capturedPhoto = null;
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('camera-view').classList.remove('hidden');
    document.getElementById('capture-photo-btn').style.display = '';
    document.getElementById('continue-to-pass-btn').style.display = 'none';
    document.getElementById('retake-photo-btn').style.display = 'none';
    initCamera();
}

function goToPassScreen() {
    stopNarration();
    if (cameraStream) {
        cameraStream.getTracks().forEach(function(t) { t.stop(); });
        cameraStream = null;
    }

    document.getElementById('pass-title-text').textContent = translations.pass_title || 'Visitor Pass';
    document.getElementById('download-pass-text').textContent = translations.download_pass || 'Download Pass';
    document.getElementById('print-pass-text').textContent = translations.print_pass || 'Print Pass';
    document.getElementById('new-visitor-text').textContent = translations.new_visitor || 'Register Another';

    document.getElementById('pass-name').textContent = currentRegistration ? currentRegistration.name : '-';
    document.getElementById('pass-reg-id').textContent = currentRegistration ? currentRegistration.reg_id : '-';
    document.getElementById('pass-qr-id').textContent = currentRegistration ? currentRegistration.reg_id : '-';
    document.getElementById('pass-lang').textContent = selectedLanguage.name;

    if (selectedVisitorType === 'driver') {
        document.getElementById('pass-visitor-type').textContent = translations.visitor_type_driver || 'Logistics Driver';
    } else {
        document.getElementById('pass-visitor-type').textContent = translations.visitor_type_visitor || 'Visitor';
    }

    var now = new Date();
    document.getElementById('pass-datetime').textContent = now.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    var img = document.getElementById('pass-photo-img');
    if (capturedPhoto) {
        img.src = capturedPhoto;
        img.style.display = 'block';
    } else {
        img.style.display = 'none';
    }

    goToScreen(6);
}

function downloadPDF() {
    if (typeof window.jspdf === 'undefined' && typeof jspdf === 'undefined') {
        showError('PDF library is loading. Please try again.');
        return;
    }
    var doc = new (window.jspdf ? window.jspdf.jsPDF : jspdf.jsPDF)('p', 'mm', [100, 150]);
    var pageWidth = 100;
    var pageHeight = 150;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setFillColor(30, 41, 59);
    doc.roundedRect(5, 5, pageWidth - 10, pageHeight - 10, 3, 3, 'F');

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(5, 5, pageWidth - 10, 22, 3, 3, 'F');
    doc.setFillColor(37, 99, 235);
    doc.rect(5, 17, pageWidth - 10, 10, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('VISITOR PASS', pageWidth / 2, 18, { align: 'center' });

    doc.setDrawColor(255, 255, 255);
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(35, 30, 30, 30, 2, 2, 'FD');
    if (capturedPhoto) {
        try {
            doc.addImage(capturedPhoto, 'JPEG', 36, 31, 28, 28);
        } catch(e) {}
    }

    doc.setFillColor(22, 163, 74);
    doc.roundedRect(32, 63, 36, 6, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('SAFETY INDUCTION DONE', 50, 67, { align: 'center' });

    doc.setTextColor(248, 250, 252);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    var y = 75;
    var details = [
        { label: 'Name', value: currentRegistration ? currentRegistration.name : '-' },
        { label: 'Reg ID', value: currentRegistration ? currentRegistration.reg_id : '-' },
        { label: 'Type', value: selectedVisitorType === 'driver' ? 'Logistics Driver' : 'Visitor' },
        { label: 'Language', value: selectedLanguage.name },
        { label: 'Date', value: new Date().toLocaleDateString('en-IN') }
    ];
    details.forEach(function(d) {
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.text(d.label, 10, y);
        doc.setTextColor(248, 250, 252);
        doc.setFont('helvetica', 'normal');
        doc.text(d.value, 10, y + 4);
        y += 11;
    });

    doc.setDrawColor(148, 163, 184);
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(75, 75, 18, 18, 2, 2, 'FD');
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text('#' + (currentRegistration ? currentRegistration.reg_id : ''), 84, 98, { align: 'center' });

    doc.setFontSize(5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'italic');
    doc.text('This pass must be visible at all times.', pageWidth / 2, 125, { align: 'center' });
    doc.text('Report lost passes immediately to site security.', pageWidth / 2, 130, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Interactive Safety Induction System', pageWidth / 2, 140, { align: 'center' });

    doc.save('Visitor_Pass_' + (currentRegistration ? currentRegistration.reg_id : '') + '.pdf');
}

function printPass() {
    downloadPDF();
    setTimeout(function() {
        showError('Pass downloaded. Please open and print the PDF.');
    }, 1000);
}

function startNew() {
    document.getElementById('registration-form').reset();
    stopNarration();
    if (cameraStream) {
        cameraStream.getTracks().forEach(function(t) { t.stop(); });
        cameraStream = null;
    }
    capturedPhoto = null;
    currentRegistration = null;
    translations = {};
    isNarrating = false;
    isNarrationPaused = false;
    currentNarratingIndex = 0;
    narrationUtterances = [];

    document.getElementById('capture-photo-btn').style.display = '';
    document.getElementById('continue-to-pass-btn').style.display = 'none';
    document.getElementById('retake-photo-btn').style.display = 'none';
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('camera-view').classList.remove('hidden');
    var video = document.getElementById('camera-video');
    if (video.srcObject) { video.srcObject = null; }

    var firstCard = document.querySelector('.language-card');
    if (firstCard) {
        document.querySelectorAll('.language-card').forEach(function(c) {
            c.classList.remove('selected');
        });
        firstCard.classList.add('selected');
        selectedLanguage = {
            code: firstCard.getAttribute('data-code'),
            name: firstCard.getAttribute('data-name')
        };
    }
    goToScreen(1);
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            exitFullscreen();
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    updateProgress();
    updateLangDisplay();
});
