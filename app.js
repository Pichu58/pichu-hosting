// ================= إعداد Supabase ================= //

const supabaseUrl = 'https://amwsonnzcocbucraiyof.supabase.co';
const supabaseKey = 'sb_publishable_Yjod13-S3GbXgfdkvpwpeg_Mg3apZd2';

let supabaseClient = null;
let isLoginMode = true;

const isDashboard = window.location.pathname.includes('dashboard.html');

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
                // تسجيل الدخول
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
                // إنشاء حساب جديد
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

    if (!isDashboard) {
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
            loadingScreen.innerText = 'تعذر الاتصال بالخدمة، يرجى تحديث الصفحة.';
        }
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error || !data || !data.session) {
            window.location.replace('index.html');
            return;
        }

        // إظهار لوحة التحكم وإخفاء شاشة التحميل فور التأكد من وجود الجلسة
        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (dashboardContent) dashboardContent.classList.remove('hidden');

        // جلب البيانات بشكل منفصل
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

    // الاسم الافتراضي مبدئياً
    welcomeMsg.innerText = `مرحباً، ${user.email.split('@')[0]}`;

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .maybeSingle();

        if (data && data.username) {
            welcomeMsg.innerText = `مرحباً، ${data.username}`;
        }
    } catch (err) {
        console.warn('تعذر تحميل اسم المستخدم من الجدول:', err);
    }
}

// ================= تسجيل الخروج ================= //

window.logout = async function () {
    if (!supabaseClient) {
        window.location.replace('index.html');
        return;
    }

    try {
        await supabaseClient.auth.signOut();
    } catch (err) {
        console.error(err);
    }
    window.location.replace('index.html');
};

// ================= تشغيل النظام ================= //

initializeSupabase();

window.addEventListener('DOMContentLoaded', function () {
    checkAuthState();
});
