import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle, Archive, BarChart3, Boxes, Check, ClipboardList, Download,
  Home, LogOut, Moon, Plus, Save, Search, Settings, Shield,
  Sun, Trash2, Truck, Upload, Users
} from 'lucide-react';
import './styles.css';

type Role = 'agent' | 'employee';
type User = { id: string; username: string; passwordHash: string; role: Role; name: string; active: boolean };
type Family = { id: string; cardNo: string; centerNo: string; headName: string; phone: string; area: string; address: string; membersCount: number; memberNames: string; status: 'نشطة' | 'متوقفة'; notes: string; createdAt: string };
type Item = { id: string; name: string; unit: string; received: number; perPerson: number; perFamily: number; mealNo: string; receivedAt: string; notes: string };
type Meal = { id: string; no: string; month: string; year: number; itemIds: string[]; receivedAt: string; status: 'جديدة' | 'جاري التوزيع' | 'مكتملة' | 'متوقفة'; notes: string };
type Delivery = { id: string; familyId: string; mealId: string; itemIds: string[]; quantities: Record<string, number>; employeeId: string; deliveredAt: string; notes: string; override?: boolean };
type SettingsData = { agentName: string; agentNo: string; area: string; phone: string; centerName: string; lowStockPercent: number; syncEnabled: boolean };
type Db = { users: User[]; families: Family[]; items: Item[]; meals: Meal[]; deliveries: Delivery[]; settings: SettingsData; audit: string[] };

const DB_KEY = 'ration-agent-db-v1';
const IDB_NAME = 'ration-agent-offline';
const IDB_STORE = 'state';
const uid = () => crypto.randomUUID();
const today = () => new Date().toISOString();
const fmt = (d: string) => new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));

function openStore() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(IDB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readDbFromDisk() {
  if (!('indexedDB' in window)) return localStorage.getItem(DB_KEY);
  const database = await openStore();
  return new Promise<string | null>((resolve, reject) => {
    const tx = database.transaction(IDB_STORE, 'readonly');
    const request = tx.objectStore(IDB_STORE).get(DB_KEY);
    request.onsuccess = () => resolve(request.result ?? localStorage.getItem(DB_KEY));
    request.onerror = () => reject(request.error);
  });
}

async function writeDbToDisk(db: Db) {
  const payload = JSON.stringify(db);
  localStorage.setItem(DB_KEY, payload);
  if (!('indexedDB' in window)) return;
  const database = await openStore();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(payload, DB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function seedDb(): Db {
  const items: Item[] = [
    { id: uid(), name: 'الرز', unit: 'كغم', received: 1500, perPerson: 3, perFamily: 0, mealNo: '1', receivedAt: today(), notes: '' },
    { id: uid(), name: 'السكر', unit: 'كغم', received: 700, perPerson: 1, perFamily: 0, mealNo: '1', receivedAt: today(), notes: '' },
    { id: uid(), name: 'الزيت', unit: 'لتر', received: 350, perPerson: 0, perFamily: 1, mealNo: '1', receivedAt: today(), notes: '' }
  ];
  const families: Family[] = [
    { id: uid(), cardNo: '100245', centerNo: '12', headName: 'أحمد علي حسن', phone: '07700000001', area: 'الكرادة', address: 'محلة 901 زقاق 12', membersCount: 5, memberNames: 'أحمد، زهراء، علي، مريم، حسن', status: 'نشطة', notes: '', createdAt: today() },
    { id: uid(), cardNo: '100246', centerNo: '12', headName: 'سارة محمود', phone: '07800000002', area: 'الجادرية', address: 'شارع الجامعة', membersCount: 3, memberNames: 'سارة، نور، عمر', status: 'نشطة', notes: '', createdAt: today() }
  ];
  return {
    users: [],
    families,
    items,
    meals: [{ id: uid(), no: '1', month: 'كانون الثاني', year: 2026, itemIds: items.map(i => i.id), receivedAt: today(), status: 'جاري التوزيع', notes: '' }],
    deliveries: [],
    settings: { agentName: 'اسم الوكيل', agentNo: 'A-001', area: 'بغداد', phone: '', centerName: 'مركز التموين', lowStockPercent: 15, syncEnabled: false },
    audit: ['تم إنشاء قاعدة البيانات المحلية']
  };
}

async function createDefaultDb() {
  const next = seedDb();
  next.users = [
    { id: uid(), username: 'agent', passwordHash: await hashPassword('123456'), role: 'agent', name: 'الوكيل', active: true },
    { id: uid(), username: 'employee', passwordHash: await hashPassword('123456'), role: 'employee', name: 'موظف التوزيع', active: true }
  ];
  return next;
}

function useDb() {
  const [db, setDb] = useState<Db | null>(null);
  useEffect(() => {
    (async () => {
      const saved = await readDbFromDisk();
      const next = saved ? JSON.parse(saved) as Db : seedDb();
      if (!next.users.length) {
        next.users = [
          { id: uid(), username: 'agent', passwordHash: await hashPassword('123456'), role: 'agent', name: 'الوكيل', active: true },
          { id: uid(), username: 'employee', passwordHash: await hashPassword('123456'), role: 'employee', name: 'موظف التوزيع', active: true }
        ];
      }
      await writeDbToDisk(next);
      setDb(next);
    })();
  }, []);
  const save = (updater: (old: Db) => Db, actor = 'النظام') => setDb(old => {
    if (!old) return old;
    const next = updater(structuredClone(old));
    next.audit.unshift(`${new Date().toLocaleString('ar-IQ')} - ${actor}`);
    writeDbToDisk(next);
    return next;
  });
  const reset = async () => {
    const next = await createDefaultDb();
    next.audit.unshift(`${new Date().toLocaleString('ar-IQ')} - تم تصفير النظام`);
    await writeDbToDisk(next);
    setDb(next);
  };
  return { db, save, reset };
}

function App() {
  const { db, save, reset } = useDb();
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState('home');
  const [query, setQuery] = useState('');
  const [dark, setDark] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  if (!db) return <main className="loading">جاري تحميل قاعدة البيانات...</main>;
  if (!user) return <Login db={db} onLogin={setUser} />;
  const props = { db, save, reset, user, query, onLogout: () => setUser(null), onHome: () => setView('home') };
  return <div className="app">
    <aside className="nav">
      <div className="brand"><Shield /> <span>وكيل التموين</span></div>
      {[
        ['home', Home, 'الرئيسية'], ['families', Users, 'العوائل'], ['items', Boxes, 'المواد'],
        ['meals', ClipboardList, 'الوجبات'], ['deliver', Truck, 'التوزيع'], ['stock', Archive, 'المخزون'],
        ['reports', BarChart3, 'التقارير'], ['settings', Settings, 'الإعدادات']
      ].map(([id, Icon, label]: any) => <button className={view === id ? 'active' : ''} onClick={() => setView(id)} key={id}><Icon size={20}/>{label}</button>)}
      <button onClick={() => setDark(!dark)}>{dark ? <Sun size={20}/> : <Moon size={20}/>}الوضع</button>
      <button onClick={() => setUser(null)}><LogOut size={20}/>خروج</button>
    </aside>
    <main className="main">
      <header className="top">
        <div className="search"><Search size={20}/><input placeholder="بحث سريع: اسم، بطاقة، هاتف، منطقة" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <div className="user">{user.name} - {user.role === 'agent' ? 'وكيل' : 'موظف'}</div>
      </header>
      {view === 'home' && <HomePage {...props}/>}
      {view === 'families' && <FamiliesPage {...props}/>}
      {view === 'items' && <ItemsPage {...props}/>}
      {view === 'meals' && <MealsPage {...props}/>}
      {view === 'deliver' && <DeliverPage {...props}/>}
      {view === 'stock' && <StockPage {...props}/>}
      {view === 'reports' && <ReportsPage {...props}/>}
      {view === 'settings' && <SettingsPage {...props}/>}
    </main>
  </div>;
}

function Login({ db, onLogin }: { db: Db; onLogin: (u: User) => void }) {
  const [username, setUsername] = useState('agent');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const hash = await hashPassword(password);
    const found = db.users.find(u => u.username === username && u.passwordHash === hash && u.active);
    found ? onLogin(found) : setError('بيانات الدخول غير صحيحة');
  }
  return <main className="login">
    <form onSubmit={submit} className="loginBox">
      <Shield size={44}/><h1>وكيل البطاقة التموينية</h1>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="اسم المستخدم" />
      <input value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" type="password" />
      {error && <p className="error">{error}</p>}
      <button className="primary">تسجيل الدخول</button>
      <small>الحسابات التجريبية: agent / 123456 و employee / 123456</small>
    </form>
  </main>;
}

const filteredFamilies = (db: Db, q: string) => db.families.filter(f => [f.headName, f.cardNo, f.phone, f.area].join(' ').includes(q.trim()));
const mealItems = (db: Db, meal: Meal) => db.items.filter(i => meal.itemIds.includes(i.id));
const qtyFor = (family: Family, item: Item) => item.perFamily + (item.perPerson * family.membersCount);
const deliveredForItem = (db: Db, itemId: string) => db.deliveries.reduce((s, d) => s + (d.quantities[itemId] || 0), 0);

function HomePage({ db, query }: any) {
  const activeMeal = db.meals[0];
  const received = new Set(db.deliveries.filter((d: Delivery) => d.mealId === activeMeal?.id).map((d: Delivery) => d.familyId));
  const low = db.items.filter((i: Item) => (i.received - deliveredForItem(db, i.id)) / Math.max(i.received, 1) * 100 <= db.settings.lowStockPercent);
  return <section>
    <h2>الرئيسية</h2>
    <div className="stats">
      <Stat label="العوائل" value={db.families.length}/><Stat label="الأفراد" value={db.families.reduce((s: number, f: Family) => s + f.membersCount, 0)}/>
      <Stat label="استلمت" value={received.size}/><Stat label="لم تستلم" value={Math.max(db.families.length - received.size, 0)}/>
      <Stat label="المواد" value={db.items.length}/><Stat label="النتائج المطابقة" value={filteredFamilies(db, query).length}/>
    </div>
    <div className="grid two">
      <Panel title="آخر عمليات التسليم">{db.deliveries.slice(0, 6).map((d: Delivery) => <Row key={d.id} a={db.families.find((f: Family) => f.id === d.familyId)?.headName || ''} b={fmt(d.deliveredAt)} />)}</Panel>
      <Panel title="التنبيهات">{low.map((i: Item) => <p className="warn" key={i.id}><AlertTriangle size={18}/> قرب نفاد {i.name}</p>)}{!low.length && <p>لا توجد تنبيهات حالية</p>}</Panel>
    </div>
  </section>;
}

function Stat({ label, value }: any) { return <div className="stat"><strong>{value}</strong><span>{label}</span></div>; }
function Panel({ title, children }: any) { return <div className="panel"><h3>{title}</h3>{children}</div>; }
function Row({ a, b }: any) { return <div className="row"><span>{a}</span><b>{b}</b></div>; }

function FamiliesPage({ db, save, user, query }: any) {
  const blank = { cardNo: '', centerNo: '', headName: '', phone: '', area: '', address: '', membersCount: 1, memberNames: '', status: 'نشطة', notes: '' };
  const [form, setForm] = useState<any>(blank);
  const [edit, setEdit] = useState('');
  const list = filteredFamilies(db, query).sort((a, b) => a.area.localeCompare(b.area) || a.cardNo.localeCompare(b.cardNo));
  const submit = () => save((d: Db) => {
    if (edit) d.families = d.families.map(f => f.id === edit ? { ...f, ...form, membersCount: Number(form.membersCount) } : f);
    else d.families.unshift({ id: uid(), ...form, membersCount: Number(form.membersCount), createdAt: today() });
    return d;
  }, `${user.name} حفظ عائلة`);
  return <section><h2>إدارة العوائل</h2><Editor fields={['cardNo:رقم البطاقة','centerNo:رقم المركز','headName:رب الأسرة','phone:الهاتف','area:المنطقة','address:العنوان','membersCount:عدد الأفراد','memberNames:أسماء الأفراد','notes:ملاحظات']} form={form} setForm={setForm} onSubmit={submit} />
    <div className="cards">{list.map(f => <div className="item" key={f.id}><h3>{f.headName}</h3><p>{f.cardNo} - {f.phone} - {f.area}</p><p>{f.membersCount} أفراد - {f.status}</p><div className="actions"><button onClick={() => { setEdit(f.id); setForm(f); }}><Save size={18}/>تعديل</button><button onClick={() => save((d: Db) => { d.families = d.families.map(x => x.id === f.id ? { ...x, status: x.status === 'نشطة' ? 'متوقفة' : 'نشطة' } : x); return d; }, `${user.name} غيّر حالة عائلة`)}><AlertTriangle size={18}/>إيقاف</button>{user.role === 'agent' && <button className="danger" onClick={() => confirm('تأكيد حذف العائلة؟') && save((d: Db) => { d.families = d.families.filter(x => x.id !== f.id); return d; }, `${user.name} حذف عائلة`)}><Trash2 size={18}/>حذف</button>}</div></div>)}</div></section>;
}

function Editor({ fields, form, setForm, onSubmit }: any) {
  return <div className="editor">{fields.map((x: string) => { const [k, l] = x.split(':'); return <input key={k} type={k.includes('Count') ? 'number' : 'text'} value={form[k] ?? ''} placeholder={l} onChange={e => setForm({ ...form, [k]: e.target.value })}/>; })}<button className="primary" onClick={onSubmit}><Plus size={18}/>حفظ</button></div>;
}

function ItemsPage({ db, save, user }: any) {
  const [form, setForm] = useState<any>({ name: '', unit: 'كغم', received: 0, perPerson: 0, perFamily: 0, mealNo: '', receivedAt: today().slice(0,10), notes: '' });
  return <section><h2>إدارة المواد</h2><Editor fields={['name:اسم المادة','unit:وحدة القياس','received:الكمية المستلمة','perPerson:حصة الفرد','perFamily:حصة العائلة','mealNo:رقم الوجبة','receivedAt:تاريخ الاستلام','notes:ملاحظات']} form={form} setForm={setForm} onSubmit={() => save((d: Db) => { d.items.unshift({ id: uid(), ...form, received: +form.received, perPerson: +form.perPerson, perFamily: +form.perFamily }); return d; }, `${user.name} أضاف مادة`)} />
  <div className="cards">{db.items.map((i: Item) => <div className="item" key={i.id}><h3>{i.name}</h3><p>مستلم: {i.received} {i.unit} - للفرد: {i.perPerson} - للعائلة: {i.perFamily}</p><p>موزع: {deliveredForItem(db, i.id)} - متبقي: {i.received - deliveredForItem(db, i.id)}</p></div>)}</div></section>;
}

function MealsPage({ db, save, user }: any) {
  const [form, setForm] = useState<any>({ no: '', month: '', year: new Date().getFullYear(), receivedAt: today().slice(0,10), status: 'جديدة', notes: '' });
  return <section><h2>إدارة الوجبات</h2><Editor fields={['no:رقم الوجبة','month:الشهر','year:السنة','receivedAt:تاريخ الاستلام','status:الحالة','notes:ملاحظات']} form={form} setForm={setForm} onSubmit={() => save((d: Db) => { d.meals.unshift({ id: uid(), ...form, year: +form.year, itemIds: d.items.filter(i => i.mealNo === form.no).map(i => i.id) }); return d; }, `${user.name} أضاف وجبة`)} />
  <div className="cards">{db.meals.map((m: Meal) => <div className="item" key={m.id}><h3>وجبة {m.no}</h3><p>{m.month} {m.year} - {m.status}</p><p>{mealItems(db, m).map((i: Item) => i.name).join('، ')}</p></div>)}</div></section>;
}

function DeliverPage({ db, save, user, query }: any) {
  const [familyId, setFamilyId] = useState('');
  const meal = db.meals[0];
  const family = db.families.find((f: Family) => f.id === familyId) || filteredFamilies(db, query)[0];
  const duplicate = family && meal && db.deliveries.some((d: Delivery) => d.familyId === family.id && d.mealId === meal.id);
  const items = meal ? mealItems(db, meal) : [];
  const submit = (override = false) => family && meal && save((d: Db) => {
    d.deliveries.unshift({ id: uid(), familyId: family.id, mealId: meal.id, itemIds: items.map(i => i.id), quantities: Object.fromEntries(items.map(i => [i.id, qtyFor(family, i)])), employeeId: user.id, deliveredAt: today(), notes: '', override });
    return d;
  }, `${user.name} سجل تسليم`);
  return <section><h2>توزيع المواد</h2><select value={family?.id || ''} onChange={e => setFamilyId(e.target.value)}>{filteredFamilies(db, query).map((f: Family) => <option value={f.id} key={f.id}>{f.headName} - {f.cardNo}</option>)}</select>
  {family && <Panel title={`العائلة: ${family.headName}`}><p>رقم البطاقة: {family.cardNo} - عدد الأفراد: {family.membersCount}</p>{duplicate && <p className="warn"><AlertTriangle size={18}/> هذه العائلة استلمت الوجبة سابقًا</p>}{items.map((i: Item) => <Row key={i.id} a={i.name} b={`${qtyFor(family, i)} ${i.unit}`} />)}<button className="primary" disabled={duplicate} onClick={() => submit(false)}><Check size={18}/>تسجيل التسليم</button>{duplicate && user.role === 'agent' && <button onClick={() => submit(true)}><Shield size={18}/>تسجيل بصلاحية الوكيل</button>}</Panel>}</section>;
}

function StockPage({ db }: any) {
  return <section><h2>المخزون</h2><div className="cards">{db.items.map((i: Item) => { const out = deliveredForItem(db, i.id), left = i.received - out, pct = Math.round(out / Math.max(i.received, 1) * 100); return <div className="item" key={i.id}><h3>{i.name}</h3><p>مستلم {i.received}، موزع {out}، متبقي {left} {i.unit}</p><progress value={pct} max={100}/><p>نسبة التوزيع {pct}%</p></div>; })}</div></section>;
}

function ReportsPage({ db }: any) {
  const active = db.meals[0];
  const got = new Set(db.deliveries.filter((d: Delivery) => d.mealId === active?.id).map((d: Delivery) => d.familyId));
  const report = { settings: db.settings, receivedFamilies: db.families.filter((f: Family) => got.has(f.id)), pendingFamilies: db.families.filter((f: Family) => !got.has(f.id)), items: db.items.map((i: Item) => ({ name: i.name, received: i.received, distributed: deliveredForItem(db, i.id), remaining: i.received - deliveredForItem(db, i.id) })), deliveries: db.deliveries };
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })); a.download = 'ration-report.json'; a.click(); };
  return <section><h2>التقارير</h2><div className="stats"><Stat label="العوائل المستلمة" value={report.receivedFamilies.length}/><Stat label="غير المستلمة" value={report.pendingFamilies.length}/><Stat label="الأفراد المستفيدون" value={db.families.reduce((s: number, f: Family) => s + f.membersCount, 0)}/></div><button className="primary" onClick={download}><Download size={18}/>تصدير ومشاركة التقرير</button><Panel title="حسب الموظف">{db.users.map((u: User) => <Row key={u.id} a={u.name} b={db.deliveries.filter((d: Delivery) => d.employeeId === u.id).length}/>)}</Panel></section>;
}

function SettingsPage({ db, save, reset, user, onLogout, onHome }: any) {
  const [settings, setSettings] = useState(db.settings);
  const [newUser, setNewUser] = useState({ username: '', name: '', password: '123456', role: 'employee' as Role });
  const backup = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db)], { type: 'application/json' })); a.download = 'ration-backup.json'; a.click(); };
  const restore = (file: File) => file.text().then(text => save(() => JSON.parse(text), `${user.name} استرجع نسخة احتياطية`));
  const resetSystem = async () => {
    const ok = confirm('تأكيد فرمته النظام؟ سيتم مسح بيانات العوائل والمواد والوجبات والتسليمات وإرجاع حسابات الدخول الافتراضية.');
    if (!ok) return;
    await reset();
    onLogout();
    onHome();
    alert('تمت فرمته النظام. يمكنك الدخول بالحساب الافتراضي agent / 123456');
  };
  const addUser = async () => {
    const passwordHash = await hashPassword(newUser.password);
    save((d: Db) => {
      d.users.push({ id: uid(), username: newUser.username, name: newUser.name, role: newUser.role, passwordHash, active: true });
      return d;
    }, `${user.name} أضاف مستخدم`);
  };
  return <section><h2>الإعدادات</h2><Editor fields={['agentName:اسم الوكيل','agentNo:رقم الوكيل','area:المنطقة','phone:الهاتف','centerName:اسم المركز','lowStockPercent:نسبة تنبيه المخزون']} form={settings} setForm={setSettings} onSubmit={() => save((d: Db) => { d.settings = { ...settings, lowStockPercent: +settings.lowStockPercent }; return d; }, `${user.name} حفظ الإعدادات`)} />
  <div className="grid two"><Panel title="إدارة المستخدمين"><Editor fields={['username:اسم المستخدم','name:الاسم','password:كلمة المرور','role:الصلاحية']} form={newUser} setForm={setNewUser} onSubmit={addUser} />{db.users.map((u: User) => <Row key={u.id} a={`${u.name} (${u.username})`} b={u.role}/>)}</Panel><Panel title="النسخ الاحتياطي والمزامنة"><button onClick={backup}><Download size={18}/>نسخة احتياطية</button><label className="file"><Upload size={18}/>استرجاع<input type="file" accept="application/json" onChange={e => e.target.files?.[0] && restore(e.target.files[0])}/></label><label><input type="checkbox" checked={settings.syncEnabled} onChange={e => setSettings({...settings, syncEnabled: e.target.checked})}/> مزامنة سحابية مستقبلية</label>{user.role === 'agent' && <div className="resetBox"><h3>فرمته النظام</h3><p>يمسح كل البيانات الحالية ويرجع النظام إلى البيانات والحسابات الافتراضية.</p><button className="danger" onClick={resetSystem}><Trash2 size={18}/>فرمته النظام</button></div>}</Panel></div></section>;
}

createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./public-sw.js');
  });
}
