export const StartupHookPlugin = async ({ $ }) => {
  return {
    "session.created": async () => {
      // Beads: auto-init + prime + ready
      await $`bash -c "
        if ! which bd > /dev/null 2>&1; then
          echo '[beads] bd не найден в PATH — пропускаю'
        elif [ ! -d .beads ]; then
          echo '[beads] .beads/ не найден — инициализирую...'
          bd init --non-interactive 2>/dev/null && echo '[beads] инициализирован' || echo '[beads] ошибка инициализации'
        fi
        if [ -d .beads ]; then
          bd prime 2>/dev/null
          echo ''
          READY=\$(bd ready --quiet 2>/dev/null)
          if [ -n \"\$READY\" ]; then
            echo '=== ГОТОВО К РАБОТЕ ==='
            echo \"\$READY\"
            echo '======================'
          else
            echo '[beads] нет открытых задач'
          fi
        fi
      "`;

      // Handoffs: показать последний
      await $`bash -c "
        HANDOFFS=~/.opencode/handoffs
        mkdir -p \$HANDOFFS
        LAST=\$(ls -t \$HANDOFFS/*.md 2>/dev/null | head -1)
        if [ -n \"\$LAST\" ]; then
          echo ''
          echo '=== LAST HANDOFF: \$(basename \$LAST) ==='
          cat \"\$LAST\"
          echo '==================================='
        else
          echo '[handoff] No handoffs yet'
        fi
      "`;
    },
  }
}
