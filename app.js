
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
    if (supabaseClient) return true;

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
    if (modal) modal.classList.add('hidden');
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
                        email,
                        password
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
                        email,
                        password,
                        options: {
                            data: { username }
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
            loadingScreen.innerText =
                'تعذر تحميل مكتبة الاتصال، يرجى تحديث الصفحة.';
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

        await loadUserProfile(data.session.user);
        await loadHostingServices();

    } catch (error) {
        console.error('Auth error:', error);
        window.location.replace('index.html');
    }
}

// ================= تحميل بيانات المستخدم ================= //

async function loadUserProfile(user) {
    const welcomeMsg = document.getElementById('welcome-msg');
    if (!welcomeMsg) return;

    const fallbackName = user.email
        ? user.email.split('@')[0]
        : 'عميلنا العزيز';

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

// ================= إنشاء استضافة Discord Bot ================= //

window.createBotHosting = async function () {
    const nameInput = document.getElementById('new-bot-name');
    const fileInput = document.getElementById('new-bot-file');
    const msgBox = document.getElementById('create-bot-msg');
    const createBtn = document.getElementById('create-bot-btn');

    if (!nameInput || !msgBox || !createBtn) return;

    const botName = nameInput.value.trim();

    if (!botName) {
        msgBox.style.color = 'var(--warning)';
        msgBox.innerText = 'يرجى إدخال اسم البوت.';
        return;
    }

    if (botName.length > 60) {
        msgBox.style.color = 'var(--warning)';
        msgBox.innerText = 'اسم البوت يجب ألا يتجاوز 60 حرفاً.';
        return;
    }

    if (!initializeSupabase()) {
        msgBox.style.color = 'var(--danger)';
        msgBox.innerText = 'تعذر الاتصال بقاعدة البيانات.';
        return;
    }

    createBtn.disabled = true;
    msgBox.style.color = 'var(--text-main)';
    msgBox.innerText = 'جاري إنشاء الاستضافة...';

    try {
        const { data: userData, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError || !userData.user) {
            throw new Error('انتهت جلستك، يرجى تسجيل الدخول مجدداً.');
        }

        const user = userData.user;

        const { error } = await supabaseClient
            .from('hosting_services')
            .insert({
                user_id: user.id,
                service_name: botName,
                service_type: 'Discord Bot',
                status: 'pending'
            });

        if (error) throw error;

        msgBox.style.color = 'var(--success)';
        msgBox.innerText =
            'تم تسجيل الاستضافة بنجاح! وهي الآن بانتظار التجهيز.';

        nameInput.value = '';

        if (fileInput) {
            fileInput.value = '';
        }

        await loadHostingServices();

    } catch (error) {
        console.error('Create hosting error:', error);

        msgBox.style.color = 'var(--danger)';
        msgBox.innerText =
            error.message || 'حدث خطأ أثناء إنشاء الاستضافة.';
    } finally {
        createBtn.disabled = false;
    }
};

// ================= تحميل استضافات العميل ================= //

async function loadHostingServices() {
    const container = document.getElementById('hosting-services-list');
    if (!container || !supabaseClient) return;

    container.innerText = 'جاري تحميل استضافاتك...';

    try {
        const { data: { user }, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError || !user) {
            throw new Error('تعذر التحقق من حسابك');
        }

        const { data, error } = await supabaseClient
            .from('hosting_services')
            .select('id, service_name, service_type, status, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        container.innerHTML = '';

        if (!data || data.length === 0) {
            container.innerText = 'لا توجد استضافات حتى الآن.';
            return;
        }

        data.forEach(service => {
            const card = document.createElement('div');
            card.className = 'stat-card';

            const name = document.createElement('h3');
            name.textContent = service.service_name || 'استضافة بدون اسم';

            const type = document.createElement('p');
            type.textContent = 'النوع: ' + (service.service_type || 'غير محدد');

            const status = document.createElement('p');

            if (service.status === 'running') {
                status.textContent = 'الحالة: يعمل 🟢';
            } else if (service.status === 'pending') {
                status.textContent = 'الحالة: بانتظار التجهيز 🟡';
            } else {
                status.textContent = 'الحالة: متوقف 🔴';
            }

            card.append(name, type, status);
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Hosting services error:', error);
        container.innerText =
            'تعذر تحميل الاستضافات. تحقق من الاتصال والصلاحيات.';
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

// ================= إدارة البوت - تجريبية حالياً ================= //

window.startBot = function () {
    const tokenInput = document.getElementById('bot-token');
    const fileInput = document.getElementById('bot-file');
    const msgBox = document.getElementById('bot-action-msg');

    if (!tokenInput || !fileInput || !msgBox) return;

    const token = tokenInput.value.trim();
    const file = fileInput.files[0];

    if (!token) {
        msgBox.style.color = 'var(--warning)';
        msgBox.innerText = 'يرجى إدخال توكن البوت أولاً.';
        return;
    }

    if (!file) {
        msgBox.style.color = 'var(--warning)';
        msgBox.innerText = 'يرجى رفع ملف البوت (index.js أو .zip).';
        return;
    }

    msgBox.style.color = 'var(--warning)';
    msgBox.innerText =
        'واجهة التشغيل تجريبية حالياً، لم يتم تشغيل البوت على خادم فعلي.';
};

// ================= إيقاف البوت ================= //

window.stopBot = function () {
    const msgBox = document.getElementById('bot-action-msg');

    if (msgBox) {
        msgBox.style.color = 'var(--warning)';
        msgBox.innerText =
            'لا يوجد خادم تشغيل فعلي متصل لإيقاف البوت حالياً.';
    }
};

// ================= تشغيل النظام ================= //

initializeSupabase();

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', checkAuthState);
} else {
    checkAuthState();
}
