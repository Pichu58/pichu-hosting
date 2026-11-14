
// ================= إعداد Supabase ================= //

const supabaseUrl = 'https://amwsonnzcocbucraiyof.supabase.co';
const supabaseKey = 'sb_publishable_Yjod13-S3GbXgfdkvpwpeg_Mg3apZd2';

let supabaseClient = null;
let isLoginMode = true;

// ================= تحديد صفحة لوحة التحكم ================= //

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
        await loadUserPlan();
        await loadHostingServices();

    } catch (error) {
        console.error('Auth error:', error);

        if (loadingScreen) {
            loadingScreen.innerText = 'حدث خطأ أثناء تحميل لوحة التحكم.';
        }
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

// ================= تحميل باقة العميل ================= //

async function loadUserPlan() {
    const planElement = document.getElementById('current-plan');
    const usageElement = document.getElementById('bots-usage');
    const ramElement = document.getElementById('plan-ram');

    if (!planElement || !supabaseClient) return;

    planElement.innerText = 'جاري تحميل الباقة...';

    try {
        const { data: { user }, error: authError } =
            await supabaseClient.auth.getUser();

        if (authError || !user) {
            throw new Error('تعذر التحقق من الحساب');
        }

        const { data, error } = await supabaseClient
            .from('user_subscriptions')
            .select(`
                plan_id,
                status,
                expires_at,
                hosting_plans (
                    name,
                    max_bots,
                    ram_mb
                )
            `)
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) throw error;

        const isExpired = data?.expires_at &&
            new Date(data.expires_at) <= new Date();

        if (
            !data ||
            !data.hosting_plans ||
            data.status !== 'active' ||
            isExpired
        ) {
            planElement.innerText = 'لا توجد باقة فعالة';

            if (usageElement) usageElement.innerText = 'عدد البوتات: غير متاح';
            if (ramElement) ramElement.innerText = 'الذاكرة: غير متاحة';

            return;
        }

        const plan = data.hosting_plans;

        const { count, error: countError } = await supabaseClient
            .from('hosting_services')
            .select('id', {
                count: 'exact',
                head: true
            })
            .eq('user_id', user.id);

        if (countError) throw countError;

        planElement.innerText = plan.name;

        if (usageElement) {
            usageElement.innerText =
                `عدد البوتات: ${count || 0} / ${plan.max_bots}`;
        }

        if (ramElement) {
            ramElement.innerText =
                `الذاكرة المخصصة: ${plan.ram_mb} MB`;
        }

    } catch (error) {
        console.error('Plan error:', error);
        planElement.innerText = 'تعذر تحميل الباقة';

        if (usageElement) usageElement.innerText = 'تعذر تحميل العدد';
        if (ramElement) ramElement.innerText = 'تعذر تحميل الذاكرة';
    }
}

// ================= إنشاء استضافة Discord Bot ================= //

window.createBotHosting = async function () {
    const nameInput = document.getElementById('new-bot-name');
    const fileInput = document.getElementById('new-bot-file');
    const msgBox = document.getElementById('create-bot-msg');
    const createBtn = document.getElementById('create-bot-btn');

    if (!nameInput || !fileInput || !msgBox || !createBtn) return;

    const botName = nameInput.value.trim();
    const file = fileInput.files[0];

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

    if (!file) {
        msgBox.style.color = 'var(--warning)';
        msgBox.innerText = 'يرجى اختيار ملف البوت ZIP.';
        return;
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
        msgBox.style.color = 'var(--warning)';
        msgBox.innerText = 'يجب أن يكون الملف بصيغة ZIP.';
        return;
    }

    if (file.size === 0) {
        msgBox.style.color = 'var(--warning)';
        msgBox.innerText = 'الملف فارغ.';
        return;
    }

    if (!initializeSupabase()) {
        msgBox.style.color = 'var(--danger)';
        msgBox.innerText = 'تعذر الاتصال بقاعدة البيانات.';
        return;
    }

    createBtn.disabled = true;
    msgBox.style.color = 'var(--text-main)';
    msgBox.innerText = 'جاري التحقق من الحساب...';

    let uploadedPath = null;

    try {
        const { data: userData, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError || !userData.user) {
            throw new Error('يرجى تسجيل الدخول مجدداً.');
        }

        const user = userData.user;

        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

        // رفع الملف إلى Storage
        msgBox.innerText = 'جاري رفع ملف البوت...';

        const { error: uploadError } = await supabaseClient
            .storage
            .from('bot-files')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: 'application/zip'
            });

        if (uploadError) throw uploadError;

        uploadedPath = filePath;

        // إنشاء الاستضافة عبر دالة التحقق من الباقة
        msgBox.innerText = 'تم رفع الملف، جاري التحقق من الباقة...';

        const { error: insertError } = await supabaseClient.rpc(
            'create_hosting_service',
            {
                p_name: botName,
                p_file_path: uploadedPath
            }
        );

        if (insertError) throw insertError;

        msgBox.style.color = 'var(--success)';
        msgBox.innerText =
            'تم إنشاء الاستضافة ورفع ملف البوت بنجاح!';

        nameInput.value = '';
        fileInput.value = '';

        await loadHostingServices();
        await loadUserPlan();

    } catch (error) {
        console.error('Create hosting error:', error);

        // حذف الملف المرفوع إذا فشل إنشاء سجل الاستضافة
        if (uploadedPath) {
            const { error: removeError } = await supabaseClient
                .storage
                .from('bot-files')
                .remove([uploadedPath]);

            if (removeError) {
                console.error('File cleanup error:', removeError);
            }
        }

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
            .select(`
                id,
                service_name,
                service_type,
                status,
                created_at,
                file_path
            `)
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
            type.textContent =
                'النوع: ' + (service.service_type || 'غير محدد');

            const status = document.createElement('p');

            if (service.status === 'running') {
                status.textContent = 'الحالة: يعمل 🟢';
            } else if (service.status === 'pending') {
                status.textContent = 'الحالة: بانتظار التجهيز 🟡';
            } else {
                status.textContent = 'الحالة: متوقف 🔴';
            }

            const fileStatus = document.createElement('p');

            fileStatus.textContent = service.file_path
                ? 'ملف البوت: مرفوع ☑️'
                : 'ملف البوت: غير مرفوع';

            card.append(name, type, status, fileStatus);
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
        msgBox.innerText = 'يرجى رفع ملف البوت (index.js أو ZIP).';
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
