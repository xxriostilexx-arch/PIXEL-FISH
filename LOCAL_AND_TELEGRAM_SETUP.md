# Pixel Fish — local agora, Telegram depois

## O que funciona sem Telegram

O jogo pode continuar no navegador em `http://localhost:5173`. Em desenvolvimento, a API cria o jogador local `dev:local-player`, sempre com **0 FISH e 0 CASH**, e persiste os dados em `data/pixel-fish.json`.

Isso é adequado para criar e testar a experiência. Não é adequado para lançar pagamentos nem para múltiplos jogadores em produção: o arquivo JSON não oferece concorrência, backups transacionais ou recuperação de falhas.

Enquanto o site ainda não estiver dentro do Telegram, `WEB_GUEST_ACCESS=true` permite visitantes isolados pelo navegador. Eles começam em zero e não podem depositar ou sacar. Desative essa variável assim que a Mini App for publicada.

## Executar localmente

1. Instale Node.js LTS caso `C:\Program Files\nodejs\npm.cmd` não exista.
2. Na pasta do projeto, execute `iniciar-pixel-fish.bat`.
3. Abra `http://localhost:5173`.
4. Para reiniciar, execute `reiniciar-pixel-fish.bat`.

Enquanto testar fora do Telegram, deixe `NODE_ENV` ausente ou igual a `development`. O atalho `dev:local-player` só funciona quando a requisição chega por `localhost`; em produção, o servidor rejeita esse acesso e aceita somente o `initData` assinado pelo Telegram.

## PostgreSQL local — quando instalar

O projeto já possui `docker-compose.yml`, mas a API atual ainda está usando o arquivo JSON; subir o Docker **não migra os dados automaticamente**. Antes de liberar jogadores ou dinheiro real, migraremos a API para PostgreSQL e executaremos `apps/api/sql/001_initial.sql`.

Quando quiser preparar o banco local:

1. Instale o Docker Desktop para Windows e ative o backend WSL 2.
2. Reinicie o Windows se o instalador solicitar.
3. Na raiz do projeto, execute `docker compose up -d`.
4. Confirme com `docker compose ps`.

As credenciais em `docker-compose.yml` são apenas de desenvolvimento; troque-as no servidor público e nunca publique o arquivo `.env`.

## Para abrir pelo Telegram

Você não precisa publicar no Telegram para desenvolver, testar animações ou testar TonConnect em testnet. Para cada pessoa ter uma conta real vinculada ao próprio Telegram, é necessário configurar a Mini App.

1. No `@BotFather`, crie/configure o bot e a Mini App com a URL HTTPS pública `https://pixelfish.app`.
2. Coloque o token do bot apenas no `.env` do servidor, em `TELEGRAM_BOT_TOKEN`. Nunca no React, no Git ou em mensagens.
3. Publique `https://pixelfish.app/tonconnect-manifest.json` e o ícone HTTPS público.
4. Use `NODE_ENV=production`, configure `WEB_ORIGIN=https://pixelfish.app` e publique também a API em `https://api.pixelfish.app`.
5. Abra o bot no Telegram: o navegador receberá `Telegram.WebApp.initData`; a API valida a assinatura antes de criar a conta `tg:<id>`.

## Saques manuais com Tonkeeper

O botão/rota de saque deve ficar desabilitado até a operação estar pronta. Quando `MANUAL_WITHDRAWALS_ENABLED=true`, o jogo somente cria uma solicitação e reserva o CASH do jogador. Ele **não envia TON** e não usa sua seed phrase.

O processo do operador é: revisar a solicitação, enviar manualmente pela Tonkeeper usando a carteira operacional, confirmar a transação on-chain e então registrar o hash pela rota administrativa. Use um `ADMIN_REVIEW_KEY` longo, secreto e exclusivo no servidor. Não habilite saques com dinheiro real antes de PostgreSQL, backups, limites, revisão antifraude e testes completos em testnet.
