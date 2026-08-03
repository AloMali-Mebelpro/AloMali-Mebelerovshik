# Мебелировщик Pro — сборка в Windows EXE и Android APK (пункт 6.8)

Файл `mebelirovshchik-ipad-6.html` — это готовое веб-приложение одним файлом.
Обе оболочки (Tauri и Capacitor) просто «заворачивают» его в нативное окно.
Ниже — полные конфиги (скопируйте содержимое блоков в файлы с указанными именами)
и пошаговые команды.

---

## Общая подготовка (для обеих платформ)

1. Установите Node.js LTS: https://nodejs.org (проверка: `node -v`, `npm -v`).
2. Создайте папку проекта в любом удобном месте на диске — например
   `C:\Projects\mebelirovshchik\` в Windows или `~/Projects/mebelirovshchik/` на Mac/Linux
   (важно: путь лучше без пробелов и без кириллицы — «Рабочий стол/Мои документы» иногда
   ломают сборщики Gradle/Rust). Внутри неё создайте папку `src/`.
   Все команды ниже выполняются из этой папки: откройте её в терминале
   (Windows: зайдите в папку в Проводнике → в адресной строке наберите `cmd` → Enter).
3. Скопируйте `mebelirovshchik-ipad-6.html` в `src/index.html`.
4. В корне создайте `package.json`:

```json
{
  "name": "mebelirovshchik-pro",
  "version": "6.0.0",
  "private": true,
  "scripts": {
    "tauri": "tauri",
    "cap": "cap"
  }
}
```

> Важно: приложение при первом запуске подгружает React/Three с cdnjs —
> нужен интернет при первом старте. Для полностью офлайн-сборки скачайте
> четыре библиотеки из тегов `<script src=...>` внутрь `src/` и замените
> ссылки на локальные (`./react.production.min.js` и т.д.) — это 10 минут работы.

---

## Windows EXE — Tauri

### Установка окружения (один раз)
1. Rust: https://rustup.rs → выполнить `rustup-init.exe`, всё по умолчанию.
2. Microsoft VS Build Tools (C++): https://visualstudio.microsoft.com/visual-cpp-build-tools/ → отметить «Desktop development with C++».
3. WebView2 Runtime обычно уже стоит в Windows 10/11.
4. `npm install -g @tauri-apps/cli`

### Файл `src-tauri/tauri.conf.json`
Выполните в корне `npx tauri init` (на вопросы: имя — Мебелировщик Pro,
окно — 1280×800, dev/dist path — `../src`), затем замените созданный
`src-tauri/tauri.conf.json` на:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Мебелировщик Pro",
  "version": "6.0.0",
  "identifier": "uz.mebel.pro",
  "build": {
    "frontendDist": "../src"
  },
  "app": {
    "windows": [
      {
        "title": "Мебелировщик Pro 6.0",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true
      }
    ],
    "security": { "csp": null }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "icon": ["icons/icon.ico"]
  }
}
```

### Сборка
```bash
npx tauri build
```
Готовый установщик: `src-tauri/target/release/bundle/nsis/Мебелировщик Pro_6.0.0_x64-setup.exe`
(рядом лежит и «портативный» `Мебелировщик Pro.exe` в `target/release/`).

---

## Android APK — Capacitor

### Установка окружения (один раз)
1. Android Studio: https://developer.android.com/studio (при установке — SDK + Platform Tools).
2. JDK 17 ставится вместе с Android Studio (Settings → Build Tools → Gradle → JDK: 17).
3. В корне проекта:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### Файл `capacitor.config.json` (в корне)
```json
{
  "appId": "uz.mebel.pro",
  "appName": "Мебелировщик Pro",
  "webDir": "src",
  "android": {
    "allowMixedContent": false
  },
  "server": {
    "androidScheme": "https"
  }
}
```

### Сборка
```bash
npx cap add android        # создаст папку android/ (полный Android-проект)
npx cap sync
npx cap open android       # откроется Android Studio
```
В Android Studio: **Build → Generate Signed Bundle / APK → APK** →
создайте ключ (Create new keystore: файл .jks, пароль, alias) → variant `release` → Finish.
Готовый файл: `android/app/release/app-release.apk` — можно ставить на любой телефон/планшет
(на устройстве разрешите «Установка из неизвестных источников»).

Быстрый отладочный вариант без подписи: **Build → Build APK(s)** → `app-debug.apk`.

---

## Что потребует переработки в нативных оболочках (предупреждаю заранее)

| Функция | В браузере сейчас | В Tauri (EXE) | В Capacitor (APK) |
|---|---|---|---|
| Сохранить проект / CSV / OBJ / DXF / рендер PNG | скачивание через диалог браузера | ⚠ работает не во всех сборках WebView — надёжно через Tauri fs-plugin (`@tauri-apps/plugin-dialog` + `plugin-fs`), ~30 строк доработки | ✅ работает (скачивание в Downloads), для «Сохранить как…» лучше плагин Filesystem |
| Открыть проект / фото-текстура / фото для ИИ | `<input type=file>` | ✅ работает | ✅ работает, камера открывается сама |
| ИИ-разбор фото | работает только внутри Claude | ⚠ нужен свой ключ Anthropic API и прямой вызов (добавляется в одном месте — функция `analyzeInteriorPhoto`) | то же |
| Автосохранение / история версий | нет (в артефакте нет хранилища) | появится: localStorage работает + файлы через fs-plugin | появится: localStorage + Filesystem |
| AR-просмотр | нет | не применимо | этап 7: ARCore/WebXR — только в нативной версии |
| Печать | window.print | ✅ | ⚠ печать с телефона — через системный диалог, работает с Android 11+ |

Итог: сборка «как есть» даст рабочие EXE и APK; две доработки, которые я сделаю
по вашей команде в следующей итерации — перевод «скачиваний» на нативные
диалоги сохранения и поле для API-ключа ИИ.
