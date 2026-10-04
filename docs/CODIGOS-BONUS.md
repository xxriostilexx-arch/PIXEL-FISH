# Códigos bônus do Pixel Fish

Edite `apps/api/src/game-config.ts`, dentro de `BONUS_CODES`. O nome da chave é o código que o jogador digita; use letras maiúsculas e não repita códigos já usados.

## Tipos disponíveis

```ts
// FISH e CASH reais (use com cuidado: CASH real pode entrar no fluxo de saque)
MEUCODIGO:{maxClaims:10,label:'Descrição exibida ao jogador',reward:{kind:'wallet' as const,fish:1000,cash:500}},

// Lançamentos gratuitos em um local
MEUCODIGO:{maxClaims:10,label:'3 lançamentos no Lago',reward:{kind:'map_bait' as const,map:'lake' as const,quantity:3}},

// Saldo de teste: expira e não pode ser sacado
MEUTESTE:{maxClaims:3,label:'Saldo de teste por 7 dias',reward:{kind:'temporary_wallet' as const,fish:5000000,cash:5000000,durationDays:7}},
```

Os mapas aceitos são `river`, `lake`, `coast` e `ocean`.

Para desativar um código, apague a linha inteira dele de `BONUS_CODES` e reinicie a API com `./reiniciar-pixel-fish.bat`. Não remova o histórico do banco: jogadores que já resgataram continuam registrados com segurança.

`maxClaims` é o limite global entre todos os jogadores. Cada conta também só pode resgatar o mesmo código uma vez.
