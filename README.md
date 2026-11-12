# Doç. Dr. Mesut Karıksız web sitesi

Site, Node.js/Express sunucusu ve MongoDB ile çalışır. Sıkça sorulan sorular yönetim panelinden eklenebilir, düzenlenebilir ve silinebilir; ziyaretçiler yanıtları açılır kutularda görüntüler. İletişim formu gönderileri MongoDB'de saklanır ve admin panelinden okunup silinebilir.

## Gereksinimler

- Node.js 20 veya üzeri
- MongoDB (yerel kurulum veya MongoDB Atlas)

## Kurulum ve çalıştırma

1. Bağımlılıkları yükleyin:

   ```sh
   npm install
   ```

2. `.env.example` dosyasını `.env` olarak kopyalayın. MongoDB bağlantı adresini, en az 32 karakterli rastgele `SESSION_SECRET` değerini ve ilk yönetici için `ADMIN_USERNAME` / en az 8 karakterli `ADMIN_PASSWORD` değerlerini girin. `.env` dosyası Git'e eklenmez.

3. Sunucuyu başlatın:

   ```sh
   npm start
   ```

   Geliştirme sırasında `npm run dev` komutuyla dosya değişikliklerinde otomatik yeniden başlatmayı kullanabilirsiniz.

4. Siteyi `http://localhost:3000`, yönetim panelini `http://localhost:3000/admin` adresinden açın. İlk yönetici hesabı, veritabanında yönetici yoksa başlangıçta oluşturulur. Sonraki açılışlarda ortam değişkenleri mevcut yönetici parolasını değiştirmez.

## Güvenlik ve içerik

- Yönetici hesabı herkese açık kayıt formuyla oluşturulmaz.
- Yönetici parolaları bcrypt ile hash'lenerek saklanır.
- Yönetici oturumları MongoDB'de tutulur; oturum çerezi `HttpOnly` ve `SameSite=Strict` olarak ayarlanır.
- Giriş denemeleri sınırlandırılır; SSS oluşturma, düzenleme ve silme istekleri CSRF token'ı ister.
- İletişim formu gönderimleri CSRF korumalıdır, hız sınırına tabidir ve yalnızca yönetici oturumuyla görüntülenebilir.
- SSS içeriği düz metindir. Ön yüzde kullanıcı içeriği HTML olarak yorumlanmaz.
- `MONGODB_URI` üretimde TLS kullanan, sadece gerekli veritabanı izinleri olan bir kullanıcıya ait bağlantı adresi olmalıdır.

Testleri çalıştırmak için `npm test` komutunu kullanın.
