let currentScreen = 1;
let selectedLanguage = { code: 'en', name: 'English' };

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

document.addEventListener('fullscreenchange', updateFullscreenUI);
document.addEventListener('webkitfullscreenchange', updateFullscreenUI);

function updateFullscreenUI() {
    var isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
    document.getElementById('fullscreen-exit').classList.toggle('hidden', !isFS);
    document.getElementById('fullscreen-enter').classList.toggle('hidden', isFS);
}

function goToScreen(target) {
    if (target === currentScreen) return;

    var currentEl = document.getElementById('screen-' + currentScreen);
    var targetEl = document.getElementById('screen-' + target);
    var goingForward = target > currentScreen;

    currentEl.classList.remove('active');
    currentEl.style.transform = goingForward ? 'translateX(-40px)' : 'translateX(40px)';
    currentEl.style.opacity = '0';

    targetEl.style.transform = goingForward ? 'translateX(40px)' : 'translateX(-40px)';
    targetEl.style.opacity = '0';
    targetEl.style.visibility = 'visible';

    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            targetEl.classList.add('active');
            targetEl.style.transform = '';
            targetEl.style.opacity = '';
        });
    });

    setTimeout(function() {
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
    var percent = (currentScreen / 3) * 100;
    bar.style.width = percent + '%';

    steps.forEach(function(step) {
        var stepNum = parseInt(step.getAttribute('data-step'));
        step.classList.toggle('active', stepNum === currentScreen);
        step.classList.toggle('completed', stepNum < currentScreen);
        step.querySelector('.step-circle').textContent = stepNum < currentScreen ? '\u2713' : stepNum;
    });
}

function selectLanguage(card) {
    document.querySelectorAll('.language-card').forEach(function(c) {
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
            language: selectedLanguage.code
        })
    })
    .then(function(res) {
        return res.json().then(function(data) {
            return { ok: res.ok, data: data };
        });
    })
    .then(function(result) {
        if (!result.ok) {
            showError(result.data.error || 'Registration failed');
            return;
        }

        document.getElementById('completion-name').textContent = result.data.name;
        document.getElementById('completion-id').textContent = result.data.reg_id;
        document.getElementById('completion-lang').textContent = selectedLanguage.name;

        goToScreen(3);
    })
    .catch(function() {
        showError('Network error. Please try again.');
    })
    .finally(function() {
        btn.disabled = false;
        btn.innerHTML = '<span>Complete Registration</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    });
}

function startNew() {
    document.getElementById('registration-form').reset();
    document.getElementById('completion-name').textContent = '-';
    document.getElementById('completion-id').textContent = '-';
    document.getElementById('completion-lang').textContent = '-';

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

function showError(msg) {
    var toast = document.getElementById('error-toast');
    var messageEl = document.getElementById('error-message');
    messageEl.textContent = msg;
    toast.classList.remove('hidden');

    requestAnimationFrame(function() {
        toast.classList.add('show');
    });

    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() {
            toast.classList.add('hidden');
        }, 400);
    }, 3500);
}

document.addEventListener('keydown', function(e) {
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
