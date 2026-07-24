export const SHARE_PUML_STEPS = [
  {
    title: "Распакуйте полный архив",
    details: [
      "Нужны не только index.html, но и manifest.webmanifest, sw.js, папка icons/, install.html и start-termux.sh.",
      "Все файлы должны лежать в одной папке, например ~/PumlEditor.",
    ],
  },
  {
    title: "Запустите локальный сервер (Termux)",
    details: [
      "В Termux: cd ~/PumlEditor && chmod +x start-termux.sh && ./start-termux.sh",
      "Откройте в Chrome на телефоне: http://127.0.0.1:8080/install.html",
      "Через чистый file:// PWA не устанавливается.",
    ],
  },
  {
    title: "Установите PWA на Android",
    details: [
      "На странице install.html нажмите «Установить приложение» или меню Chrome (⋮) → «Установить приложение».",
      "Запускайте vuePlantUML с иконки на главном экране, не из файлового менеджера.",
    ],
  },
  {
    title: "Передайте .puml через «Поделиться»",
    details: [
      "Откройте файл .puml в любом приложении: «Файлы», почта, Telegram и т.д.",
      "Нажмите «Поделиться» / Share.",
      "Выберите PlantUML или vuePlantUML в списке приложений.",
      "Исходник откроется в редакторе автоматически.",
    ],
  },
] as const;

export const SHARE_PUML_TIPS = [
  "Без иконок (папка icons/) Chrome не предложит установку PWA.",
  "Если PlantUML нет в списке «Поделиться» — переустановите PWA из Chrome после обновления файлов.",
  "Для оффлайн-режима без HTTP используйте кнопку «Открыть .puml» или перетаскивание файла в редактор.",
  "Поддерживаются расширения: .puml, .plantuml, .txt.",
] as const;
