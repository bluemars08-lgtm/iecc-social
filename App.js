import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, View, Text, ScrollView, TouchableOpacity,
  TextInput, Switch, StatusBar, StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import * as api from './api';

try { WebBrowser.maybeCompleteAuthSession(); } catch (e) {}

/* ===== Crash guard (shows the error instead of a black screen) ===== */
function ErrorView({ error }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B0B', padding: 24, justifyContent: 'center' }}>
      <Text style={{ color: '#C0D328', fontSize: 18, fontWeight: '700', marginBottom: 10, textAlign: 'center' }}>حصل خطأ في التطبيق</Text>
      <Text selectable style={{ color: '#F4F4F4', fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
        {String((error && error.message) || error)}
      </Text>
    </View>
  );
}
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() { return this.state.error ? <ErrorView error={this.state.error} /> : this.props.children; }
}

/* ===== IECC design tokens ===== */
const C = {
  bg: '#0B0B0B', card: '#161616', inset: '#0B0B0B', border: '#262626',
  text: '#F4F4F4', mute: '#A3A3A3', accent: '#C0D328', accentDim: '#d6e36a', dark: '#101010',
};
const PLAT = {
  facebook:  { label: 'فيسبوك',   icon: 'logo-facebook',  color: '#1877F2' },
  instagram: { label: 'إنستجرام', icon: 'logo-instagram', color: '#E4405F' },
  tiktok:    { label: 'تيك توك',  icon: 'logo-tiktok',    color: '#F4F4F4' },
  snapchat:  { label: 'سناب شات', icon: 'logo-snapchat',  color: '#FFC400' },
  linkedin:  { label: 'لينكدإن',  icon: 'logo-linkedin',  color: '#0077B5' },
};
const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
const fmtDateTime = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const tomorrowAt = (h) => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(h, 0, 0, 0); return d; };

function Card({ children, style }) { return <View style={[s.card, style]}>{children}</View>; }
function H1({ children }) { return <Text style={s.h1}>{children}</Text>; }

/* ===== Auth ===== */
function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const data = mode === 'login'
        ? await api.login(email.trim(), password)
        : await api.register({ name, email: email.trim(), password, business_name: business });
      onAuthed(data.user);
    } catch (e) {
      Alert.alert('تنبيه', e.message || 'حصل خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.authWrap} keyboardShouldPersistTaps="handled">
        <Text style={s.authLogo}>IECC<Text style={{ color: C.accent }}>.</Text><Text style={s.authLogoSub}>  سوشيال</Text></Text>
        <Text style={s.authTagline}>منصاتك كلها في مكان واحد</Text>
        <View style={s.authCard}>
          <View style={s.segment}>
            <TouchableOpacity style={[s.segBtn, mode === 'login' && s.segOn]} onPress={() => setMode('login')}>
              <Text style={[s.segText, mode === 'login' && s.segTextOn]}>دخول</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.segBtn, mode === 'register' && s.segOn]} onPress={() => setMode('register')}>
              <Text style={[s.segText, mode === 'register' && s.segTextOn]}>حساب جديد</Text>
            </TouchableOpacity>
          </View>
          {mode === 'register' && (
            <>
              <TextInput style={s.input} placeholder="الاسم" placeholderTextColor="#666" value={name} onChangeText={setName} textAlign="right" />
              <TextInput style={s.input} placeholder="اسم النشاط (اختياري)" placeholderTextColor="#666" value={business} onChangeText={setBusiness} textAlign="right" />
            </>
          )}
          <TextInput style={s.input} placeholder="الإيميل" placeholderTextColor="#666" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textAlign="right" />
          <TextInput style={s.input} placeholder="كلمة المرور" placeholderTextColor="#666" value={password} onChangeText={setPassword} secureTextEntry textAlign="right" />
          <TouchableOpacity style={s.authBtn} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color={C.dark} /> : <Text style={s.authBtnText}>{mode === 'login' ? 'دخول' : 'إنشاء حساب'}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ===== Home ===== */
function HomeScreen({ user }) {
  const [stats, setStats] = useState({ connected: 0, scheduled: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [acc, sch] = await Promise.all([api.getAccounts().catch(() => null), api.getSchedule().catch(() => null)]);
      const connected = acc ? acc.platforms.reduce((n, p) => n + (p.count || 0), 0) : 0;
      const scheduled = sch ? sch.scheduled.filter((x) => x.status === 'pending').length : 0;
      setStats({ connected, scheduled });
    } catch {}
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const kpis = [
    { label: 'حسابات مربوطة', value: String(stats.connected) },
    { label: 'منشورات مجدولة', value: String(stats.scheduled) },
    { label: 'ردود AI هذا الشهر', value: String(user?.ai_used ?? 0), accent: true },
    { label: 'حد الباقة', value: user?.ai_limit >= 1000000 ? '∞' : String(user?.ai_limit ?? 0) },
  ];
  return (
    <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
      <Text style={s.greeting}>أهلاً، {user?.business_name || user?.name || 'بك'} 👋</Text>
      <H1>نظرة عامة</H1>
      <View style={s.kpiGrid}>
        {kpis.map((k, i) => (
          <View key={i} style={s.kpiCard}>
            <Text style={s.kpiLabel}>{k.label}</Text>
            <Text style={[s.kpiValue, k.accent && { color: C.accent }]}>{k.value}</Text>
          </View>
        ))}
      </View>
      <Card>
        <Text style={s.cardTitle}>ابدأ من هنا</Text>
        <View style={[s.actRow, s.divider]}><Ionicons name="link" size={18} color={C.accent} /><Text style={s.actText}>اربط حساباتك من تبويب "الحسابات"</Text></View>
        <View style={[s.actRow, s.divider]}><Ionicons name="create" size={18} color={C.accent} /><Text style={s.actText}>اكتب وانشر بالـ AI من تبويب "نشر"</Text></View>
        <View style={s.actRow}><Ionicons name="chatbubble-ellipses" size={18} color={C.accent} /><Text style={s.actText}>رُد على عملائك من تبويب "الردود"</Text></View>
      </Card>
    </ScrollView>
  );
}

/* ===== Compose ===== */
function ComposeScreen({ user }) {
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [schedAt, setSchedAt] = useState(new Date(Date.now() + 3600 * 1000));
  const [scheduling, setScheduling] = useState(false);
  const [on, setOn] = useState({ facebook: true, instagram: false, tiktok: false, snapchat: false, linkedin: false });
  const toggle = (k) => setOn((o) => ({ ...o, [k]: !o[k] }));
  const selected = () => Object.keys(on).filter((k) => on[k]);

  const writeAI = async () => {
    if (!text.trim()) { Alert.alert('تنبيه', 'اكتب فكرة المنشور الأول، والـ AI يكتبه لك.'); return; }
    const platform = selected()[0] || 'instagram';
    setLoading(true);
    try {
      const r = await api.aiCaption({ brief: text.trim(), platform, tone: user?.default_tone || '', business_name: user?.business_name || '' });
      const tags = (r.hashtags || []).join(' ');
      setText(r.caption + (tags ? `\n\n${tags}` : ''));
    } catch (e) { Alert.alert('تنبيه', e.message); } finally { setLoading(false); }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('تنبيه', 'محتاجين إذن الوصول للصور.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (res.canceled) return;
    setUploadingImg(true);
    try { const r = await api.uploadImage(res.assets[0].uri); setImageUrl(r.url); }
    catch (e) { Alert.alert('تنبيه', e.message); } finally { setUploadingImg(false); }
  };

  const reset = () => { setText(''); setImageUrl(''); setOn({ facebook: true, instagram: false, tiktok: false, snapchat: false, linkedin: false }); };

  const publish = async () => {
    if (!text.trim() && !imageUrl) { Alert.alert('تنبيه', 'اكتب المنشور أو أضف صورة.'); return; }
    const platforms = selected();
    if (!platforms.length) { Alert.alert('تنبيه', 'اختر منصة واحدة على الأقل.'); return; }
    setPublishing(true);
    try {
      const r = await api.publish({ message: text.trim(), platforms, image_url: imageUrl || undefined });
      const ok = (r.results || []).filter((x) => x.ok).length;
      const fail = (r.results || []).filter((x) => !x.ok);
      let msg = ok ? `تم النشر على ${ok} حساب ✅` : 'لم يتم النشر.';
      if (fail.length) msg += '\n\n' + fail.map((f) => `• ${f.platform}: ${f.error}`).join('\n');
      Alert.alert(ok ? 'تم' : 'تنبيه', msg);
      if (ok) reset();
    } catch (e) { Alert.alert('تنبيه', e.message); } finally { setPublishing(false); }
  };

  const doSchedule = async () => {
    if (!text.trim() && !imageUrl) { Alert.alert('تنبيه', 'اكتب المنشور أو أضف صورة.'); return; }
    const platforms = selected();
    if (!platforms.length) { Alert.alert('تنبيه', 'اختر منصة واحدة على الأقل.'); return; }
    setScheduling(true);
    try {
      await api.schedulePost({ message: text.trim(), image_url: imageUrl || undefined, platforms, run_at: fmtDateTime(schedAt) });
      Alert.alert('تم', `اتجدول المنشور ليوم ${fmtDateTime(schedAt)} ✅`);
      setShowPicker(false); reset();
    } catch (e) { Alert.alert('تنبيه', e.message); } finally { setScheduling(false); }
  };

  return (
    <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <H1>إنشاء منشور</H1>
      <Card style={{ padding: 12 }}>
        <TextInput style={s.textarea} placeholder="اكتب فكرة المنشور... والـ AI يكتبه لك باللهجة السعودية" placeholderTextColor="#666" multiline value={text} onChangeText={setText} textAlign="right" />
        {imageUrl ? (
          <View style={s.thumbWrap}>
            <Image source={{ uri: imageUrl }} style={s.thumb} />
            <TouchableOpacity style={s.removeThumb} onPress={() => setImageUrl('')}><Ionicons name="close" size={16} color="#fff" /></TouchableOpacity>
          </View>
        ) : null}
        <View style={s.composeTools}>
          <TouchableOpacity style={s.aiBtn} onPress={writeAI} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color={C.dark} /> : <Ionicons name="sparkles" size={15} color={C.dark} />}
            <Text style={s.aiBtnText}>اكتب بالـ AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ghostBtn} onPress={pickImage} disabled={uploadingImg}>
            {uploadingImg ? <ActivityIndicator size="small" color={C.text} /> : <Ionicons name="image-outline" size={15} color={C.text} />}
            <Text style={s.ghostBtnText}>صورة</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <Text style={s.sectionLabel}>انشر على</Text>
      <View style={s.chipsWrap}>
        {Object.entries(PLAT).map(([k, p]) => (
          <TouchableOpacity key={k} style={[s.pchip, on[k] && s.pchipOn]} onPress={() => toggle(k)}>
            <Ionicons name={p.icon} size={15} color={p.color} />
            <Text style={[s.pchipText, !on[k] && { opacity: 0.55 }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.actionRow}>
        <TouchableOpacity style={[s.bigBtn, s.bigGhost]} onPress={() => setShowPicker((v) => !v)}>
          <Ionicons name="calendar-outline" size={17} color={C.text} /><Text style={s.bigGhostText}>جدولة</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.bigBtn, s.bigPrimary]} onPress={publish} disabled={publishing}>
          {publishing ? <ActivityIndicator size="small" color={C.dark} /> : <Ionicons name="send" size={17} color={C.dark} />}
          <Text style={s.bigPrimaryText}>انشر الآن</Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <Card style={{ marginTop: 12 }}>
          <Text style={s.cardTitle}>اختر وقت النشر</Text>
          <View style={s.chipsWrap}>
            {[
              { label: 'بعد ساعة', d: new Date(Date.now() + 3600 * 1000) },
              { label: 'بعد ٣ ساعات', d: new Date(Date.now() + 3 * 3600 * 1000) },
              { label: 'بكرة ١٢ ظهراً', d: tomorrowAt(12) },
              { label: 'بكرة ٧ مساءً', d: tomorrowAt(19) },
            ].map((o, i) => {
              const sel = fmtDateTime(o.d) === fmtDateTime(schedAt);
              return (
                <TouchableOpacity key={i} style={[s.pchip, sel && s.pchipOn]} onPress={() => setSchedAt(o.d)}>
                  <Text style={s.pchipText}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ color: C.mute, fontSize: 12, textAlign: 'center', marginVertical: 8 }}>الموعد: {fmtDateTime(schedAt)}</Text>
          <TouchableOpacity style={s.subscribeBtn} onPress={doSchedule} disabled={scheduling}>
            {scheduling ? <ActivityIndicator color={C.dark} /> : <Text style={s.subscribeText}>أكّد الجدولة</Text>}
          </TouchableOpacity>
        </Card>
      )}
    </ScrollView>
  );
}

/* ===== Inbox ===== */
const SAMPLE_COMMENTS = [
  { comment_id: null, platform: 'instagram', user: '@sara.q', time: 'تجريبي', message: 'كم سعر المنتج ده؟ وفيه توصيل للرياض؟', ai: null, busy: false, sample: true },
  { comment_id: null, platform: 'facebook', user: 'Ahmed M.', time: 'تجريبي', message: 'المنتج وصلني وايد حلو، شكراً 🙏', ai: null, busy: false, sample: true },
];

function InboxScreen({ user }) {
  const [auto, setAuto] = useState(false);
  const [items, setItems] = useState(null);
  const [connected, setConnected] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const r = await api.getComments();
      setConnected(r.connected || 0);
      if (r.comments && r.comments.length) {
        setItems(r.comments.map((c) => ({ ...c, ai: null, busy: false })));
      } else if (r.connected > 0) {
        setItems([]); // connected but no readable comments yet
      } else {
        setItems(SAMPLE_COMMENTS);
      }
    } catch {
      setConnected(0);
      setItems(SAMPLE_COMMENTS);
    }
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const setItem = (idx, patch) => setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const suggest = async (idx) => {
    setItem(idx, { busy: true });
    try {
      const r = await api.aiReply({ comment: items[idx].message, platform: items[idx].platform, tone: user?.default_tone || '', business_name: user?.business_name || '', post_context: items[idx].post_excerpt || '' });
      setItem(idx, { ai: r.reply, busy: false });
    } catch (e) { setItem(idx, { busy: false }); Alert.alert('تنبيه', e.message); }
  };

  const send = async (idx) => {
    const it = items[idx];
    if (it.sample || !it.comment_id) { Alert.alert('تجريبي', 'ده تعليق تجريبي. اربط حساباتك عشان ترد على تعليقات حقيقية.'); return; }
    setItem(idx, { busy: true });
    try {
      await api.replyComment({ platform: it.platform, account_id: it.account_id, comment_id: it.comment_id, message: it.ai });
      setItem(idx, { busy: false, sent: true });
      Alert.alert('تم', 'تم إرسال الرد ✅');
    } catch (e) { setItem(idx, { busy: false }); Alert.alert('تنبيه', e.message); }
  };

  if (!items) return <View style={s.center}><ActivityIndicator color={C.accent} /></View>;

  return (
    <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
      <View style={s.inboxHead}>
        <H1>صندوق الردود</H1>
        <View style={s.autoWrap}>
          <Text style={s.autoLabel}>رد تلقائي</Text>
          <Switch value={auto} onValueChange={setAuto} trackColor={{ false: C.border, true: C.accent }} thumbColor={C.dark} />
        </View>
      </View>
      {items[0]?.sample && (
        <Text style={s.subtitle}>دي تعليقات تجريبية — اربط حساباتك عشان تشوف تعليقاتك الحقيقية.</Text>
      )}

      {connected > 0 && items.length === 0 && (
        <Card>
          <Text style={s.cardTitle}>مفيش تعليقات جديدة</Text>
          <Text style={s.actText}>حساباتك مربوطة ✅ ومفيش تعليقات على آخر منشوراتك حالياً. اسحب لتحديث، وأول ما يجيك تعليق هيظهر هنا وتقدر ترد عليه بالـ AI.</Text>
        </Card>
      )}

      {items.map((it, i) => {
        const p = PLAT[it.platform] || PLAT.facebook;
        return (
          <Card key={i} style={{ marginBottom: 10 }}>
            <View style={s.cmtHead}>
              <Ionicons name={p.icon} size={16} color={p.color} />
              <Text style={s.cmtUser}>{it.user}</Text>
              <Text style={s.cmtTime}>{it.time}</Text>
            </View>
            <Text style={s.cmtMsg}>{it.message}</Text>
            {it.post_excerpt ? (
              <View style={s.postCtx}>
                <Ionicons name="document-text-outline" size={12} color={C.mute} />
                <Text style={s.postCtxText} numberOfLines={2}>على منشور: {it.post_excerpt}</Text>
              </View>
            ) : null}

            {it.ai ? <View style={s.aiBox}><Text style={s.aiBoxText}>✨ {it.ai}</Text></View> : (
              <TouchableOpacity style={s.suggestBtn} onPress={() => suggest(i)} disabled={it.busy}>
                {it.busy ? <ActivityIndicator size="small" color={C.accent} /> : <Ionicons name="sparkles" size={14} color={C.accent} />}
                <Text style={s.suggestText}>اقترح رد بالـ AI</Text>
              </TouchableOpacity>
            )}

            {it.ai && !it.sent && (
              <View style={s.cmtActions}>
                <TouchableOpacity style={[s.smBtn, s.smPrimary]} onPress={() => send(i)} disabled={it.busy}>
                  {it.busy ? <ActivityIndicator size="small" color={C.dark} /> : <Text style={s.smPrimaryText}>إرسال</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[s.smBtn, s.smGhost]} onPress={() => suggest(i)}><Text style={s.smGhostText}>اقتراح آخر</Text></TouchableOpacity>
              </View>
            )}
            {it.sent && <Text style={{ color: C.accent, fontSize: 12, textAlign: 'right', marginTop: 8 }}>تم الإرسال ✓</Text>}
          </Card>
        );
      })}
    </ScrollView>
  );
}

/* ===== Accounts ===== */
function AccountsScreen() {
  const [rows, setRows] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const load = () => api.getAccounts().then((d) => setRows(d.platforms)).catch(() => setRows(Object.keys(PLAT).map((k) => ({ platform: k, connected: false, count: 0 }))));
  useEffect(() => { load(); }, []);

  const connectMeta = async () => {
    setConnecting(true);
    try {
      const returnUrl = Linking.createURL('connected');
      const { url } = await api.oauthStartMeta(returnUrl);
      const res = await WebBrowser.openAuthSessionAsync(url, returnUrl);
      await load();
      if (res.type === 'success') Alert.alert('تم', 'تم ربط حساباتك ✅');
    } catch (e) { Alert.alert('تنبيه', e.message); } finally { setConnecting(false); }
  };
  const onConnect = (platform) => {
    if (platform === 'facebook' || platform === 'instagram') connectMeta();
    else Alert.alert('قريباً', 'هذه المنصة هتتفعّل قريباً.');
  };

  const disconnect = (platform) => {
    const label = PLAT[platform]?.label || platform;
    Alert.alert('فصل الحساب', `متأكد إنك عايز تفصل ${label}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'فصل', style: 'destructive', onPress: async () => {
        try { await api.disconnect(platform); await load(); }
        catch (e) { Alert.alert('تنبيه', e.message); }
      } },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
      <H1>ربط الحسابات</H1>
      <Text style={s.subtitle}>اربط فيسبوك وإنستجرام عشان تنشر وترد من مكان واحد</Text>

      <TouchableOpacity style={[s.bigBtn, s.bigGhost, { marginBottom: 14 }]} onPress={connectMeta} disabled={connecting}>
        {connecting ? <ActivityIndicator size="small" color={C.accent} /> : <Ionicons name="refresh" size={16} color={C.accent} />}
        <Text style={[s.bigGhostText, { color: C.accent }]}>إعادة الربط / تحديث الصلاحيات</Text>
      </TouchableOpacity>

      {!rows ? <View style={s.center}><ActivityIndicator color={C.accent} /></View> : rows.map((r, i) => {
        const p = PLAT[r.platform]; if (!p) return null;
        return (
          <View key={i} style={[s.accRow, r.connected && { borderColor: p.color }]}>
            <Ionicons name={p.icon} size={22} color={p.color} />
            <View style={{ flex: 1 }}>
              <Text style={s.accName}>{p.label}</Text>
              <Text style={[s.accSub, r.connected && { color: C.accent }]}>{r.connected ? `مربوط · ${r.count} حساب` : 'غير مربوط'}</Text>
            </View>
            {r.connected
              ? <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={20} color={C.accent} />
                  <TouchableOpacity style={s.disconnectBtn} onPress={() => disconnect(r.platform)}><Text style={s.disconnectText}>فصل</Text></TouchableOpacity>
                </View>
              : <TouchableOpacity style={s.connectBtn} onPress={() => onConnect(r.platform)} disabled={connecting}>
                  {connecting && (r.platform === 'facebook' || r.platform === 'instagram') ? <ActivityIndicator size="small" color={C.dark} /> : <Text style={s.connectBtnText}>ربط</Text>}
                </TouchableOpacity>}
          </View>
        );
      })}
    </ScrollView>
  );
}

/* ===== Plans ===== */
function PlansScreen({ user }) {
  const [plans, setPlans] = useState(null);
  useEffect(() => {
    api.getPlans().then((d) => setPlans(d.plans)).catch(() => setPlans([
      { key: 'starter', name: 'Starter', price_sar: 29, features: ['٣ صفحات', '٣٠٠ رد AI'] },
      { key: 'pro', name: 'Pro', price_sar: 79, popular: true, features: ['١٠ صفحات', '١٥٠٠ رد AI', 'جدولة'] },
      { key: 'agency', name: 'Agency', price_sar: 199, features: ['صفحات غير محدودة', 'فريق', 'ردود غير محدودة'] },
    ]));
  }, []);
  return (
    <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
      <H1>الاشتراك</H1>
      <Text style={s.subtitle}>السعر حسب عدد الصفحات المُدارة</Text>
      {!plans ? <View style={s.center}><ActivityIndicator color={C.accent} /></View> : plans.map((pl, i) => {
        const current = user?.plan === pl.key;
        return (
          <View key={i} style={[s.planCard, pl.popular && s.planPopular]}>
            {pl.popular && <View style={s.popBadge}><Text style={s.popBadgeText}>الأكثر طلباً</Text></View>}
            <View style={s.planTop}>
              <Text style={s.planName}>{pl.name}{current ? ' ✓' : ''}</Text>
              <Text style={s.planPrice}>{pl.price_sar}<Text style={s.planUnit}> ر.س/شهر</Text></Text>
            </View>
            <Text style={s.planSub}>{(pl.features || []).join(' · ')}</Text>
          </View>
        );
      })}
      <TouchableOpacity style={s.subscribeBtn} onPress={() => Alert.alert('قريباً', 'الاشتراك هيتفعّل عبر App Store.')}>
        <Text style={s.subscribeText}>اشترك الآن</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ===== Settings ===== */
function SettingsScreen({ user, setUser, onBack, onLogout }) {
  const [business, setBusiness] = useState(user?.business_name || '');
  const [tone, setTone] = useState(user?.default_tone || '');
  const [knowledge, setKnowledge] = useState(user?.knowledge || '');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const r = await api.updateProfile({ business_name: business, default_tone: tone, knowledge });
      setUser(r.user);
      Alert.alert('تم', 'تم حفظ البروفايل ✅');
    } catch (e) { Alert.alert('تنبيه', e.message); } finally { setSaving(false); }
  };
  return (
    <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
      <H1>الإعدادات</H1>
      <Text style={s.subtitle}>بياناتك دي بتحسّن جودة كتابة الـ AI</Text>
      <Card>
        <Text style={s.sectionLabel}>اسم النشاط</Text>
        <TextInput style={s.input} placeholder="مثلاً: كافيه دوز" placeholderTextColor="#666" value={business} onChangeText={setBusiness} textAlign="right" />
        <Text style={s.sectionLabel}>نبرة الكتابة المفضّلة</Text>
        <TextInput style={s.input} placeholder="مثلاً: حماسي / رسمي / ودّي" placeholderTextColor="#666" value={tone} onChangeText={setTone} textAlign="right" />
        <Text style={s.sectionLabel}>معلومات نشاطك (يتغذى بيها الـ AI)</Text>
        <Text style={{ fontSize: 11, color: C.mute, textAlign: 'right', marginBottom: 6 }}>اكتب منتجاتك وأسعارها، التوصيل، المواعيد، وأي تفاصيل — الـ AI هيستخدمها عشان يرد على عملائك صح.</Text>
        <TextInput style={[s.input, { minHeight: 140, textAlignVertical: 'top', paddingTop: 12 }]} placeholder={"مثال:\n- آيفون 15: 3200 ريال\n- سماعات: 150 ريال\n- التوصيل: 25 ريال داخل الرياض، يوم واحد\n- الدفع: مدى / تحويل"} placeholderTextColor="#666" value={knowledge} onChangeText={setKnowledge} multiline textAlign="right" />
        <TouchableOpacity style={[s.subscribeBtn, { marginTop: 6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={C.dark} /> : <Text style={s.subscribeText}>حفظ</Text>}
        </TouchableOpacity>
      </Card>
      <View style={{ marginTop: 14 }}>
        <Text style={s.accSub}>{user?.email}  ·  باقة {user?.plan}</Text>
      </View>
      <TouchableOpacity style={[s.bigBtn, s.bigGhost, { marginTop: 16 }]} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={17} color="#e26a6a" /><Text style={[s.bigGhostText, { color: '#e26a6a' }]}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ===== Shell ===== */
const TABS = [
  { key: 'home', label: 'الرئيسية', icon: 'home', Screen: HomeScreen },
  { key: 'compose', label: 'نشر', icon: 'create', Screen: ComposeScreen },
  { key: 'inbox', label: 'الردود', icon: 'chatbubble-ellipses', Screen: InboxScreen },
  { key: 'accounts', label: 'الحسابات', icon: 'link', Screen: AccountsScreen },
  { key: 'plans', label: 'الاشتراك', icon: 'star', Screen: PlansScreen },
];

function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('home');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const t = await api.getToken();
        if (t) {
          // Don't let a slow/hanging request keep the splash forever.
          const r = await Promise.race([
            api.me(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
          ]);
          setUser(r.user);
        }
      } catch {
        try { await api.logout(); } catch {}
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const doLogout = async () => { await api.logout(); setUser(null); setTab('home'); setSettingsOpen(false); };

  if (booting) {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <StatusBar barStyle="light-content" />
        <Text style={s.authLogo}>IECC<Text style={{ color: C.accent }}>.</Text></Text>
        <ActivityIndicator color={C.accent} style={{ marginTop: 12 }} />
      </SafeAreaView>
    );
  }
  if (!user) {
    return (<SafeAreaView style={s.safe}><StatusBar barStyle="light-content" /><AuthScreen onAuthed={setUser} /></SafeAreaView>);
  }

  const Active = TABS.find((t) => t.key === tab).Screen;
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <View style={s.headerCluster}>
          <TouchableOpacity style={s.bell} onPress={() => setSettingsOpen((v) => !v)}>
            <Ionicons name={settingsOpen ? 'close' : 'settings-outline'} size={18} color={C.accent} />
          </TouchableOpacity>
          <View style={s.bell}><Ionicons name="notifications-outline" size={18} color={C.mute} /></View>
        </View>
        <Text style={s.logo}>IECC<Text style={{ color: C.accent }}>.</Text><Text style={s.logoSub}>  سوشيال</Text></Text>
      </View>

      <View style={{ flex: 1 }}>
        {settingsOpen
          ? <SettingsScreen user={user} setUser={setUser} onBack={() => setSettingsOpen(false)} onLogout={doLogout} />
          : <Active user={user} />}
      </View>

      {!settingsOpen && (
        <View style={s.tabBar}>
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <TouchableOpacity key={t.key} style={s.tabItem} onPress={() => setTab(t.key)}>
                <Ionicons name={active ? t.icon : `${t.icon}-outline`} size={23} color={active ? C.accent : '#EDEDED'} />
                <Text style={[s.tabLabel, active && { color: C.accent }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

/* ===== Root: crash guard wrapper (default export) ===== */
export default function Root() {
  const [fatal, setFatal] = useState(null);
  useEffect(() => {
    const g = global.ErrorUtils;
    if (!g || !g.setGlobalHandler) return;
    const prev = g.getGlobalHandler && g.getGlobalHandler();
    g.setGlobalHandler((e) => { setFatal(e); if (prev) prev(e, false); });
    return () => { if (prev) g.setGlobalHandler(prev); };
  }, []);
  if (fatal) return <ErrorView error={fatal} />;
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

/* ===== Styles ===== */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  headerCluster: { flexDirection: 'row-reverse', gap: 8 },
  logo: { fontSize: 18, fontWeight: '900', color: C.text },
  logoSub: { fontSize: 13, fontWeight: '400', color: C.mute },
  bell: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  body: { paddingHorizontal: 16, paddingBottom: 24 },
  greeting: { fontSize: 13, color: C.mute, textAlign: 'right', marginBottom: 2 },
  h1: { fontSize: 22, fontWeight: '900', color: C.text, textAlign: 'right', marginBottom: 14 },
  subtitle: { fontSize: 12, color: C.mute, textAlign: 'right', marginBottom: 16, marginTop: -8 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: C.mute, textAlign: 'right', marginVertical: 8 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'right', marginBottom: 10 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14 },

  kpiGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 6 },
  kpiCard: { width: '48%', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 12, marginBottom: 10 },
  kpiLabel: { fontSize: 11, color: C.mute, textAlign: 'right' },
  kpiValue: { fontSize: 22, fontWeight: '900', color: C.text, textAlign: 'right', marginTop: 2 },

  actRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 9 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border },
  actText: { fontSize: 13, color: C.text, textAlign: 'right', flex: 1 },

  textarea: { minHeight: 110, color: C.text, fontSize: 14, textAlignVertical: 'top' },
  thumbWrap: { marginTop: 10, alignSelf: 'flex-start' },
  thumb: { width: 84, height: 84, borderRadius: 10 },
  removeThumb: { position: 'absolute', top: -6, left: -6, backgroundColor: '#000', borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  composeTools: { flexDirection: 'row-reverse', gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, marginTop: 10 },
  aiBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 120, justifyContent: 'center' },
  aiBtnText: { color: C.dark, fontWeight: '600', fontSize: 12 },
  ghostBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  ghostBtnText: { color: C.text, fontSize: 12 },

  chipsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pchip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7 },
  pchipOn: { borderColor: C.accent },
  pchipText: { color: C.text, fontSize: 12 },

  actionRow: { flexDirection: 'row-reverse', gap: 10 },
  bigBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13 },
  bigGhost: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  bigGhostText: { color: C.text, fontWeight: '600', fontSize: 14 },
  bigPrimary: { backgroundColor: C.accent },
  bigPrimaryText: { color: C.dark, fontWeight: '900', fontSize: 14 },

  inboxHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  autoWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  autoLabel: { fontSize: 11, color: C.mute },
  cmtHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 },
  cmtUser: { fontSize: 12, fontWeight: '600', color: C.text },
  cmtTime: { fontSize: 10, color: C.mute, marginRight: 'auto' },
  cmtMsg: { fontSize: 13, color: C.text, textAlign: 'right', marginBottom: 8 },
  postCtx: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: C.inset, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 10 },
  postCtxText: { flex: 1, fontSize: 11, color: C.mute, textAlign: 'right' },
  aiBox: { backgroundColor: C.inset, borderWidth: 1, borderColor: C.accent, borderStyle: 'dashed', borderRadius: 10, padding: 10, marginBottom: 8 },
  aiBoxText: { fontSize: 12, color: C.accentDim, textAlign: 'right', lineHeight: 19 },
  suggestBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: C.accent, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 9 },
  suggestText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  cmtActions: { flexDirection: 'row-reverse', gap: 8, marginTop: 8 },
  smBtn: { borderRadius: 9, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  smPrimary: { flex: 1, backgroundColor: C.accent },
  smPrimaryText: { color: C.dark, fontWeight: '600', fontSize: 12 },
  smGhost: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16 },
  smGhostText: { color: C.text, fontSize: 12 },

  accRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12, marginBottom: 10 },
  accName: { fontSize: 14, fontWeight: '600', color: C.text, textAlign: 'right' },
  accSub: { fontSize: 11, color: C.mute, textAlign: 'right' },
  connectBtn: { backgroundColor: C.accent, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 7 },
  connectBtnText: { color: C.dark, fontWeight: '600', fontSize: 12 },
  disconnectBtn: { borderWidth: 1, borderColor: '#e26a6a', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 6 },
  disconnectText: { color: '#e26a6a', fontWeight: '600', fontSize: 12 },

  planCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14, marginBottom: 10 },
  planPopular: { borderWidth: 2, borderColor: C.accent },
  popBadge: { position: 'absolute', top: -10, right: 14, backgroundColor: C.accent, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 2 },
  popBadgeText: { color: C.dark, fontSize: 10, fontWeight: '900' },
  planTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'baseline' },
  planName: { fontSize: 15, fontWeight: '600', color: C.text },
  planPrice: { fontSize: 22, fontWeight: '900', color: C.text },
  planUnit: { fontSize: 11, fontWeight: '400', color: C.mute },
  planSub: { fontSize: 12, color: C.mute, textAlign: 'right', marginTop: 6 },
  subscribeBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  subscribeText: { color: C.dark, fontWeight: '900', fontSize: 14 },

  tabBar: { flexDirection: 'row-reverse', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#2f2f2f', backgroundColor: '#141414', paddingTop: 8, paddingBottom: 10 },
  tabItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: '600', color: '#EDEDED' },

  authWrap: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  authLogo: { fontSize: 30, fontWeight: '900', color: C.text, textAlign: 'center' },
  authLogoSub: { fontSize: 18, fontWeight: '400', color: C.mute },
  authTagline: { fontSize: 13, color: C.mute, textAlign: 'center', marginTop: 6, marginBottom: 26 },
  authCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 18 },
  segment: { flexDirection: 'row-reverse', backgroundColor: C.inset, borderRadius: 12, padding: 4, marginBottom: 16 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segOn: { backgroundColor: C.accent },
  segText: { color: C.mute, fontWeight: '600', fontSize: 13 },
  segTextOn: { color: C.dark },
  input: { backgroundColor: C.inset, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 14, marginBottom: 10 },
  authBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  authBtnText: { color: C.dark, fontWeight: '900', fontSize: 15 },
});
