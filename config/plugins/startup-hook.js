export const StartupHookPlugin = async ({ $ }) => {
  return {
    "session.created": async () => {
      await $`bash -c "which bd > /dev/null 2>&1 && bd prime || echo '[beads] bd not found, skipping'"`;

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
