# OpenCode Setup

Готовый конфиг для [OpenCode](https://opencode.ai) с плагинами, MCP-серверами и workflow-инструкциями для AI-агентов.

## Что подключено

### Плагины

| Плагин | Зачем | Как работает |
|--------|-------|-------------|
| **Superpowers** | Набор skills для AI: brainstorming, TDD, debugging, code review | Git URL в `opencode.json`, автоустановка через Bun |
| **opencode-rate-limit** | Автопереключение моделей при лимитах API | Фоллбэк-цепочка: Claude → Gemini → GPT. Конфиг: `~/.opencode/rate-limit-fallback.json` |
| **RTK** | Фильтрация вывода CLI перед отправкой в LLM (экономия токенов) | Автоматически оборачивает bash-команды: `git commit` с 1600 до ~120 токенов |
| **Startup Hook** | Автозапуск `bd prime` + показ handoff при старте сессии | Хук `session.created` |

### MCP-серверы

| Сервер | Зачем |
|--------|-------|
| **Context7** | Документация библиотек в реальном времени |
| **Sequential Thinking** | Многошаговые рассуждения для сложных задач |

### Beads (bd)

Issue tracker для AI-агентов. Задачи хранятся в `.beads/` прямо в репо.

```bash
bd init          # Инициализация (один раз в проекте)
bd prime         # Загрузка контекста (при старте сессии)
bd ready         # Какие задачи можно делать
bd create "..."  # Создать задачу
bd close <id>    # Закрыть задачу
```

### Handoffs

Передача контекста между сессиями через markdown-файлы в `~/.opencode/handoffs/`.

## Структура

```
config/
├── opencode.json              # Главный конфиг OpenCode
├── plugins/
│   ├── rtk.ts                 # RTK плагин (фильтрация вывода)
│   └── startup-hook.js        # Хук автозапуска
└── commands/
    └── rate-limit-status.md   # Команда /rate-limit-status

opencode/
├── handoff_template.md        # Шаблон для handoff
└── rate-limit-fallback.json   # Фоллбэк модели (создать вручную)
```

## Установка

### 1. Клонируй репо

```bash
git clone https://github.com/QueryWorm/OPEN.git ~/OPEN
```

### 2. Скопируй конфиги

```bash
# Конфиг OpenCode
cp ~/OPEN/config/opencode.json ~/.config/opencode/opencode.json

# Плагины
cp ~/OPEN/config/plugins/rtk.ts ~/.config/opencode/plugins/rtk.ts
cp ~/OPEN/config/plugins/startup-hook.js ~/.config/opencode/plugins/startup-hook.js

# Команды
mkdir -p ~/.config/opencode/commands
cp ~/OPEN/config/commands/rate-limit-status.md ~/.config/opencode/commands/rate-limit-status.md

# Шаблон handoff
mkdir -p ~/.opencode
cp ~/OPEN/opencode/handoff_template.md ~/.opencode/handoff_template.md
```

### 3. Установи зависимости

```bash
# RTK (фильтрация вывода)
cargo install rtk

# Или через бинарник: https://github.com/diegosouzapw/rtk/releases

# Beads (issue tracker)
npm i -g @steveyegge/beads
```

### 4. Настрой фоллбэк моделей

Создай `~/.opencode/rate-limit-fallback.json`:

```json
{
  "enabled": true,
  "cooldownMs": 60000,
  "fallbackMode": "cycle",
  "fallbackModels": [
    { "providerID": "anthropic", "modelID": "claude-sonnet-4-20250514" },
    { "providerID": "google", "modelID": "gemini-2.5-pro" },
    { "providerID": "openai", "modelID": "gpt-4o" }
  ]
}
```

### 5. Перезапусти OpenCode

Конфиг подхватывается автоматически при следующем запуске.

## Персональные настройки

Этот репо содержит **универсальный** конфиг. Для личных настроек (AGENTS.md с твоими проектами, procedural agents, модели) — создай отдельный приватный репо и перезапиши файлы поверх.

Порядок:
1. Клонируй этот репо
2. Скопируй конфиги (см. "Установка")
3. Перезапиши `~/.config/opencode/AGENTS.md` своим персональным
4. Добавь `config/agents/` со своими procedural agents
5. Создай `~/.opencode/rate-limit-fallback.json` со своими моделями

## FAQ

### Где логи ошибок?
Вывод OpenCode идёт в терминал. Плагин `opencode-rate-limit` пишет предупреждения в stderr при запуске.

### Как обновить?
```bash
cd ~/OPEN && git pull
# Скопируй изменённые файлы заново
```

### Что делает RTK?
Фильтрует вывод команд перед отправкой в LLM. Без RTK: `git push` = 1600 токенов. С RTK: ~120 токенов. Экономия ~90%.

### Зачем Beads?
Чтобы AI-агент помнил задачи между сессиями. Задачи живут в `.beads/` рядом с кодом, переживают compaction и перезапуски.
