const supabaseUrl = 'https://amwsonnzcocbucraiyof.supabase.co';
const supabaseKey = 'sb_publishable_Yjod13-S3GbXgfdkvpwpeg_Mg3apZd2';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const isDashboard = window.location.pathname.includes('dashboard.html');
let isLoginMode = true;

// ---------------- 1. حماية وتوجيه المسارات ---------------- //
async function checkAuthState() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (isDashboard) {
        if (!session || error) {
            window.location.replace('index.html');
        } else {
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('dashboard-content').classList.remove('hidden');
            loadUserProfile(session.user);
        }
    } else {
        if (session) {
            const authLink = document.getElementById('nav-auth-link');
            if(authLink) {
                authLink.innerText = 'لوحة التحكم';
                authLink.onclick = () => window.location.href = 'dashboard.html';
            }
        }
    }
}

// ---------------- 2. منطق واجهة التسجيل والدخول ---------------- //
window.showLogin = function() {
    isLoginMode = true;
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('modal-title').innerText = 'تسجيل الدخول';
    document.getElementById('username').classList.add('hidden');
    document.getElementById('username').removeAttribute('required');
    document.getElementById('submit-btn').innerText = 'دخول';
    document.getElementById('toggle-text').innerText = 'ليس لديك حساب؟ ';
    document.getElementById('toggle-link').innerText = 'إنشاء حساب';
    document.getElementById('auth-error').innerText = '';
};

window.showRegister = function() {
    isLoginMode = false;
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('modal-title').innerText = 'إنشاء حساب جديد';
    document.getElementById('username').classList.remove('hidden');
    document.getElementById('username').setAttribute('required', 'true');
    document.getElementById('submit-btn').innerText = 'تسجيل';
    document.getElementById('toggle-text').innerText = 'لديك حساب بالفعل؟ ';
    document.getElementById('toggle-link').innerText = 'تسجيل الدخول';
    document.getElementById('auth-error').innerText = '';
};

window.closeModal = function() { 
    document.getElementById('auth-modal').classList.add('hidden'); 
};

window.toggleAuthMode = function() {
    isLoginMode ? window.showRegister() : window.showLogin();
};

// ---------------- 3. معالجة بيانات النموذج ---------------- //
const authForm = document.getElementById('auth-form');
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const username = document.getElementById('username').value;
        const errorMsg = document.getElementById('auth-error');
        
        errorMsg.style.color = 'var(--text-main)';
        errorMsg.innerText = 'جاري التحميل...';
        document.getElementById('submit-btn').disabled = true;

        try {
            if (isLoginMode) {
                // تمت إزالة المتغير data غير المستخدم هنا
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                
                window.location.href = 'dashboard.html';
            } else {
                const { data, error } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        data: { username: username }
                    }
                });
                
                if (error) throw error;
                
                if (data.session === null) {
                    errorMsg.style.color = 'var(--warning)';
                    errorMsg.innerText = 'تم التسجيل! يرجى مراجعة بريدك الإلكتروني لتأكيد الحساب قبل الدخول.';
                } else {
                    errorMsg.style.color = 'var(--success)';
                    errorMsg.innerText = 'تم إنشاء الحساب بنجاح! جاري التوجيه...';
                    setTimeout(() => window.location.href = 'dashboard.html', 1500);
                }
            }
        } catch (error) {
            errorMsg.style.color = 'var(--danger)';
            errorMsg.innerText = error.message; 
        } finally {
            document.getElementById('submit-btn').disabled = false;
        }
    });
}

// ---------------- 4. دوال لوحة التحكم ---------------- //
/**
 * @param {object} user 
 */
async function loadUserProfile(user) {
    // تمت إزالة المتغير error غير المستخدم هنا
    const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

    const welcomeMsg = document.getElementById('welcome-msg');
    if (data && data.username) {
        welcomeMsg.innerText = `مرحباً، ${data.username}`;
    } else {
        welcomeMsg.innerText = `مرحباً، ${user.email.split('@')[0]}`;
    }
}

window.logout = async function() {
    await supabase.auth.signOut();
    window.location.replace('index.html');
};

window.addEventListener('DOMContentLoaded', checkAuthState);
