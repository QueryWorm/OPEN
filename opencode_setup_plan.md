# OpenCode: план настройки

## Исходная ситуация (до)

- Два конфига с пересечениями: `~/.config/opencode/config.json` + `~/.config/opencode/opencode.json`
- Два memory-плагина без понимания зачем (`opencode-plugin-simple-memory`, `opencode-mem`)
- Groq модели прописаны везде — не работают, мусор
- Hooks — чистый лист
- Superpowers, Beads, нормальный AGENTS.md — не установлены

## Принципы

- Один конфиг вместо двух
- Память через Handoffs (markdown), не плагины
- Минимум hooks — только то что реально нужно
- Модели — заполнить после тестов в отдельном чате

---

## Шаг 1: Чистим конфиги

**Удалить:**
```
~/.config/opencode/config.json
```

**Итоговый `~/.config/opencode/opencode.json`:**
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "edit": "ask",
    "bash": "ask"
  },
  "plugin": [
    "superpowers@git+https://github.com/obra/superpowers.git"
  ],
  "mcp": {
    "context7": {
      "type": "npx",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "sequential-thinking": {
      "type": "npx",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
  // "model": "..." — заполнить после тестов
}
```

> Memory-плагины не включаем — заменяем Handoffs-паттерном (шаг 4).

---

## Шаг 1.5: Устанавливаем RTK

**RTK** (github.com/diegosouzapw/rtk) — Rust-утилита, фильтрует вывод CLI перед отправкой в LLM.
Актуально пока на Groq с TPM лимитами:
- `git push/commit` — с 1600 до ~120 токенов (-92%)
- `pytest` — с 25k до ~2.5k токенов

```bash
cargo install rtk
# или через бинарник с releases страницы
```

Использование — оборачивает любую команду:
```bash
rtk -- pytest tests/
rtk -- git commit -m "fix"
```

> Уточнить: поддерживает ли OpenCode автоматический проброс через RTK, или только ручной вызов.

---

## Шаг 2: Устанавливаем Superpowers

Маркетплейс плагинов — это Claude Code, в OpenCode его нет. Установка через git URL в `opencode.json`:

```json
"plugin": ["superpowers@git+https://github.com/obra/superpowers.git"]
```

Перезапустить OpenCode — плагин автоустанавливается через Bun, скиллы регистрируются автоматически.
Проверить: спросить агента `"Tell me about your superpowers"` — должен перечислить скиллы.

**Workflow после установки:**
```
brainstorming → writing-plans → subagent-driven-development (рекомендуется)
```
- `brainstorming` — диалог, пишет спеку в `/docs/superpowers/specs`
- `writing-plans` — план по спеке в `/docs/superpowers/docs`
- `subagent-driven-development` — отдельный агент на каждую задачу + ревью между задачами
- `receiving-code-review` — обработка фидбека перед правками
- `verification-before-completion` — проверка перед "готово"

**Актуальные скиллы:**
`brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development`,
`dispatching-parallel-agents`, `test-driven-development`, `systematic-debugging`,
`requesting-code-review`, `receiving-code-review`, `verification-before-completion`,
`writing-skills`, `finishing-a-development-branch`, `using-git-worktrees`

> Устаревшие (`write-plan`, `execute-plan`, `brainstorm`) ещё есть в пакете но будут удалены в следующей мажорной версии — не использовать.

**Известный пробел Superpowers:** нет проверки "план vs реализация" после subagent-driven-development.
`verification-before-completion` проверяет что задача *работает*, но не что *все пункты плана выполнены*.
Закрывается через Proof Loop в AGENTS.md (шаг 5).

---

## Шаг 3: Устанавливаем Beads

```bash
npm i -g @steveyegge/beads  # уточнить точное имя пакета при установке
```

**Базовые команды:**
```bash
bd create -t epic "Название задачи"   # создать эпик
bd create "Подзадача"                 # создать задачу
bd dep add <задача> <зависимость>     # зависимость
bd ready                              # что можно делать сейчас
bd close <id>                         # закрыть задачу
bd prime                              # загрузить контекст проекта в новой сессии
```

**Паттерн работы:**
1. Приходит задача → `bd create -t epic "..."`
2. Brainstorm → plan → декомпозиция на подзадачи с зависимостями
3. `bd ready` показывает текущий фронт
4. TDD цикл на каждую подзадачу
5. `bd close` после верификации

---

## Шаг 4: Handoffs вместо memory-плагинов

**Структура:**
```
~/.opencode/
  handoffs/
    2026-04-18_masha-bot.md
    2026-04-19_pentest-demo.md
  AGENTS.md
```

**Формат handoff (агент пишет сам при закрытии сессии):**
```markdown
## Цель сессии
Что хотели сделать.

## Сделано
- Конкретные результаты

## НЕ сработало
- Что пробовали и почему не вышло (самая ценная часть)

## Следующий шаг
Одно конкретное действие.
```

**Правило:** в начале каждой сессии — `bd prime` + прочитать последний handoff.

---

## Шаг 5: Глобальный AGENTS.md (AgentFS структура)

Вместо одного плоского файла — три слоя. OpenCode грузит их по необходимости,
не пихая всё в каждый запрос. Решает проблему контекстных лимитов на Groq.

```
~/.config/opencode/
  AGENTS.md              ← Semantic (всегда)
  agents/
    episodic.md          ← Episodic (по запросу: история, решения)
    procedural.md        ← Procedural (по задаче: инструкции по стеку)
```

---

### AGENTS.md — Semantic слой (грузится всегда)

Только то что нужно в каждом запросе — правила и мышление.

```markdown
# AGENTS.md

## Red Lines
- Не удалять файлы без явного подтверждения ("удали" ≠ "отфильтруй")
- Не менять конфиги без понимания текущих значений — странное значение = сначала понять
- Не открывать несколько SSH-соединений подряд — один мост на сессию
- Не говорить "готово" без запуска верификации
- Не трогать работающий код при добавлении новой функции — явно указывать границы изменений
- Не писать код или псевдокод в документации — только описание словами

## Structured Reasoning
При дебаге всегда:
1. Что точно знаем из кода и логов
2. Пошаговая трассировка
3. Гипотезы — проверенные и отброшенные
4. Вывод

## Proof Loop
Superpowers проверяет что задача работает, но не что план выполнен полностью.
После subagent-driven-development — сверить реализацию с /docs/superpowers/docs:
- Каждый пункт плана выполнен?
- Если нет — не говорить "готово", дозадачить
Перед закрытием задачи в Beads:
1. Запустить команду-доказательство свежей (не из кэша)
2. Прочитать полный вывод
3. Сверить с планом

## Extended context
При необходимости загрузить историю решений: agents/episodic.md
При необходимости загрузить инструкции по стеку: agents/procedural.md
```

---

### agents/episodic.md — Episodic слой (по запросу)

История решений, антипаттерны, что не сработало. Пополняется со временем.

```markdown
# Episodic memory

## Решённые проблемы
<!-- Сюда переносятся закрытые issues из проектов -->
<!-- Формат: дата, проблема, решение, проект -->

## Антипаттерны стека
<!-- Трейсбэки которые повторялись + решения -->
<!-- PHP, Python, aiogram, FastAPI, systemd -->
```

---

### agents/procedural.md — Procedural слой (по задаче)

Конкретные инструкции по стеку. Грузится только когда работаем с конкретной технологией.

```markdown
# Procedural memory

## Masha server
- Storage: всё на /mnt/storage/, venv: /mnt/storage/venvs/tools/
- WiFi watchdog: модуль r8723bs, reload через modprobe
- Autostart: masha-runner.service

## Workflow старт сессии
1. bd prime
2. Прочитать последний ~/.opencode/handoffs/*.md
3. Загрузить episodic.md если задача из старого проекта

## Pentest стек
<!-- инструкции по mitmproxy, nmap, специфике SMB демо -->

## PHP/Python стек
<!-- соглашения проекта Masha v2 -->
```

---

## Шаг 6: Stop Hook

Файл: `~/.config/opencode/hooks/remind_handoff.py`

```python
import json, sys, datetime

data = json.load(sys.stdin)
session_start = data.get("session_start")

if session_start:
    start = datetime.datetime.fromisoformat(session_start)
    age_minutes = (datetime.datetime.now() - start).seconds // 60
    
    if age_minutes >= 15:
        print(json.dumps({
            "decision": "block",
            "reason": f"Сессия {age_minutes} мин. Запиши handoff в ~/.opencode/handoffs/ перед выходом."
        }))
        sys.exit(0)

print(json.dumps({"decision": "allow"}))
```

> Синтаксис hooks в OpenCode уточнить — возможно отличается от Claude Code.

---

## Шаг 7: Supply Chain Defense

Одна строка в `~/.npmrc`:
```
min-release-age=7
```

Для Python, в `~/uv.toml` (если используешь uv):
```toml
exclude-newer = "7 days"
```

Защита от supply chain атак типа axios (март 2026) — пакеты младше 7 дней не ставятся.

---

## Порядок выполнения

1. [ ] Дождаться результатов тестов моделей из соседнего чата
2. [ ] Удалить `config.json`, собрать чистый `opencode.json`
3. [ ] Установить RTK (`cargo install rtk`), проверить автоинтеграцию с OpenCode
4. [ ] Установить Superpowers (git URL в opencode.json, перезапустить)
5. [ ] Установить Beads, проверить точное имя пакета
6. [ ] Создать AgentFS структуру:
   - `~/.config/opencode/AGENTS.md` (semantic)
   - `~/.config/opencode/agents/episodic.md`
   - `~/.config/opencode/agents/procedural.md`
7. [ ] Создать структуру `~/.opencode/handoffs/`
8. [ ] Добавить MCP серверы (Context7, Sequential Thinking) — проверить синтаксис
9. [ ] Написать Stop hook — уточнить синтаксис OpenCode hooks
10. [ ] Добавить `min-release-age=7` в `.npmrc`
11. [ ] Заполнить `model` в конфиге после тестов

## Что намеренно не делаем

- Memory-плагины — заменены Handoffs
- Chronicles — для зрелого проекта, не сейчас
- Template Bridge / 413 агентов — нет плагин-маркетплейса в OpenCode, брать руками если нужно
- agent-browser — отложено до прояснения интеграции со SKILL.md

---

## Дополнение из aidd/method.md

### Разделение issues.md и antipatterns.md

Добавить в каждый проект два отдельных файла (не путать):

**`docs/issues.md`** — проблемы логики и архитектуры:
- "Система работает неправильно"
- Неверная бизнес-логика, несовместимость компонентов
- Требует анализа и актуализации спецификации

**`docs/antipatterns.md`** — ошибки выполнения с трейсбэком:
- "Система не запускается / падает"
- Конкретный traceback + причина + решение
- База знаний типичных ошибок проекта (нейросеть часто повторяет одни и те же ошибки)

### result.md — маркер завершённого этапа

После закрытия эпика в Beads создавать `docs/results/phase-N-result.md`:
```markdown
## Статус
Завершён успешно.

## Что реализовано
Список выполненных требований.

## Тестирование
Как тестировалось, что проверялось.

## Дата завершения
```

Наличие файла = "здесь всё работает, не трогать". Дополняет Handoff:
- Handoff = "что дальше" (для следующей сессии)
- result.md = "что сделано и работает" (постоянный маркер)

### Добавить в Red Lines AGENTS.md

```
- Не трогать работающий код при добавлении новой функции — явно указывать границы изменений
- Не писать код или псевдокод в документации — только описание словами
  (псевдокод воспринимается моделью как директива, а не описание)
```

### Что из aidd намеренно не берём

- Docker Compose мандат — у нас своя инфра (Masha)
- "Разделение чатов по ролям" — в OpenCode это subagents из Superpowers
- DNA Map, Benchmark — overkill для соло

---

## Заметки для Second Brain бота (отдельный проект)

### Confidence scoring в ChromaDB

Идея: каждый документ/паттерн в ChromaDB имеет числовой `confidence` в метадате.

```python
# При добавлении
metadata = {"confidence": 0.3, "last_seen": "2026-05-02", "confirmations": 0}

# При подтверждении паттерна
metadata["confidence"] = min(1.0, metadata["confidence"] + 0.2)
metadata["confirmations"] += 1

# При противоречии
metadata["confidence"] = max(0.0, metadata["confidence"] - 0.3)

# Decay — батч раз в сутки
days_unused = (today - last_seen).days
if days_unused > 30:
    metadata["confidence"] -= 0.1
```

При RAG-запросе — фильтровать по `confidence > 0.4`, слабые записи не тянуть в контекст.

**Почему это важно:** статичный ChromaDB со временем накапливает устаревшие/противоречивые записи. Scoring делает память живой, а не свалкой.

### AgentFS для Second Brain

Те же три слоя, но для личной памяти:
- **Semantic** — факты о тебе, предпочтения, текущие проекты
- **Episodic** — записи из Telegram, события, решения
- **Procedural** — шаблоны действий, часто используемые workflow

Lazy loading: семантика грузится всегда, остальное — по типу запроса.
