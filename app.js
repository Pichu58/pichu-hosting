// ================= إعداد Supabase ================= //

const supabaseUrl = 'https://amwsonnzcocbucraiyof.supabase.co';
const supabaseKey = 'sb_publishable_Yjod13-S3GbXgfdkvpwpeg_Mg3apZd2';

let supabase = null;
let isLoginMode = true;

const isDashboard = window.location.pathname.includes('dashboard.html');

// ================= تشغيل Supabase ================= //

function initializeSupabase() {
    if (!window.supabase) {
        console.error('Supabase library failed to load');
        return false;
    }

    try {
        supabase = window.supabase.createClient(
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
    username.classList.add('hidden');
    username.removeAttribute('required');

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
    username.classList.remove('hidden');
    username.setAttribute('required', 'true');

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

        if (!supabase) {
            errorMsg.style.color = 'var(--danger)';
            errorMsg.innerText = 'تعذر الاتصال بخدمة الحسابات، حاول تحديث الصفحة.';
            return;
        }

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const username = document.getElementById('username').value.trim();

        errorMsg.style.color = 'var(--text-main)';
        errorMsg.innerText = 'جاري التحميل...';

        submitBtn.disabled = true;

        try {
            if (isLoginMode) {

                // تسجيل الدخول

                const { data, error } =
                    await supabase.auth.signInWithPassword({
                        email: email,
                        password: password
                    });

                if (error) throw error;

                if (data.user) {
                    window.location.href = 'dashboard.html';
                }

            } else {

                // إنشاء حساب جديد

                if (!username) {
                    throw new Error('يرجى إدخال اسم المستخدم');
                }

                const { data, error } =
                    await supabase.auth.signUp({
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

// ================= التحقق من الحساب ================= //

async function checkAuthState() {

    if (!isDashboard && !supabase) {
        return;
    }

    if (!isDashboard && supabase) {
        try {
            const { data } = await supabase.auth.getSession();

            if (data.session) {
                const authLink =
                    document.getElementById('nav-auth-link');

                if (authLink) {
                    authLink.innerText = 'لوحة التحكم';

                    authLink.onclick = function () {
                        window.location.href = 'dashboard.html';
                    };
                }
            }
        } catch (error) {
            console.error(error);
        }

        return;
    }

    const loadingScreen =
        document.getElementById('loading-screen');

    if (!supabase) {
        if (loadingScreen) {
            loadingScreen.innerText =
                'تعذر الاتصال بالخدمة، يرجى تحديث الصفحة.';
        }
        return;
    }

    try {

        const { data, error } =
            await supabase.auth.getSession();

        if (error || !data.session) {
            window.location.replace('index.html');
            return;
        }

        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }

        document
            .getElementById('dashboard-content')
            .classList.remove('hidden');

        await loadUserProfile(data.session.user);

    } catch (error) {

        console.error('Auth error:', error);

        window.location.replace('index.html');
    }
}

// ================= تحميل بيانات المستخدم ================= //

async function loadUserProfile(user) {

    const welcomeMsg =
        document.getElementById('welcome-msg');

    if (!welcomeMsg) return;

    try {

        const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();

        if (error) throw error;

        if (data && data.username) {
            welcomeMsg.innerText =
                `مرحباً، ${data.username}`;
        } else {
            welcomeMsg.innerText =
                `مرحباً، ${user.email.split('@')[0]}`;
        }

    } catch (error) {

        console.error('Profile error:', error);

        welcomeMsg.innerText =
            `مرحباً، ${user.email.split('@')[0]}`;
    }
}

// ================= تسجيل الخروج ================= //

window.logout = async function () {

    if (!supabase) {
        window.location.replace('index.html');
        return;
    }

    try {

        const { error } = await supabase.auth.signOut();

        if (error) throw error;

        window.location.replace('index.html');

    } catch (error) {

        alert('حدث خطأ أثناء تسجيل الخروج: ' + error.message);
    }
};

// ================= تشغيل النظام ================= //

initializeSupabase();

window.addEventListener('DOMContentLoaded', function () {
    checkAuthState();
});
