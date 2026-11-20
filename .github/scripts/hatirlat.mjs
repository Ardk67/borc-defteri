// Her sabah çalışır: hatırlatma günü gelen kayıtlar için kayıtlı telefonlara bildirim yollar.
import admin from 'firebase-admin';
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA)) });
const db = admin.firestore(), fcm = admin.messaging();
const simdi = Date.now();
const fmt = n => new Intl.NumberFormat('tr-TR',{maximumFractionDigits:3}).format(n);
const birim = (c,n) => c==='TL'?fmt(n)+' ₺':c==='USD'?fmt(n)+' $':c==='EUR'?fmt(n)+' €':fmt(n)+' gr has';
let toplam = 0;
for (const u of await db.collection('kullanicilar').listDocuments()) {
  const cihazlar = (await u.collection('cihazlar').get()).docs;
  if (!cihazlar.length) continue;
  const tokens = cihazlar.map(d => d.data().token);
  const isl = Object.fromEntries((await u.collection('isletmeler').get()).docs.map(d => [d.id, d.data().ad]));
  const gonderilen = Object.fromEntries((await u.collection('bildirimler').get()).docs.map(d => [d.id, d.data().vade]));
  const gelen = (await u.collection('kayitlar').get()).docs.map(d => d.data())
    .filter(k => k.vade && k.vade <= simdi && gonderilen[k.id] !== k.vade);
  if (!gelen.length) continue;
  const mesajlar = gelen.length <= 5
    ? gelen.map(k => ({ title: 'Borç Defteri' + (isl[k.isletme] ? ' · ' + isl[k.isletme] : ''),
        body: `${k.isim} — ${birim(k.cins, k.miktar)} (${k.tur === 'A' ? 'Alacaklı' : 'Borçlu'}) hatırlatma günü geldi`, tag: k.id }))
    : [{ title: 'Borç Defteri', body: `${gelen.length} kaydın hatırlatma günü geldi: ` + gelen.slice(0, 4).map(k => k.isim).join(', ') + '…', tag: 'toplu' }];
  const olu = new Set();
  for (const m of mesajlar) {
    const r = await fcm.sendEachForMulticast({ tokens, data: { ...m, url: './' }, webpush: { headers: { Urgency: 'high', TTL: '86400' } } });
    r.responses.forEach((x, i) => { if (!x.success && /registration-token-not-registered|invalid-argument|invalid-registration/.test(x.error?.code || '')) olu.add(i); });
    toplam += r.successCount;
  }
  for (const i of olu) await cihazlar[i].ref.delete();
  const b = db.batch();
  gelen.forEach(k => b.set(u.collection('bildirimler').doc(k.id), { vade: k.vade, tarih: simdi }));
  await b.commit();
}
console.log('Gönderilen bildirim:', toplam);
