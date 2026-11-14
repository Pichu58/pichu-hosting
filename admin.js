
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

        // تحميل بيانات العملاء التفصيلية
        const { data: customersData, error: customersError } =
            await db.rpc('admin_customers_data');

        if (customersError) throw customersError;

        const customers = Array.isArray(customersData)
            ? customersData
            : (customersData?.customers || []);

        renderCustomers(customers);
        renderServices(data.services || []);
        renderPlans(data.plans || []);

        document.getElementById('customer-count').textContent =
            customers.length;

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

// ================= إدارة العملاء =================

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

        const email = document.createElement('p');
        email.textContent = 'البريد الإلكتروني: ' +
            (customer.email || 'غير متوفر');

        const id = document.createElement('p');
        id.textContent = 'معرف الحساب: ' +
            (customer.id || customer.user_id || 'غير متوفر');

        const plan = document.createElement('p');
        plan.textContent = 'الباقة: ' +
            (customer.plan_name || 'لا توجد باقة');

        const subscription = document.createElement('p');
        subscription.textContent = 'حالة الاشتراك: ' +
            (customer.subscription_status || 'غير مشترك');

        const expires = document.createElement('p');

        if (customer.expires_at) {
            const date = new Date(customer.expires_at);
            expires.textContent = 'تاريخ انتهاء الاشتراك: ' +
                (isNaN(date.getTime())
                    ? customer.expires_at
                    : date.toLocaleDateString('ar'));
        } else {
            expires.textContent = 'تاريخ انتهاء الاشتراك: غير محدد';
        }

        const active = document.createElement('p');
        const isActive = customer.is_active !== false;

        active.textContent = isActive
            ? 'حالة الحساب: نشط 🟢'
            : 'حالة الحساب: موقوف 🔴';

        active.style.color = isActive ? 'green' : 'red';

        const toggleButton = document.createElement('button');

        toggleButton.textContent = isActive
            ? 'إيقاف الحساب'
            : 'إعادة تفعيل الحساب';

        toggleButton.style.marginTop = '10px';

        toggleButton.onclick = () => {
            const userId = customer.id || customer.user_id;

            if (!userId) {
                alert('تعذر تحديد معرف العميل.');
                return;
            }

            updateCustomerStatus(userId, !isActive);
        };

        card.append(
            name,
            email,
            id,
            plan,
            subscription,
            expires,
            active,
            toggleButton
        );

        container.appendChild(card);
    });
}

async function updateCustomerStatus(userId, isActive) {
    const action = isActive ? 'إعادة تفعيل' : 'إيقاف';

    if (!confirm(`هل أنت متأكد من ${action} حساب هذا العميل؟`)) {
        return;
    }

    try {
        showMessage('جاري تحديث حالة العميل...');

        const { error } = await db.rpc('admin_set_customer_status', {
            p_user_id: userId,
            p_is_active: isActive
        });

        if (error) throw error;

        alert(isActive
            ? 'تمت إعادة تفعيل حساب العميل.'
            : 'تم إيقاف حساب العميل.');

        await loadAdminData();

    } catch (error) {
        console.error(error);
        alert(error.message || 'تعذر تحديث حالة العميل.');
        showMessage('فشل تحديث حالة العميل.', 'red');
    }
}

// ================= طلبات الاستضافة =================

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

// ================= إدارة الباقات =================

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

        const price = document.createElement('p');
        price.textContent = 'السعر: ' + Number(plan.price || 0).toFixed(2);

        const active = document.createElement('p');
        active.textContent = plan.is_active
            ? 'الحالة: مفعلة 🟢'
            : 'الحالة: غير مفعلة 🔴';

        const edit = document.createElement('button');
        edit.textContent = 'تعديل الباقة';
        edit.onclick = () => editPlan(plan);

        card.append(name, bots, ram, price, active, edit);
        container.appendChild(card);
    });
}

window.editPlan = function (plan) {
    document.getElementById('plan-id').value = plan.id;
    document.getElementById('plan-name').value = plan.name;
    document.getElementById('plan-bots').value = plan.max_bots;
    document.getElementById('plan-ram').value = plan.ram_mb;
    document.getElementById('plan-price').value = plan.price || 0;
    document.getElementById('plan-active').checked = plan.is_active;

    document.getElementById('plan-form-title').textContent =
        'تعديل الباقة: ' + plan.name;

    window.scrollTo({
        top: document.getElementById('plans-list').offsetTop,
        behavior: 'smooth'
    });
};

window.resetPlanForm = function () {
    document.getElementById('plan-id').value = '';
    document.getElementById('plan-name').value = '';
    document.getElementById('plan-bots').value = 1;
    document.getElementById('plan-ram').value = 256;
    document.getElementById('plan-price').value = 0;
    document.getElementById('plan-active').checked = true;

    document.getElementById('plan-form-title').textContent =
        'إضافة باقة جديدة';
};

window.savePlan = async function () {
    const id = document.getElementById('plan-id').value.trim();
    const name = document.getElementById('plan-name').value.trim();
    const bots = Number(document.getElementById('plan-bots').value);
    const ram = Number(document.getElementById('plan-ram').value);
    const price = Number(document.getElementById('plan-price').value);
    const active = document.getElementById('plan-active').checked;

    if (!name || !Number.isInteger(bots) || bots < 1 ||
        !Number.isInteger(ram) || ram < 1 ||
        !Number.isFinite(price) || price < 0) {
        alert('يرجى إدخال بيانات صحيحة للباقة.');
        return;
    }

    if (!confirm('هل تريد حفظ بيانات هذه الباقة؟')) {
        return;
    }

    try {
        const { error } = await db.rpc('admin_save_plan', {
            p_plan_id: id || null,
            p_name: name,
            p_max_bots: bots,
            p_ram_mb: ram,
            p_price: price,
            p_is_active: active
        });

        if (error) throw error;

        alert('تم حفظ الباقة بنجاح.');
        resetPlanForm();
        await loadAdminData();

    } catch (error) {
        console.error(error);
        alert(error.message || 'تعذر حفظ الباقة.');
    }
};

// ================= تحديث حالة الطلب =================

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

// ================= تسجيل الخروج =================

window.adminLogout = async function () {
    await db.auth.signOut();
    window.location.replace('index.html');
};

checkOwner();
