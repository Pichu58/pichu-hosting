// ================= إعداد Supabase ================= //

const supabaseUrl = 'https://amwsonnzcocbucraiyof.supabase.co';
const supabaseKey = 'sb_publishable_Yjod13-S3GbXgfdkvpwpeg_Mg3apZd2';

let supabaseClient = null;
let isLoginMode = true;

function isDashboardPage() {
    return (
        window.location.pathname.includes('dashboard') ||
        document.getElementById('dashboard-content') !== null
    );
}

// ================= تشغيل Supabase ================= //

function initializeSupabase() {
    if (supabaseClient) {
        return true;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error('Supabase library failed to load');
        return false;
    }

    try {
        supabaseClient = window.supabase.createClient(
            supabaseUrl,
            supabaseKey
        );

        return true;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        return false;
    }
}

// ================= نافذة تسجيل الدخول ================= //

window.showLogin = function () {
    isLoginMode = true;

    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    modal.classList.remove('hidden');

    document.getElementById('modal-title').innerText = 'تسجيل الدخول';

    const username = document.getElementById('username');
    if (username) {
        username.classList.add('hidden');
        username.removeAttribute('required');
    }

    document.getElementById('submit-btn').innerText = 'دخول';
    document.getElementById('toggle-text').innerText = 'ليس لديك حساب؟ ';
    document.getElementById('toggle-link').innerText = 'إنشاء حساب';
    document.getElementById('auth-error').innerText = '';
};

// ================= نافذة إنشاء حساب ================= //

window.showRegister = function () {
    isLoginMode = false;

    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    modal.classList.remove('hidden');

    document.getElementById('modal-title').innerText = 'إنشاء حساب جديد';

    const username = document.getElementById('username');
    if (username) {
        username.classList.remove('hidden');
        username.setAttribute('required', 'true');
    }

    document.getElementById('submit-btn').innerText = 'تسجيل';
    document.getElementById('toggle-text').innerText = 'لديك حساب بالفعل؟ ';
    document.getElementById('toggle-link').innerText = 'تسجيل الدخول';
    document.getElementById('auth-error').innerText = '';
};

// ================= إغلاق النافذة ================= //

window.closeModal = function () {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

// ================= التبديل بين الدخول والتسجيل ================= //

window.toggleAuthMode = function () {
    if (isLoginMode) {
        window.showRegister();
    } else {
        window.showLogin();
    }
};

// ================= معالجة نموذج الحساب ================= //

const authForm = document.getElementById('auth-form');

if (authForm) {
    authForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const errorMsg = document.getElementById('auth-error');
        const submitBtn = document.getElementById('submit-btn');

        if (!supabaseClient && !initializeSupabase()) {
            errorMsg.style.color = 'var(--danger)';
            errorMsg.innerText = 'تعذر الاتصال بخدمة الحسابات، حاول تحديث الصفحة.';
            return;
        }

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const usernameInput = document.getElementById('username');
        const username = usernameInput ? usernameInput.value.trim() : '';

        errorMsg.style.color = 'var(--text-main)';
        errorMsg.innerText = 'جاري التحميل...';

        submitBtn.disabled = true;

        try {
            if (isLoginMode) {
                const { data, error } =
                    await supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: password
                    });

                if (error) throw error;

                if (data.session) {
                    window.location.href = 'dashboard.html';
                }
            } else {
                if (!username) {
                    throw new Error('يرجى إدخال اسم المستخدم');
                }

                const { data, error } =
                    await supabaseClient.auth.signUp({
                        email: email,
                        password: password,
                        options: {
                            data: {
                                username: username
                            }
                        }
                    });

                if (error) throw error;

                if (data.session === null) {
                    errorMsg.style.color = 'var(--warning)';
                    errorMsg.innerText =
                        'تم التسجيل بنجاح! يرجى مراجعة بريدك الإلكتروني لتأكيد الحساب قبل الدخول.';
                } else {
                    errorMsg.style.color = 'var(--success)';
                    errorMsg.innerText =
                        'تم إنشاء الحساب بنجاح! جاري التوجيه...';

                    setTimeout(function () {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                }
            }
        } catch (error) {
            errorMsg.style.color = 'var(--danger)';
            errorMsg.innerText = error.message;
        } finally {
            submitBtn.disabled = false;
        }
    });
}

// ================= التحقق من الحساب وحماية لوحة التحكم ================= //

async function checkAuthState() {
    initializeSupabase();

    const onDashboard = isDashboardPage();

    if (!onDashboard) {
        if (supabaseClient) {
            try {
                const { data } = await supabaseClient.auth.getSession();
                if (data && data.session) {
                    const authLink = document.getElementById('nav-auth-link');
                    if (authLink) {
                        authLink.innerText = 'لوحة التحكم';
                        authLink.onclick = function () {
                            window.location.href = 'dashboard.html';
                        };
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }
        return;
    }

    const loadingScreen = document.getElementById('loading-screen');
    const dashboardContent = document.getElementById('dashboard-content');

    if (!supabaseClient) {
        if (loadingScreen) {
            loadingScreen.innerText = 'تعذر تحميل مكتبة الاتصال، يرجى تحديث الصفحة.';
        }
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error || !data || !data.session) {
            window.location.replace('index.html');
            return;
        }

        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (dashboardContent) dashboardContent.classList.remove('hidden');

        loadUserProfile(data.session.user);

    } catch (error) {
        console.error('Auth error:', error);
        window.location.replace('index.html');
    }
}

// ================= تحميل بيانات المستخدم ================= //

/**
 * @param {{ id: string, email: string }} user
 */
async function loadUserProfile(user) {
    const welcomeMsg = document.getElementById('welcome-msg');
    if (!welcomeMsg) return;

    const fallbackName = user.email ? user.email.split('@')[0] : 'عميلنا العزيز';
    welcomeMsg.innerText = `مرحباً، ${fallbackName}`;

    try {
        const { data } = await supabaseClient
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .maybeSingle();

        if (data && data.username) {
            welcomeMsg.innerText = `مرحباً، ${data.username}`;
        }
    } catch (err) {
        console.warn('Profile fetch warning:', err);
    }
}

// ================= تسجيل الخروج ================= //

window.logout = async function () {
    if (supabaseClient) {
        try {
            await supabaseClient.auth.signOut();
        } catch (err) {
            console.error(err);
        }
    }
    window.location.replace('index.html');
};

// ================= إدارة البوت (واجهة لوحة التحكم) ================= //

window.startBot = function() {
    const token = document.getElementById('bot-token').value.trim();
    const fileInput = document.getElementById('bot-file').files[0];
    const msgBox = document.getElementById('bot-action-msg');
    
    if (!token) {
        msgBox.style.color = 'var(--warning)';
        msgBox.innerText = 'يرجى إدخال توكن البوت أولاً.';
        return;
    }

    if (!fileInput) {
        msgBox.style.color = 'var(--warning)';
        msgBox.innerText = 'يرجى رفع ملف البوت (index.js أو .zip).';
        return;
    }

    msgBox.style.color = 'var(--text-main)';
    msgBox.innerText = 'جاري الاتصال بالخادم وتشغيل البوت...';
    
    document.getElementById('start-bot-btn').disabled = true;

    // تمثيل مبدئي لعملية الاتصال بالخادم (سيتم ربطها بـ Backend حقيقي لاحقاً)
    setTimeout(() => {
        msgBox.style.color = 'var(--success)';
        msgBox.innerText = 'تم تشغيل البوت بنجاح!';
        
        document.getElementById('bot-status-text').innerText = 'يعمل 🟢';
        document.getElementById('bot-status-text').style.color = 'var(--success)';
        
        document.getElementById('start-bot-btn').classList.add('hidden');
        document.getElementById('stop-bot-btn').classList.remove('hidden');
        document.getElementById('start-bot-btn').disabled = false;
    }, 2000);
};

window.stopBot = function() {
    const msgBox = document.getElementById('bot-action-msg');
    
    msgBox.style.color = 'var(--text-main)';
    msgBox.innerText = 'جاري إيقاف البوت...';
    document.getElementById('stop-bot-btn').disabled = true;

    // تمثيل مبدئي لعملية الإيقاف
    setTimeout(() => {
        msgBox.style.color = 'var(--warning)';
        msgBox.innerText = 'تم إيقاف البوت.';
        
        document.getElementById('bot-status-text').innerText = 'متوقف 🔴';
        document.getElementById('bot-status-text').style.color = 'var(--text-muted)';
        
        document.getElementById('stop-bot-btn').classList.add('hidden');
        document.getElementById('start-bot-btn').classList.remove('hidden');
        document.getElementById('stop-bot-btn').disabled = false;
    }, 1000);
};

// ================= تشغيل النظام ================= //

initializeSupabase();

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', checkAuthState);
} else {
    checkAuthState();
}
