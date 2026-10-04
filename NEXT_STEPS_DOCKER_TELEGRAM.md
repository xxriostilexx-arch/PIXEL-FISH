# Próximos passos — Docker, PostgreSQL e Telegram

## 1. Corrigir o Docker Desktop no Windows

O erro `Virtualization support not detected` significa que o motor Linux do Docker não iniciou. Abra o **Gerenciador de Tarefas → Desempenho → CPU** e procure `Virtualização`.

- Se estiver `Desabilitada`, habilite Intel VT-x ou AMD SVM/AMD-V na BIOS/UEFI e reinicie.
- Se este Windows estiver dentro de uma VPS/VM, peça ao provedor para habilitar **nested virtualization**. Essa parte não pode ser corrigida dentro do Windows convidado.
- Se estiver `Habilitada`, abra PowerShell **como Administrador** e rode:

```powershell
wsl --install
wsl --update
wsl --set-default-version 2
```

Reinicie o Windows. Depois, no Docker Desktop, abra **Settings → General**, marque **Use WSL 2 based engine**, selecione **Apply & Restart**.

Validação (PowerShell comum):

```powershell
wsl --version
wsl -l -v
docker version
docker run --rm hello-world
```

Quando `hello-world` terminar sem erro, na pasta do projeto execute:

```powershell
docker compose up -d
docker compose ps
docker compose exec postgres psql -U pixelfish -d pixelfish -c "SELECT version();"
```

Isso iniciará PostgreSQL e Redis locais. A API ainda usa `data/pixel-fish.json` por enquanto; não há migração automática apenas por iniciar o container.

## 2. Preparar Telegram Mini App

1. Abra `@BotFather` no Telegram e use `/newbot`.
2. Defina nome e username que termine em `bot`.
3. Guarde o token do bot em local seguro. Nunca envie o token, seed phrase ou chave privada pelo chat.
4. No servidor, preencha em `.env`:

```env
NODE_ENV=production
TELEGRAM_BOT_TOKEN=COLE_O_TOKEN_APENAS_NO_SERVIDOR
WEB_ORIGIN=https://pixelfish.app
WEB_GUEST_ACCESS=false
```

5. Reinicie API e frontend após editar `.env`.
6. No BotFather, abra **/mybots → seu bot → Bot Settings → Configure Mini App → Enable Mini App** e informe `https://pixelfish.app`.
7. Ainda em **Bot Settings**, configure o **Menu Button** com texto `Jogar` e a mesma URL.
8. Abra o perfil do bot no Telegram e toque em **Launch app**. Esse é o teste de identidade real: o jogo deve criar `tg:<id>` com `0 FISH` e `0 CASH`.

O site comum continuará funcionando enquanto `WEB_GUEST_ACCESS=true`, mas visitantes web não podem depositar nem sacar. Em lançamento público pelo Telegram, mantenha esse valor como `false`.

## 3. TON Connect antes de qualquer dinheiro real

1. Confirme que `https://pixelfish.app/tonconnect-manifest.json` abre publicamente, em HTTPS e sem login.
2. Confirme que o ícone do manifesto é PNG/ICO de 180×180 e também público.
3. Use primeiro `TON_NETWORK=testnet` e carteira de teste.
4. Mantenha `ENABLE_REAL_WITHDRAWALS=false` e `MANUAL_WITHDRAWALS_ENABLED=false`.
5. Só habilite saques após a migração para PostgreSQL, registro contábil, backups, limites, revisão manual e testes completos.
