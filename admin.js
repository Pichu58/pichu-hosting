
const supabaseUrl = 'https://amwsonnzcocbucraiyof.supabase.co';
const supabaseKey = 'sb_publishable_Yjod13-S3GbXgfdkvpwpeg_Mg3apZd2';

const db = window.supabase.createClient(supabaseUrl, supabaseKey);

const message = document.getElementById('admin-message');
const content = document.getElementById('admin-content');

function showMessage(text, color = 'inherit') {
    message.textContent = text;
    message.style.color = color;
}

async function checkOwner() {
    try {
        const { data, error } = await db.auth.getSession();

        if (error || !data.session) {
            window.location.replace('index.html');
            return;
        }

        const { data: admin, error: adminError } = await db
            .from('admin_users')
            .select('role')
            .eq('user_id', data.session.user.id)
            .maybeSingle();

        if (adminError || !admin || admin.role !== 'owner') {
            showMessage('ليس لديك صلاحية الدخول إلى لوحة المالك.', 'red');
            setTimeout(() => {
                window.location.replace('dashboard.html');
            }, 2000);
            return;
        }

        document.getElementById('owner-name').textContent =
            data.session.user.email || 'المالك';

        content.classList.remove('hidden');
        await loadAdminData();

    } catch (error) {
        console.error(error);
        showMessage('حدث خطأ أثناء التحقق من الصلاحيات.', 'red');
    }
}

window.loadAdminData = async function () {
    showMessage('جاري تحميل بيانات المنصة...');

    try {
        const { data, error } = await db.rpc('admin_dashboard_data');

        if (error) throw error;

        renderCustomers(data.customers || []);
        renderServices(data.services || []);
        renderPlans(data.plans || []);

        document.getElementById('customer-count').textContent =
            (data.customers || []).length;

        document.getElementById('service-count').textContent =
            (data.services || []).length;

        document.getElementById('pending-count').textContent =
            (data.services || []).filter(s => s.status === 'pending').length;

        showMessage('تم تحميل بيانات المنصة بنجاح.', 'green');

    } catch (error) {
        console.error(error);
        showMessage(error.message || 'تعذر تحميل البيانات.', 'red');
    }
};

function renderCustomers(customers) {
    const container = document.getElementById('customers-list');
    container.innerHTML = '';

    if (!customers.length) {
        container.textContent = 'لا يوجد عملاء حتى الآن.';
        return;
    }

    customers.forEach(customer => {
        const card = document.createElement('div');
        card.className = 'stat-card';

        const name = document.createElement('h3');
        name.textContent = customer.username || 'عميل بدون اسم';

        const id = document.createElement('p');
        id.textContent = 'معرف الحساب: ' + customer.id;

        card.append(name, id);
        container.appendChild(card);
    });
}

function renderServices(services) {
    const container = document.getElementById('services-list');
    container.innerHTML = '';

    if (!services.length) {
        container.textContent = 'لا توجد طلبات استضافة.';
        return;
    }

    services.forEach(service => {
        const card = document.createElement('div');
        card.className = 'stat-card';

        const title = document.createElement('h3');
        title.textContent = service.service_name || 'استضافة بدون اسم';

        const type = document.createElement('p');
        type.textContent = 'النوع: ' + (service.service_type || 'غير محدد');

        const status = document.createElement('p');

        const statusLabels = {
            pending: 'بانتظار التجهيز 🟡',
            approved: 'تمت الموافقة 🟢',
            rejected: 'مرفوض 🔴',
            running: 'يعمل 🟢'
        };

        status.textContent =
            'الحالة: ' + (statusLabels[service.status] || service.status);

        const owner = document.createElement('p');
        owner.textContent = 'معرف العميل: ' + service.user_id;

        const file = document.createElement('p');
        file.textContent = service.file_path
            ? 'ملف البوت: مرفوع ☑️'
            : 'ملف البوت: غير مرفوع';

        card.append(title, type, status, owner, file);

        if (service.status === 'pending') {
            const actions = document.createElement('div');

            const approve = document.createElement('button');
            approve.textContent = 'قبول الطلب';
            approve.onclick = () =>
                updateServiceStatus(service.id, 'approved');

            const reject = document.createElement('button');
            reject.textContent = 'رفض الطلب';
            reject.style.marginRight = '8px';
            reject.onclick = () =>
                updateServiceStatus(service.id, 'rejected');

            actions.append(approve, reject);
            card.appendChild(actions);
        }

        container.appendChild(card);
    });
}

function renderPlans(plans) {
    const container = document.getElementById('plans-list');
    container.innerHTML = '';

    if (!plans.length) {
        container.textContent = 'لا توجد باقات.';
        return;
    }

    plans.forEach(plan => {
        const card = document.createElement('div');
        card.className = 'stat-card';

        const name = document.createElement('h3');
        name.textContent = plan.name;

        const bots = document.createElement('p');
        bots.textContent = 'عدد البوتات: ' + plan.max_bots;

        const ram = document.createElement('p');
        ram.textContent = 'الذاكرة: ' + plan.ram_mb + ' MB';

        const active = document.createElement('p');
        active.textContent = plan.is_active
            ? 'الحالة: مفعلة 🟢'
            : 'الحالة: غير مفعلة 🔴';

        card.append(name, bots, ram, active);
        container.appendChild(card);
    });
}

async function updateServiceStatus(id, status) {
    const action = status === 'approved' ? 'قبول' : 'رفض';

    if (!confirm(`هل أنت متأكد من ${action} طلب الاستضافة؟`)) {
        return;
    }

    try {
        const { error } = await db.rpc('admin_update_service_status', {
            p_service_id: String(id),
            p_status: status
        });

        if (error) throw error;

        alert('تم تحديث حالة الطلب بنجاح.');
        await loadAdminData();

    } catch (error) {
        console.error(error);
        alert(error.message || 'تعذر تحديث الطلب.');
    }
}

window.adminLogout = async function () {
    await db.auth.signOut();
    window.location.replace('index.html');
};

checkOwner();
